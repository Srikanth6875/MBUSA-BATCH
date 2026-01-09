import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema({ timestamps: true, collection: 'vehicle_descriptions' })
export class VehicleDescriptions extends Document {
  @Prop({ required: true })
  veh_vin: string;

  @Prop({ required: true })
  vehicle_id: number;

  @Prop()
  vh_description: string;

  @Prop()
  snapshot_date: Date;
}

export const VehicleDescriptionsSchema = SchemaFactory.createForClass(VehicleDescriptions);
VehicleDescriptionsSchema.index({ veh_vin: 1, snapshot_date: 1 }, { unique: true });
