import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { VehicleOptions } from './vehicle-options.schema';
import { VehicleDescriptions } from './vehicle-descriptions.schema';

@Injectable()
export class VehicleDataService {
  constructor(
    @InjectModel(VehicleOptions.name) private readonly optionsModel: Model<VehicleOptions>,
    @InjectModel(VehicleDescriptions.name) private readonly descModel: Model<VehicleDescriptions>,
  ) { }

  private today() {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }

  async upsertSnapshot(vehicleId: number, vin: string, data: any) {
    const snapshotDate = this.today();

    const options = await this.optionsModel.findOneAndUpdate(
      { veh_vin: vin, snapshot_date: snapshotDate },
      {
        $set: {
          veh_vin: vin,
          vehicle_id: vehicleId,
          vh_options: data.vh_options,
          snapshot_date: snapshotDate,
        },
      },
      { upsert: true, new: true },
    );

    const desc = await this.descModel.findOneAndUpdate(
      { veh_vin: vin, snapshot_date: snapshotDate },
      {
        $set: {
          veh_vin: vin,
          vehicle_id: vehicleId,
          vh_description: data.vh_description,
          snapshot_date: snapshotDate,
        },
      },
      { upsert: true, new: true },
    );

    return { optionsId: options._id, descriptionId: desc._id };
  }
}
