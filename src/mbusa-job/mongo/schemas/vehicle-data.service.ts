import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, HydratedDocument } from 'mongoose';
import { VehicleOptions } from './vehicle-options.schema';
import { VehicleDescriptions } from './vehicle-descriptions.schema';
import { normalizeNullableString } from 'src/utils/safe-trim-value';

export type VehicleOptionsDocument = HydratedDocument<VehicleOptions>;
export type VehicleDescriptionsDocument = HydratedDocument<VehicleDescriptions>;

@Injectable()
export class VehicleDataService {
  constructor(
    @InjectModel(VehicleOptions.name)
    private readonly optionsModel: Model<VehicleOptionsDocument>,
    @InjectModel(VehicleDescriptions.name)
    private readonly descModel: Model<VehicleDescriptionsDocument>,
  ) {}

  async upsertSnapshot(vehicleId: number, vin: string, data: any) {
    let optionsDoc: VehicleOptionsDocument | null = null;
    let descDoc: VehicleDescriptionsDocument | null = null;

    const options = normalizeNullableString(data?.veh_options);
    const description = normalizeNullableString(data?.veh_description);

    if (options) {
      optionsDoc = await this.optionsModel.findOneAndUpdate(
        { veh_vin: vin },
        { $set: { vehicle_id: vehicleId, veh_vin: vin, veh_options: options } },
        { upsert: true, new: true },
      );
    }

    if (description) {
      descDoc = await this.descModel.findOneAndUpdate(
        { veh_vin: vin },
        {
          $set: {
            vehicle_id: vehicleId,
            veh_vin: vin,
            veh_description: description,
          },
        },
        { upsert: true, new: true },
      );
    }

    return {
      optionsId: optionsDoc?._id?.toString() ?? null,
      descriptionId: descDoc?._id?.toString() ?? null,
    };
  }
}
