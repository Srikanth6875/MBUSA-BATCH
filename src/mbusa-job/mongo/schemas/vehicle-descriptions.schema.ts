import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
export type VehicleDescriptionsDocument = HydratedDocument<VehicleDescriptions>;

@Schema({ timestamps: true, collection: 'vehicle_descriptions' })
export class VehicleDescriptions {

  @Prop({ required: true })
  vehicle_id: number;

  @Prop({ required: true })
  veh_vin: string;

  @Prop()
  veh_description: string;
}

export const VehicleDescriptionsSchema = SchemaFactory.createForClass(VehicleDescriptions);
VehicleDescriptionsSchema.index({ vehicle_id: 1 }, { unique: true });
