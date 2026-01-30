// vehicle-options.schema.ts
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
import { MONGO_COLLECTIONS } from 'src/shared/vehicle.constants';

export type VehicleOptionsDocument = HydratedDocument<VehicleOptions>;

@Schema({ timestamps: true, collection: MONGO_COLLECTIONS.VEHICLE_OPTIONS })
export class VehicleOptions {
  @Prop({ required: true })
  vehicle_id: number;

  @Prop({ required: true })
  veh_vin: string;

  @Prop()
  veh_options: string;
}

export const VehicleOptionsSchema =
  SchemaFactory.createForClass(VehicleOptions);
VehicleOptionsSchema.index({ veh_vin: 1 }, { unique: true });
