import { Module } from '@nestjs/common';
import { ProcessVehicleInventoryService } from './process.inventory.service';
import { RooftopInsertService } from 'src/mbusa-job/rooftop-insert.service';
import { MbusaJobModule } from 'src/mbusa-job/mbusa-job.module';
import { VehicleDataModule } from 'src/mbusa-job/mongo/vehicle-data.module';
import { VehicleUpsertService } from './vehicle-upsert.service';

@Module({
    imports: [MbusaJobModule, VehicleDataModule,],
    providers: [ProcessVehicleInventoryService, RooftopInsertService, VehicleUpsertService],
    exports: [ProcessVehicleInventoryService, RooftopInsertService, VehicleUpsertService]
})
export class ProcessInventoryModule { }
