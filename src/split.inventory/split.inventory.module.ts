import { Module } from '@nestjs/common';
import { SplitInventoryService } from './split.inventory.service';
import { MbusaJobLoggerService } from '../mbusa-job/mbusa-job-logger.service';
import { PgDatabaseModule } from 'src/database/pg/database.module';
import { MbusaJobModule } from 'src/mbusa-job/mbusa-job.module';

@Module({
  imports: [PgDatabaseModule,MbusaJobModule],
  providers: [SplitInventoryService, MbusaJobLoggerService],
  exports: [SplitInventoryService, MbusaJobLoggerService]
})
export class SplitInventoryModule { }
