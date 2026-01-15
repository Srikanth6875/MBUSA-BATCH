import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type VehicleOptionsDocument = HydratedDocument<VehicleOptions>;

@Schema({ timestamps: true, collection: 'vehicle_options' })
export class VehicleOptions {

  @Prop({ required: true })
  vehicle_id: number;

  @Prop({ required: true })
  veh_vin: string;

  @Prop()
  veh_options: string;
}

export const VehicleOptionsSchema = SchemaFactory.createForClass(VehicleOptions);
VehicleOptionsSchema.index({ vehicle_id: 1 }, { unique: true });
