import { Inject, Injectable } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import { parse, Parser } from 'csv-parse';
import { VEHICLES_COLUMN_MAPPING, ROOFTOP_COLUMN_MAPPING, VEHICLE_HISTORY_COLUMN_MAPPING_MONGO } from '../utils/db.mapping';
import { mapCsvRecordToDbObject } from '../utils/curl.helper';
import { Knex } from 'knex';
import { RooftopInsertService } from 'src/mbusa-job/rooftop-insert.service';
import { VehicleImportService } from 'src/mbusa-job/vehicle-import.service';
import { VehicleDataService } from 'src/mbusa-job/mongo/schemas/vehicle-data.service';
import { ImportFileJobService } from 'src/mbusa-job/import-file-job.service';

@Injectable()
export class ProcessVehicleInventoryService {

  constructor(
    private readonly rooftopService: RooftopInsertService,
    private readonly vehicleService: VehicleImportService,
    private readonly historyService: VehicleDataService,
    private readonly importFileJobService: ImportFileJobService,
    @Inject('PG_CONNECTION') private readonly db: Knex
  ) { }

  // ---------------- MAIN PROCESS ----------------
  async processFolder(folderPath: string) {
    const files = fs.readdirSync(folderPath).filter(f => f.endsWith('.csv'));
    if (!files.length) return;

    for (const file of files) {
      const filePath = path.join(folderPath, file);
      const stats = await fs.promises.stat(filePath);
      console.log(`\n==== Started Processing File: ${file} ====\n`);

      const job = await this.importFileJobService.createJob({
        fileName: file,
        fileSize: stats.size,
      });

      let rooftopProcessed = false;
      const processedVins = new Set<string>();
      let currentRooftopId: number | null = null;
      let total = 0, skipped = 0, added = 0, updated = 0, noChange = 0, deleted = 0;

      try {
        const parser: Parser = fs.createReadStream(filePath).pipe(parse({
          columns: true,
          relax_quotes: true,
          relax_column_count: true,
          skip_empty_lines: true,
          trim: true,
        }));

        for await (const record of parser) {
          total++;
          try {
            const vin = record['VIN']?.trim();
            if (!vin) {
              skipped++;
              console.log(`Row ${total} -> Missing VIN, skipped.`);
              continue;
            }
            processedVins.add(vin);

            console.log(`\nRow ${total} -> VIN: ${vin} | Processing...`);

            // Process rooftop once per file
            if (!rooftopProcessed) {
              const rooftopCsv = mapCsvRecordToDbObject(record, ROOFTOP_COLUMN_MAPPING);
              const rooftop = await this.rooftopService.updateFromCsv(rooftopCsv);
              rooftopProcessed = true;
              currentRooftopId = rooftop.rt_id;
              console.log(`Rooftop updated from CSV for file: ${file}`);
            }

            // Upsert vehicle (insert or update)
            const action = await this.upsertVehicle(record);

            // Log action
            if (action === 'added') {
              added++;
              console.log(`Row ${total} -> VIN: ${vin} | Action: ADDED`);
            } else if (action === 'updated') {
              updated++;
              console.log(`Row ${total} -> VIN: ${vin} | Action: UPDATED (image count changed or reactivated)`);
            } else if (action === 'noChange') {
              noChange++;
              console.log(`Row ${total} -> VIN: ${vin} | Action: SKIPPED (no change)`);
            } else if (action === 'skipped') {
              skipped++;
              console.log(`Row ${total} -> VIN: ${vin} | Action: SKIPPED`);
            }

            // Vehicle history (Mongo)
            const vehicle = await this.db('vehicles').where({ veh_vin: vin }).first();
            if (vehicle?.veh_id) {
              const historyData = mapCsvRecordToDbObject(record, VEHICLE_HISTORY_COLUMN_MAPPING_MONGO);
              const mongoIds = await this.historyService.upsertSnapshot(vehicle.veh_id, vin, historyData);
              await this.db('vehicles')
                .where({ veh_id: vehicle.veh_id })
                .update({
                  vh_options_mongo_id: mongoIds.optionsId,
                  vh_description_mongo_id: mongoIds.descriptionId,
                });
            }

          } catch (err) {
            skipped++;
            console.error(`Row ${total} -> VIN: ${record['VIN'] || 'N/A'} | Inventory row failed: ${err.message}`);
          }
        }
        // ===== SOFT DELETE MISSING VINs =====
        if (currentRooftopId && processedVins.size > 0) {
          const vinsArray = Array.from(processedVins);
          const deletedCount = await this.db('vehicles')
            .where('veh_rt_id', currentRooftopId)
            .whereNotIn('veh_vin', vinsArray)
            .andWhere('veh_status', 1)
            .update({
              veh_active: 0,
            });
          deleted += deletedCount;
        }
        console.log(`\n==== File Processing Summary: ${file} ====`);
        console.log(`Total rows: ${total}, Added: ${added}, Updated: ${updated}, Skipped: ${noChange + skipped}, Deleted: ${deleted}\n`);

        // Complete import job
        await this.importFileJobService.completeJob(job.ifj_id, total, skipped, added, updated, noChange, deleted);

      } catch (err) {
        console.error(`File processing failed: ${err.message}`);
        await this.importFileJobService.failJob(job.ifj_id, err.message);
      }
    }
  }

