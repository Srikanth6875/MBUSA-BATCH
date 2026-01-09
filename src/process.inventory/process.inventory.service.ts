// import { Inject, Injectable } from '@nestjs/common';
// import * as fs from 'fs';
// import * as path from 'path';
// import { parse, Parser } from 'csv-parse';
// import { VEHICLES_COLUMN_MAPPING, ROOFTOP_COLUMN_MAPPING, VEHICLE_HISTORY_COLUMN_MAPPING_MONGO } from '../utils/db.mapping';
// import { mapCsvRecordToDbObject } from '../utils/curl.helper';
// import { VehicleImportService } from '../mbusa-audit/vehicle-import.service';
// import { RooftopInsertService } from 'src/mbusa-audit/rooftop-insert.service';
// import { Knex } from 'knex';
// import { VehicleDataService } from '../mbusa-audit/mongo/schemas/vehicle-history.service';
// import { ImportFileJobService } from 'src/mbusa-audit/import-file-job.service';

// @Injectable()
// export class ProcessVehicleInventoryService {

//   constructor(
//     private readonly rooftopService: RooftopInsertService,
//     private readonly vehicleService: VehicleImportService,
//     private readonly historyService: VehicleDataService,
//     private readonly importFileJobService: ImportFileJobService,
//     @Inject('PG_CONNECTION') private readonly db: Knex
//   ) { }

//   async processFolder(folderPath: string) {
//     const files = fs.readdirSync(folderPath).filter(f => f.endsWith('.csv'));

//     for (const file of files) {
//       const filePath = path.join(folderPath, file);
//       const stats = fs.statSync(filePath);
//       console.log(`Processing file → ${file}`);

//       const job = await this.importFileJobService.createJob({
//         fileName: file,
//         fileSize: stats.size,
//       });

//       let rooftopProcessed = false;

//       const parser: Parser = fs.createReadStream(filePath).pipe(
//         parse({
//           columns: true,
//           relax_quotes: true,
//           relax_column_count: true,
//           skip_empty_lines: true,
//           trim: true,
//         }),
//       );

//       for await (const record of parser) {
//         try {
//           // --- Handle rooftop from first valid row only ---
//           if (!rooftopProcessed) {
//             const rooftopCsv = mapCsvRecordToDbObject(record, ROOFTOP_COLUMN_MAPPING);
//             await this.rooftopService.updateFromCsv(rooftopCsv); // assign, do NOT redeclare
//             rooftopProcessed = true;
//           }

//           const csvData = mapCsvRecordToDbObject(record, VEHICLES_COLUMN_MAPPING);
//           if (!csvData?.veh_vin) continue;

//           csvData.veh_listing_type = this.normalizeListingType(csvData.veh_listing_type);
//           csvData.veh_certified = this.normalizeBoolean(csvData.veh_certified);
//           csvData.veh_miles = this.normalizeNumber(csvData.veh_miles);
//           csvData.veh_year = this.normalizeNumber(csvData.veh_year);

//           const rooftopDealerId = record['Dealer ID']?.trim() || null;
//           if (!rooftopDealerId) {
//             console.log('Skipping vehicle, no Dealer ID found');
//             continue; // skip
//           }

//           const rooftopRow = await this.db('rooftop')
//             .select('rt_id')
//             .where({ rt_dealer_id: rooftopDealerId })
//             .first();

//           if (!rooftopRow?.rt_id) {
//             console.log(`Skipping vehicle, rooftop not found for Dealer ID: ${rooftopDealerId}`);
//             continue; // skip if rooftop does not exist
//           }

//           const rooftopId = rooftopRow.rt_id;

//           // --- Create or get parent IDs ---
//           const makeName = record['Make']?.trim() || null;
//           const modelName = record['Model']?.trim() || null;
//           const trimName = record['Trim']?.trim() || null;

//           const makeId = await this.vehicleService.getOrCreateMake(makeName);
//           const modelId = await this.vehicleService.getOrCreateModel(makeId, modelName);
//           const trimId = await this.vehicleService.getOrCreateTrim(makeId, modelId, trimName);

//           console.log(`Make ID: ${makeId}, Model ID: ${modelId}, Trim ID: ${trimId}`);
//           const vehicleRow = {
//             ...csvData,
//             veh_rt_id: rooftopId,
//             veh_make_id: makeId,
//             veh_model_id: modelId,
//             veh_trim_id: trimId,
//           };

//           const [vehicle] = await this.db('vehicles')
//             .insert(vehicleRow)
//             .onConflict('veh_vin')
//             .merge()
//             .returning('*');

//           if (!vehicle?.veh_id) continue;

//           // -------- MONGO SNAPSHOT --------
//           const historyData = mapCsvRecordToDbObject(record, VEHICLE_HISTORY_COLUMN_MAPPING_MONGO);

//           const mongoId = await this.historyService.upsertSnapshot(csvData.veh_vin, historyData);

//           await this.db('vehicles').where({ veh_id: vehicle.veh_id }).update({ vh_mongo_id: mongoId });

//           const vehicleImages = record['ImageList']?.trim() || null;
//           if (vehicleImages) {
//             const imagesArray = vehicleImages
//               .split(',')
//               .map(img => img.trim())
//               .filter(img => img.length > 0);

//             if (imagesArray.length) {
//               const imagesRow = {
//                 vehicle_id: vehicle.veh_id,
//                 image_src: imagesArray.join(','), // store all images in single string
//                 ctime: new Date(),
//                 mtime: new Date(),
//               };

