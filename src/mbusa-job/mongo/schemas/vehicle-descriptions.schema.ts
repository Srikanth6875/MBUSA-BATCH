import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
import { MONGO_COLLECTIONS } from 'src/shared/vehicle.constants';
export type VehicleDescriptionsDocument = HydratedDocument<VehicleDescriptions>;

@Schema({ timestamps: true, collection: MONGO_COLLECTIONS.VEHICLE_DESCRIPTION })
export class VehicleDescriptions {

  @Prop({ required: true })
  vehicle_id: number;

  @Prop({ required: true })
  veh_vin: string;

  @Prop()
  veh_description: string;
}

export const VehicleDescriptionsSchema = SchemaFactory.createForClass(VehicleDescriptions);
VehicleDescriptionsSchema.index({ veh_vin: 1 }, { unique: true });
