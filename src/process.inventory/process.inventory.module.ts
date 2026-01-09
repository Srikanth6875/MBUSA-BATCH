import { Module } from '@nestjs/common';
import { ProcessVehicleInventoryService } from './process.inventory.service';
import { RooftopInsertService } from 'src/mbusa-job/rooftop-insert.service';
import { MbusaJobModule } from 'src/mbusa-job/mbusa-job.module';
import { VehicleDataModule } from 'src/mbusa-job/mongo/vehicle-data.module';

@Module({
    imports: [MbusaJobModule, VehicleDataModule,],
    providers: [ProcessVehicleInventoryService, RooftopInsertService],
    exports: [ProcessVehicleInventoryService, RooftopInsertService]
})
export class ProcessInventoryModule { }
