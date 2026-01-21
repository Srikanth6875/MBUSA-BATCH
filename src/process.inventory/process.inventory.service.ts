import { Inject, Injectable } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import { parse, Parser } from 'csv-parse';
import {
  VEHICLES_COLUMN_MAPPING,
  ROOFTOP_COLUMN_MAPPING,
  VEHICLE_HISTORY_COLUMN_MAPPING_MONGO,
} from '../shared/db.mapping';
import { mapCsvRecordToDbObject } from '../utils/curl.helper';
import { Knex } from 'knex';
import { RooftopInsertService } from 'src/mbusa-job/rooftop-insert.service';
import { VehicleImportService } from 'src/mbusa-job/vehicle-import.service';
import { VehicleDataService } from 'src/mbusa-job/mongo/schemas/vehicle-data.service';
import { ImportFileJobService } from 'src/mbusa-job/import-file-job.service';
import { INVENTORY_CONST, VehicleAction, TABLE_NAMES } from '../shared/vehicle.constants';

type UpsertResult = {
  action: VehicleAction;
  vehicleId?: number;
};
@Injectable()
export class ProcessVehicleInventoryService {
  constructor(
    private readonly rooftopService: RooftopInsertService,
    private readonly vehicleService: VehicleImportService,
    private readonly historyService: VehicleDataService,
    private readonly importFileJobService: ImportFileJobService,
    @Inject('PG_CONNECTION') private readonly db: Knex,
  ) { }

  // =====================================================
  // MAIN PROCESS
  // =====================================================
  async processFolder(folderPath: string) {
    const files = fs.readdirSync(folderPath).filter(f => f.endsWith('.csv'));
    if (!files.length) return;

    for (const file of files) {
      const filePath = path.join(folderPath, file);
      const stats = await fs.promises.stat(filePath);

      console.log(`\n==== Processing Inventory File: ${file} ====\n`);
      const job = await this.importFileJobService.createJob({ fileName: file, fileSize: stats.size, });

      let rooftopProcessed = false;
      let currentRooftopId: number | null = null;
      const processedVins = new Set<string>();
      let total = 0, skipped = 0, added = 0, updated = 0, noChange = 0, deleted = 0;

      try {
        const parser: Parser = fs
          .createReadStream(filePath)
          .pipe(
            parse({
              columns: true,
              relax_quotes: true,
              relax_column_count: true,
              skip_empty_lines: true,
              trim: true,
            }),
          );

        for await (const record of parser) {
          total++;
          try {
            const vin = this.trimValue(record[INVENTORY_CONST.CSV_HEADERS.VIN]);
            if (!vin) continue;
            processedVins.add(vin);

            // ---------- Rooftop (once per file) ----------
            if (!rooftopProcessed) {
              const rooftopCsv = mapCsvRecordToDbObject(record, ROOFTOP_COLUMN_MAPPING);
              const rooftop = await this.rooftopService.updateFromCsv(rooftopCsv);
              rooftopProcessed = true;
              currentRooftopId = rooftop.rt_id;
            }

            const { action } = await this.upsertVehicle(record, vin);

            switch (action) {
              case INVENTORY_CONST.ACTIONS.ADDED:
                added++;
                break;
              case INVENTORY_CONST.ACTIONS.UPDATED:
                updated++;
                break;
              case INVENTORY_CONST.ACTIONS.NO_CHANGE:
                noChange++;
                break;
              case INVENTORY_CONST.ACTIONS.SKIPPED:
                skipped++;
                break;
            }
            console.log(` VIN ${vin} | ${INVENTORY_CONST.ACTION_LOGS[action]}`);
          } catch (err: any) {
            console.error(`Row ${total} VIN ${record['VIN'] || 'N/A'} failed: ${err.message}`,);
          }
        }

        // ---------- Soft delete missing VINs ----------
        if (currentRooftopId && processedVins.size) {
          deleted = await this.db(TABLE_NAMES.VEHICLES)
            .where('veh_rt_id', currentRooftopId)
            .whereNotIn('veh_vin', Array.from(processedVins))
            .andWhere('veh_active', INVENTORY_CONST.VEHICLE_STATUS.ACTIVE)
            .update({ 'veh_active': INVENTORY_CONST.VEHICLE_STATUS.INACTIVE });
        }

        await this.importFileJobService.completeJob(job.ifj_id, total, skipped, added, updated, noChange, deleted);
      } catch (err: any) {
        await this.importFileJobService.failJob(job.ifj_id, err.message);
        console.log(err);
      }
    }
  }

