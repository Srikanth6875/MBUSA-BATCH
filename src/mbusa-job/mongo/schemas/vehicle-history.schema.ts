import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema({ timestamps: true, collection: 'Vehicle_Options' })
export class VehicleData extends Document {
  @Prop({ required: true })
  veh_vin: string;

  @Prop()
  vh_description: string;

  @Prop()
  vh_options: string;

  @Prop()
  vh_style_description: string;

  @Prop()
  vh_ext_color_generic: string;

  @Prop()
  vh_ext_color_code: string;

  @Prop()
  vh_int_color_code: string;

  @Prop()
  vh_engine_description: string;

  @Prop()
  vh_fuel_type: string;

  @Prop()
  vh_passenger_capacity: number;

  @Prop()
  snapshot_date: Date;
}

export const VehicleHistorySchema = SchemaFactory.createForClass(VehicleData);
VehicleHistorySchema.index({ veh_vin: 1, snapshot_date: 1 }, { unique: true });
