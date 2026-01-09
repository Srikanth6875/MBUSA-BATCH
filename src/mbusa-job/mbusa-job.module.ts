import { Module } from '@nestjs/common';
import { MbusaJobLoggerService } from './mbusa-job-logger.service';
import { PgDatabaseModule } from '../database/pg/database.module';
import { RooftopInsertService } from './rooftop-insert.service';
import { VehicleImportService } from './vehicle-import.service';
import { ImportFileJobService } from './import-file-job.service';

@Module({
  imports: [PgDatabaseModule],
  providers: [MbusaJobLoggerService, RooftopInsertService, VehicleImportService, ImportFileJobService],
  exports: [MbusaJobLoggerService, RooftopInsertService, VehicleImportService, ImportFileJobService, PgDatabaseModule],
})
export class MbusaJobModule { }