  // =====================================================
  // UPSERT VEHICLE
  // =====================================================
  private async upsertVehicle(record: any, vin: string,): Promise<UpsertResult> {
    const csvData = mapCsvRecordToDbObject(record, VEHICLES_COLUMN_MAPPING);

    // ---------- Normalize ----------
    csvData.veh_listing_type = this.normalizeListingType(csvData.veh_listing_type);
    csvData.veh_certified = this.normalizeBoolean(csvData.veh_certified);
    csvData.veh_miles = this.normalizeNumber(csvData.veh_miles);

    // ---------- Rooftop ----------
    const dealerId = this.trimValue(record[INVENTORY_CONST.CSV_HEADERS.DEALER_ID])
    if (!dealerId)
      return { action: INVENTORY_CONST.ACTIONS.SKIPPED };

    const rooftop = await this.db(TABLE_NAMES.ROOFTOP).select('rt_id').where({ rt_dealer_id: dealerId }).first();
    if (!rooftop?.rt_id) return { action: INVENTORY_CONST.ACTIONS.SKIPPED };

    // ---------- vehicle Lookups ----------
    const veh_year_id = await this.vehicleService.VehicleLookupId(TABLE_NAMES.VEHICLE_YEAR, 'year', this.trimNumber(record[INVENTORY_CONST.CSV_HEADERS.YEAR]));
    const veh_body_type_id = await this.vehicleService.VehicleLookupId(TABLE_NAMES.VEHICLE_BODY_TYPE, 'body_type', this.trimValue(record[INVENTORY_CONST.CSV_HEADERS.BODY_TYPE]));
    const veh_ext_color_id = await this.vehicleService.VehicleLookupId(TABLE_NAMES.VEHICLE_COLOR, 'color', this.trimValue(record[INVENTORY_CONST.CSV_HEADERS.EXT_COLOR]));
    const veh_int_color_id = await this.vehicleService.VehicleLookupId(TABLE_NAMES.VEHICLE_COLOR, 'color', this.trimValue(record[INVENTORY_CONST.CSV_HEADERS.INT_COLOR]));

    // ---------- Make / Model / Trim ----------
    const { makeId, modelId, trimId } = await this.vehicleService.getMakeModelTrimIds(
      this.trimValue(record[INVENTORY_CONST.CSV_HEADERS.MAKE]),
      this.trimValue(record[INVENTORY_CONST.CSV_HEADERS.MODEL]),
      this.trimValue(record[INVENTORY_CONST.CSV_HEADERS.TRIM]),
    );

    const imagesCsv = this.parseImages(record[INVENTORY_CONST.CSV_HEADERS.IMAGE_LIST]);
    const veh_historyData = mapCsvRecordToDbObject(record, VEHICLE_HISTORY_COLUMN_MAPPING_MONGO,);

    const existing = await this.db(TABLE_NAMES.VEHICLES)
      .select('veh_id', 'veh_options_mng_id', 'veh_description_mng_id')
      .where({ veh_vin: vin }).first();

    const vehicleData = {
      ...csvData,
      veh_rt_id: rooftop.rt_id,
      veh_make_id: makeId,
      veh_model_id: modelId,
      veh_trim_id: trimId,
      veh_year_id,
      veh_body_type_id,
      veh_ext_color_id,
      veh_int_color_id,
      veh_active: INVENTORY_CONST.VEHICLE_STATUS.ACTIVE,
    };

    // ================= INSERT =================
    if (!existing) {
      const [id] = await this.db(TABLE_NAMES.VEHICLES).insert(vehicleData).returning('veh_id');

      const vehicleId = typeof id === 'object' ? id.veh_id : id;
      await this.syncVehicleImages(vehicleId, imagesCsv);
      const mongoIds = await this.historyService.upsertSnapshot(vehicleId, vin, veh_historyData,);

      await this.db(TABLE_NAMES.VEHICLES)
        .where({ veh_id: vehicleId })
        .update({
          veh_options_mng_id: mongoIds.optionsId ?? null,
          veh_description_mng_id: mongoIds.descriptionId ?? null,
        });

      return {
        action: INVENTORY_CONST.ACTIONS.ADDED,
        vehicleId,
      };
    }

    // ================= UPDATE =================
    const vehicleId = existing.veh_id;
    const imgRow = await this.db(TABLE_NAMES.VEHICLE_IMAGES).select('image_src').where({ vehicle_id: vehicleId }).first();
    const oldCount = this.parseImages(imgRow?.image_src).length;

    // Yesterday had images, today CSV has ZERO images → SKIP
    if (oldCount > 0 && imagesCsv.length === 0) {
      return {
        action: INVENTORY_CONST.ACTIONS.SKIPPED,
        vehicleId,
      };
    }

    const imagesChanged = oldCount !== imagesCsv.length;
    const mongoIds = await this.historyService.upsertSnapshot(vehicleId, vin, veh_historyData);

    if (!imagesChanged) {
      return {
        action: INVENTORY_CONST.ACTIONS.NO_CHANGE,
        vehicleId,
      };
    }

    await this.db(TABLE_NAMES.VEHICLES)
      .where({ veh_id: vehicleId })
      .update({
        ...vehicleData,
        veh_options_mng_id: mongoIds.optionsId ?? existing.veh_options_mng_id,
        veh_description_mng_id: mongoIds.descriptionId ?? existing.veh_description_mng_id,
      });

    await this.syncVehicleImages(vehicleId, imagesCsv);

    return {
      action: INVENTORY_CONST.ACTIONS.UPDATED,
      vehicleId,
    };
  }

