import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { VehicleDataService } from './schemas/vehicle-data.service';
import {
  VehicleOptions,
  VehicleOptionsSchema,
} from './schemas/vehicle-options.schema';
import {
  VehicleDescriptions,
  VehicleDescriptionsSchema,
} from './schemas/vehicle-descriptions.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: VehicleOptions.name, schema: VehicleOptionsSchema },
      { name: VehicleDescriptions.name, schema: VehicleDescriptionsSchema },
    ]),
  ],
  providers: [VehicleDataService],
  exports: [VehicleDataService],
})
export class VehicleDataModule {}
