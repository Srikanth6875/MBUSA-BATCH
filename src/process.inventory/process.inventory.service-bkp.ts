import { Inject, Injectable } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import { parse, Parser } from 'csv-parse';
import {
  VEHICLES_COLUMN_MAPPING,
  ROOFTOP_COLUMN_MAPPING,
  VEHICLE_HISTORY_COLUMN_MAPPING_MONGO,
} from '../utils/db.mapping';
import { mapCsvRecordToDbObject } from '../utils/curl.helper';
import { Knex } from 'knex';
import { RooftopInsertService } from 'src/mbusa-job/rooftop-insert.service';
import { VehicleImportService } from 'src/mbusa-job/vehicle-import.service';
import { VehicleDataService } from 'src/mbusa-job/mongo/schemas/vehicle-data.service';
import { ImportFileJobService } from 'src/mbusa-job/import-file-job.service';
import { INVENTORY_CONST, VehicleAction } from '../utils/vehicle.constants';

@Injectable()
export class ProcessVehicleInventoryService {
  constructor(
    private readonly rooftopService: RooftopInsertService,
    private readonly vehicleService: VehicleImportService,
    private readonly historyService: VehicleDataService,
    private readonly importFileJobService: ImportFileJobService,
    @Inject('PG_CONNECTION') private readonly db: Knex,
  ) {}

  async processFolder(folderPath: string) {
    const files = fs.readdirSync(folderPath).filter(f => f.endsWith('.csv'));
    if (!files.length) return;

    for (const file of files) {
      const filePath = path.join(folderPath, file);
      const stats = await fs.promises.stat(filePath);

      const job = await this.importFileJobService.createJob({
        fileName: file,
        fileSize: stats.size,
      });

      let rooftopProcessed = false;
      const processedVins = new Set<string>();
      let currentRooftopId: number | null = null;
      let total = 0,
        skipped = 0,
        added = 0,
        updated = 0,
        noChange = 0,
        deleted = 0;

      try {
        const parser: Parser = fs.createReadStream(filePath).pipe(
          parse({ columns: true, skip_empty_lines: true, trim: true }),
        );

        for await (const record of parser) {
          total++;
          const vin = record[INVENTORY_CONST.CSV_HEADERS.VIN]?.trim();
          if (!vin) {
            skipped++;
            continue;
          }

          processedVins.add(vin);

          if (!rooftopProcessed) {
            const rooftopCsv = mapCsvRecordToDbObject(record, ROOFTOP_COLUMN_MAPPING);
            const rooftop = await this.rooftopService.updateFromCsv(rooftopCsv);
            rooftopProcessed = true;
            currentRooftopId = rooftop.rt_id;
          }

          const action = await this.upsertVehicle(record, vin);
          ({ added, updated, noChange, skipped } = this.logVehicleAction(
            action,
            { added, updated, noChange, skipped },
            total,
            vin,
          ));
        }

        if (currentRooftopId && processedVins.size) {
          deleted = await this.db('vehicles')
            .where('veh_rt_id', currentRooftopId)
            .whereNotIn('veh_vin', Array.from(processedVins))
            .andWhere('veh_status', INVENTORY_CONST.VEHICLE_STATUS.ACTIVE)
            .update({ veh_active: INVENTORY_CONST.VEHICLE_STATUS.INACTIVE });
        }

        await this.importFileJobService.completeJob(
          job.ifj_id,
          total,
          skipped,
          added,
          updated,
          noChange,
          deleted,
        );
      } catch (err) {
        await this.importFileJobService.failJob(job.ifj_id, err.message);
      }
    }
  }

  // VIN is now passed from processFolder
  private async upsertVehicle(record: any, vin: string): Promise<VehicleAction> {
    const csvData = mapCsvRecordToDbObject(record, VEHICLES_COLUMN_MAPPING);
    if (!csvData?.veh_vin) return INVENTORY_CONST.ACTIONS.SKIPPED;

    csvData.veh_listing_type = this.normalizeListingType(csvData.veh_listing_type);
    csvData.veh_certified = this.normalizeBoolean(csvData.veh_certified);
    csvData.veh_miles = this.normalizeNumber(csvData.veh_miles);
    csvData.veh_year = this.normalizeNumber(csvData.veh_year);

    const rooftopDealerId = record[INVENTORY_CONST.CSV_HEADERS.DEALER_ID]?.trim();
    if (!rooftopDealerId) return INVENTORY_CONST.ACTIONS.SKIPPED;

    const rooftopRow = await this.db('rooftop')
      .select('rt_id')
      .where({ rt_dealer_id: rooftopDealerId })
      .first();
    if (!rooftopRow?.rt_id) return INVENTORY_CONST.ACTIONS.SKIPPED;

    const makeId = await this.vehicleService.getOrCreateMake(record[INVENTORY_CONST.CSV_HEADERS.MAKE]?.trim());
    const modelId = await this.vehicleService.getOrCreateModel(makeId, record[INVENTORY_CONST.CSV_HEADERS.MODEL]?.trim());
    const trimId = await this.vehicleService.getOrCreateTrim(makeId, modelId, record[INVENTORY_CONST.CSV_HEADERS.TRIM]?.trim());
    const imagesCsv = this.parseImages(record);

    const existingVehicle = await this.db('vehicles').where({ veh_vin: vin }).first();

    const vehicleData = {
      ...csvData,
      veh_rt_id: rooftopRow.rt_id,
      veh_make_id: makeId,
      veh_model_id: modelId,
      veh_trim_id: trimId,
      veh_active: INVENTORY_CONST.VEHICLE_STATUS.ACTIVE,
    };

    if (!existingVehicle) {
      const [veh_id] = await this.db('vehicles').insert(vehicleData).returning('veh_id');
      await this.syncVehicleImages(typeof veh_id === 'object' ? veh_id.veh_id : veh_id, imagesCsv);
      return INVENTORY_CONST.ACTIONS.ADDED;
    }

    await this.db('vehicles').where({ veh_id: existingVehicle.veh_id }).update(vehicleData);
    await this.syncVehicleImages(existingVehicle.veh_id, imagesCsv);
    return INVENTORY_CONST.ACTIONS.UPDATED;
  }

  private logVehicleAction(action: VehicleAction, counters: any, row: number, vin: string) {
    counters[action]++;
    console.log(`Row ${row} -> VIN: ${vin} | ${INVENTORY_CONST.ACTION_LOGS[action]}`);
    return counters;
  }

  private parseImages(record: any): string[] {
    return (record[INVENTORY_CONST.CSV_HEADERS.IMAGE_LIST] || '')
      .split(',')
      .map(i => i.trim())
      .filter(Boolean);
  }

  private async syncVehicleImages(vehicleId: number, csvImages: string[]) {
    const imageStr = csvImages.join(',');
    await this.db('images')
      .insert({ vehicle_id: vehicleId, image_src: imageStr })
      .onConflict('vehicle_id')
      .merge({ image_src: imageStr, mtime: this.db.fn.now() });
  }

  private normalizeListingType(v?: string) {
    return !v || v.toLowerCase() !== INVENTORY_CONST.LISTING_TYPE.NEW.toLowerCase()
      ? INVENTORY_CONST.LISTING_TYPE.USED
      : INVENTORY_CONST.LISTING_TYPE.NEW;
  }

  private normalizeBoolean(v?: any) {
    return v === true || v === 'true' || v === '1' || v === 1;
  }

  private normalizeNumber(v?: any) {
    const n = Number(v);
    return isNaN(n) ? null : n;
  }
}
