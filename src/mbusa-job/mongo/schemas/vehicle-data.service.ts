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

  private today(): Date {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }

  async upsertSnapshot(vehicleId: number, vin: string, data: any) {
    const snapshotDate = this.today();

    let optionsDoc: VehicleOptions | null = null;
    let descDoc: VehicleDescriptions | null = null;

    // ===== UPSERT OPTIONS ONLY WHEN DATA EXISTS =====
    if (data?.vh_options && String(data.vh_options).trim().length > 0) {
      optionsDoc = await this.optionsModel.findOneAndUpdate(
        { veh_vin: vin, snapshot_date: snapshotDate },
        {
          $set: {
            veh_vin: vin,
            vehicle_id: vehicleId,
            vh_options: String(data.vh_options).trim(),
            snapshot_date: snapshotDate,
          },
        },
        { upsert: true, new: true },
      );
    }

    // ===== UPSERT DESCRIPTION ONLY WHEN DATA EXISTS =====
    if (data?.vh_description && String(data.vh_description).trim().length > 0) {
      descDoc = await this.descModel.findOneAndUpdate(
        { veh_vin: vin, snapshot_date: snapshotDate },
        {
          $set: {
            veh_vin: vin,
            vehicle_id: vehicleId,
            vh_description: String(data.vh_description).trim(),
            snapshot_date: snapshotDate,
          },
        },
        { upsert: true, new: true },
      );
    }

    return {
      optionsId: optionsDoc?._id ?? null,
      descriptionId: descDoc?._id ?? null,
    };
  }
}