//               await this.db('images')
//                 .insert(imagesRow)
//                 .onConflict('vehicle_id')
//                 .merge({
//                   image_src: imagesRow.image_src,
//                   mtime: new Date()
//                 });
//             }
//           }
//         } catch (err) {
//           console.error('Inventory row failed');
//           console.error('CSV RECORD:', record);
//           console.error('ERROR:', err.message || err);
//         }
//       }
//     }
//   }

//   private normalizeListingType(v?: string) {
//     if (!v) return 'Used';
//     const val = v.trim().toLowerCase();
//     if (val === 'new') return 'New';
//     if (val === 'certified' || val === 'cpo') return 'Certified';
//     return 'Used';
//   }

//   private normalizeBoolean(v?: any) {
//     if (v === true || v === 'true' || v === 'True' || v === '1' || v === 1) return true;
//     return false;
//   }

//   private normalizeNumber(v?: any) {
//     const n = Number(v);
//     return isNaN(n) ? null : n;
//   }
// }


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

  async processFolder(folderPath: string) {
    const files = fs.readdirSync(folderPath).filter(f => f.endsWith('.csv'));

    if (!files.length) {
      console.warn('No CSV files to process in folder', folderPath);
      return;
    }

    for (const file of files) {
      const filePath = path.join(folderPath, file);

      let stats;
      try {
        stats = await fs.promises.stat(filePath);
      } catch (err) {
        if (err.code === 'ENOENT') {
          console.warn(`File disappeared before processing: ${file}`);
          continue;
        }
        throw err;
      }

      console.log(`Processing file → ${file}`);


      // --------- FILE AUDIT START ---------
      const job = await this.importFileJobService.createJob({
        fileName: file,
        fileSize: stats.size,
      });
      // --------- FILE AUDIT START ---------

      let rooftopProcessed = false;
      let total = 0, skipped = 0, added = 0, updated = 0, noChange = 0;
      const todayVins = new Set<string>();

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
              continue;
            }
            todayVins.add(vin);

            const existingVehicle = await this.db('vehicles').where({ veh_vin: vin }).first();
            const imagesCsv = record['ImageList']?.split(',').filter(Boolean) || [];

            if (!existingVehicle) {
              added++;
            } else {
              const oldImages = await this.db('images').where({ vehicle_id: existingVehicle.veh_id }).first();
              const oldImageCount = oldImages?.image_src?.split(',').filter(Boolean).length || 0;

              if (oldImageCount !== imagesCsv.length) {
                updated++;
              } else {
                noChange++;
              }
            }

            if (!rooftopProcessed) {
              const rooftopCsv = mapCsvRecordToDbObject(record, ROOFTOP_COLUMN_MAPPING);
              await this.rooftopService.updateFromCsv(rooftopCsv);
              rooftopProcessed = true;
            }

            const csvData = mapCsvRecordToDbObject(record, VEHICLES_COLUMN_MAPPING);
            if (!csvData?.veh_vin) continue;

            csvData.veh_listing_type = this.normalizeListingType(csvData.veh_listing_type);
            csvData.veh_certified = this.normalizeBoolean(csvData.veh_certified);
            csvData.veh_miles = this.normalizeNumber(csvData.veh_miles);
            csvData.veh_year = this.normalizeNumber(csvData.veh_year);

            const rooftopDealerId = record['Dealer ID']?.trim() || null;
            if (!rooftopDealerId) continue;

            const rooftopRow = await this.db('rooftop')
              .select('rt_id')
              .where({ rt_dealer_id: rooftopDealerId })
              .first();

            if (!rooftopRow?.rt_id) continue;

            const makeId = await this.vehicleService.getOrCreateMake(record['Make']?.trim());
            const modelId = await this.vehicleService.getOrCreateModel(makeId, record['Model']?.trim());
            const trimId = await this.vehicleService.getOrCreateTrim(makeId, modelId, record['Trim']?.trim());

            const [vehicle] = await this.db('vehicles')
              .insert({ ...csvData, veh_rt_id: rooftopRow.rt_id, veh_make_id: makeId, veh_model_id: modelId, veh_trim_id: trimId })
              .onConflict('veh_vin')
              .merge()
              .returning('*');

            if (!vehicle?.veh_id) continue;

            const historyData = mapCsvRecordToDbObject(record, VEHICLE_HISTORY_COLUMN_MAPPING_MONGO);
            const mongoIds = await this.historyService.upsertSnapshot(vehicle.veh_id, csvData.veh_vin, historyData);

            await this.db('vehicles')
              .where({ veh_id: vehicle.veh_id })
              .update({
                vh_options_mongo_id: mongoIds.optionsId,
                vh_description_mongo_id: mongoIds.descriptionId,
              });

          } catch (err) {
            skipped++;
            console.error('Inventory row failed', err.message);
          }
        }

        // ----------- DELETED LOGIC -------------
        const yesterdayVehicles = await this.db('vehicles').where({ veh_status: true });
        let deleted = 0;

        for (const v of yesterdayVehicles) {
          if (!todayVins.has(v.veh_vin)) {
            await this.db('vehicles')
              .where({ veh_id: v.veh_id })
              .update({ veh_status: false });
            deleted++;
          }
        }

        // -------- FILE AUDIT COMPLETE --------
        await this.importFileJobService.completeJob(job.ifj_id, total, skipped, added, updated, noChange, deleted);

      } catch (err) {
        // -------- FILE AUDIT FAILED --------
        await this.importFileJobService.failJob(job.ifj_id, err.message);
      }
    }
  }

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
