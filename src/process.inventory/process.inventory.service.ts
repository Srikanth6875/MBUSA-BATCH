import { Inject, Injectable } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import { parse, Parser } from 'csv-parse';
import { ROOFTOP_COLUMN_MAPPING } from '../shared/db.mapping';
import { Knex } from 'knex';
import { RooftopInsertService } from 'src/mbusa-job/rooftop-insert.service';
import { ImportFileJobService } from 'src/mbusa-job/import-file-job.service';
import {
  INVENTORY_CONST,
  TABLE_NAMES,
  VehicleAction,
} from '../shared/vehicle.constants';
import { mapCsvRecordToDbObject } from 'src/utils/csv-to-db-mapper';
import { normalizeString } from 'src/utils/safe-trim-value';
import { VehicleUpsertService } from './vehicle-upsert.service';
@Injectable()
export class ProcessVehicleInventoryService {
  constructor(
    private readonly rooftopService: RooftopInsertService,
    private readonly UpsertVehicleService: VehicleUpsertService,
    private readonly importFileJobService: ImportFileJobService,
    @Inject('PG_CONNECTION') private readonly db: Knex,
  ) {}

  async processFolder(folderPath: string) {
    const files = fs.readdirSync(folderPath).filter((f) => f.endsWith('.csv'));
    if (!files.length) return;

    for (const file of files) {
      const filePath = path.join(folderPath, file);
      const stats = await fs.promises.stat(filePath);

      console.log(`\n==== Processing Inventory File: ${file} ====\n`);
      const job = await this.importFileJobService.createJob({
        fileName: file,
        fileSize: stats.size,
      });

      let rooftopProcessed = false;
      let currentRooftopId: number | null = null;
      const processedVins = new Set<string>();
      const counters: Record<VehicleAction, number> = {
        added: 0,
        updated: 0,
        noChange: 0,
        skipped: 0,
        total: 0,
        deleted: 0,
      };

      try {
        const parser: Parser = fs.createReadStream(filePath).pipe(
          parse({
            columns: true,
            relax_quotes: true,
            relax_column_count: true,
            skip_empty_lines: true,
            trim: true,
          }),
        );

        for await (const record of parser) {
          counters.total++;
          try {
            const vin = normalizeString(
              record[INVENTORY_CONST.CSV_HEADERS.VIN],
            );
            const dealerId = normalizeString(
              record[INVENTORY_CONST.CSV_HEADERS.DEALER_ID],
            );
            if (!vin || !dealerId) {
              counters.skipped++;
              continue;
            }
            processedVins.add(vin);

            if (!rooftopProcessed) {
              const rooftopCsv = mapCsvRecordToDbObject(
                record,
                ROOFTOP_COLUMN_MAPPING,
              );
              const rooftop =
                await this.rooftopService.updateFromCsv(rooftopCsv);
              rooftopProcessed = true;
              currentRooftopId = rooftop.rt_id;
            }

            const { action } = await this.UpsertVehicleService.upsertVehicle(
              record,
              vin,
              dealerId,
            );
            this.handleAction(action, counters);

            console.log(` VIN ${vin} | ${INVENTORY_CONST.ACTION_LOGS[action]}`);
          } catch (err: any) {
            console.error(
              `Row ${counters.total} VIN ${record['VIN'] || 'N/A'} failed: ${err.message}`,
            );
          }
        }

        if (currentRooftopId && processedVins.size) {
          const deletedRows = await this.db(TABLE_NAMES.VEHICLES)
            .where('veh_rt_id', currentRooftopId)
            .whereNotIn('veh_vin', Array.from(processedVins))
            .andWhere('veh_active', INVENTORY_CONST.VEHICLE_STATUS.ACTIVE)
            .update({ veh_active: INVENTORY_CONST.VEHICLE_STATUS.INACTIVE })
            .returning('veh_id');

          counters.deleted = Array.isArray(deletedRows)
            ? deletedRows.length
            : deletedRows;
        }

        await this.importFileJobService.completeJob(
          job.ifj_id,
          counters.total,
          counters.skipped,
          counters.added,
          counters.updated,
          counters.noChange,
          counters.deleted,
        );
      } catch (err: any) {
        await this.importFileJobService.failJob(job.ifj_id, err.message);
        console.log(err);
      }
    }
  }

  private handleAction(
    action: VehicleAction,
    counters: Record<VehicleAction, number>,
  ) {
    counters[action]++;
  }
}