  // =====================================================
  // HELPERS
  // =====================================================
  private parseImages(value?: any, delimiter = ','): string[] {
    if (!value) return [];
    return String(value).split(delimiter).map(i => i.trim()).filter(Boolean);
  }

  private async syncVehicleImages(vehicleId: number, images: string[]) {
    if (!images || images.length === 0) return;  // Do nothing if no images in CSV
    const imageStr = images.join(',');

    await this.db(TABLE_NAMES.VEHICLE_IMAGES)
      .insert({
        vehicle_id: vehicleId,
        image_src: imageStr,
      })
      .onConflict('vehicle_id')
      .merge({
        image_src: imageStr,
        mtime: this.db.fn.now(),
      });
  }

  private normalizeListingType(v?: string) {
    if (!v) return 'Used';
    return v.toLowerCase() === 'new' ? 'New' : 'Used';
  }

  private normalizeBoolean(v?: any) {
    return v === true || v === 'true' || v === '1' || v === 1;
  }

  private normalizeNumber(v?: any) {
    const n = Number(v);
    return isNaN(n) ? null : n;
  }

  private trimValue(value?: any): string | undefined {
    if (value === undefined || value === null) return undefined;

    const trimmed = String(value).trim();
    return trimmed.length ? trimmed : undefined;
  }

  private trimNumber(value?: any): number | undefined {
    const trimmed = this.trimValue(value);
    if (!trimmed) return undefined;

    const num = Number(trimmed);
    return isNaN(num) ? undefined : num;
  }
}