  // ---------------- UPSERT VEHICLE ----------------
  private async upsertVehicle(record: any): Promise<'added' | 'updated' | 'noChange' | 'skipped'> {
    const vin = record['VIN']?.trim();
    if (!vin) return 'skipped';

    // Map CSV vehicle data
    const csvData = mapCsvRecordToDbObject(record, VEHICLES_COLUMN_MAPPING);
    if (!csvData?.veh_vin) return 'skipped';

    csvData.veh_listing_type = this.normalizeListingType(csvData.veh_listing_type);
    csvData.veh_certified = this.normalizeBoolean(csvData.veh_certified);
    csvData.veh_miles = this.normalizeNumber(csvData.veh_miles);
    csvData.veh_year = this.normalizeNumber(csvData.veh_year);

    const rooftopDealerId = record['Dealer ID']?.trim();
    if (!rooftopDealerId) return 'skipped';

    const rooftopRow = await this.db('rooftop')
      .select('rt_id')
      .where({ rt_dealer_id: rooftopDealerId })
      .first();
    if (!rooftopRow?.rt_id) return 'skipped';

    const makeId = await this.vehicleService.getOrCreateMake(record['Make']?.trim());
    const modelId = await this.vehicleService.getOrCreateModel(makeId, record['Model']?.trim());
    const trimId = await this.vehicleService.getOrCreateTrim(makeId, modelId, record['Trim']?.trim());
    const imagesCsv = this.parseImages(record);
    // Check if vehicle exists
    const existingVehicle = await this.db('vehicles').where({ veh_vin: vin }).first();

    const vehicleData = {
      ...csvData,
      veh_rt_id: rooftopRow.rt_id,
      veh_make_id: makeId,
      veh_model_id: modelId,
      veh_trim_id: trimId,
      veh_active: 1
    };

    let vehicleId: number;
    if (!existingVehicle) {
      // Insert new vehicle and return veh_id as number
      vehicleId = await this.db('vehicles')
        .insert(vehicleData)
        .returning('veh_id')
        .then(rows => (typeof rows[0] === 'object' ? rows[0].veh_id : rows[0]));

      if (!vehicleId) return 'skipped';

      await this.syncVehicleImages(vehicleId, imagesCsv);
      return 'added';
    } else {
      // Existing vehicle → reactivate and update if images count differs
      vehicleId = existingVehicle.veh_id;
      const row = await this.db('images')
        .where({ vehicle_id: vehicleId })
        .select('image_src')
        .first();

      const oldImages = row?.image_src ? row.image_src.split(',').map(i => i.trim()).filter(Boolean) : [];

      // Always set active = 1 for existing vehicle in CSV
      await this.db('vehicles').where({ veh_id: vehicleId }).update({ ...vehicleData });
      if (oldImages.length === imagesCsv.length) {
        // No change in images → noChange
        return 'noChange';
      }
      await this.syncVehicleImages(vehicleId, imagesCsv); // Image count differs → update images
      return 'updated';
    }
  }

  // ---------------- IMAGE HELPERS ----------------
  private parseImages(record: any): string[] {
    return (record['ImageList'] || '')
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

  // ---------------- NORMALIZERS ----------------
  private normalizeListingType(v?: string) {
    return !v ? 'Used' : v.toLowerCase() === 'new' ? 'New' : 'Used';
  }

  private normalizeBoolean(v?: any) {
    return v === true || v === 'true' || v === '1' || v === 1;
  }

  private normalizeNumber(v?: any) {
    const n = Number(v); return isNaN(n) ? null : n;
  }
}
