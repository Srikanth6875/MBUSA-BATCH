import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema({ timestamps: true, collection: 'vehicle_options' })
export class VehicleOptions extends Document {
  @Prop({ required: true })
  veh_vin: string;

  @Prop({ required: true })
  vehicle_id: number;

  @Prop()
  vh_options: string;

  @Prop()
  snapshot_date: Date;
}

export const VehicleOptionsSchema = SchemaFactory.createForClass(VehicleOptions);
VehicleOptionsSchema.index({ veh_vin: 1, snapshot_date: 1 }, { unique: true });
