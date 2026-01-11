import { Module } from '@nestjs/common';
import { SplitInventoryModule } from './split.inventory/split.inventory.module';
import { MbusaAppService } from './mbusa.app.service';
import { SourceInventoryModule } from './source-inventory/source.inventory.module';
import { PgDatabaseModule } from './database/pg/database.module';
import { ConfigModule } from '@nestjs/config';
import { MongoModule } from './database/mongo/mongo.module';
import { ProcessInventoryModule } from './process.inventory/process.inventory.module';
import { VehicleDataModule } from './mbusa-job/mongo/vehicle-data.module';
import { MbusaJobModule } from './mbusa-job/mbusa-job.module';
import { RooftopInsertService } from './mbusa-job/rooftop-insert.service';
import { ScheduleModule } from '@nestjs/schedule';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ScheduleModule.forRoot(),
    SplitInventoryModule,
    SourceInventoryModule,
    ProcessInventoryModule,
    MongoModule,
    PgDatabaseModule,
    VehicleDataModule,
    MbusaJobModule,
  ],
  providers: [MbusaAppService, RooftopInsertService],

})
export class MbusaAppModule { }
