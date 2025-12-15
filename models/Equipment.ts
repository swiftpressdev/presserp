import mongoose, { Schema, Document, Types } from 'mongoose';
import { baseSchemaFields, baseSchemaOptions } from '@/lib/baseSchema';

export interface IEquipment extends Document {
  adminId: Types.ObjectId | string;
  equipmentName: string;
  size: string;
  status: string;
  lastMaintainedDate: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

const EquipmentSchema = new Schema<IEquipment>(
  {
    ...baseSchemaFields,
    equipmentName: {
      type: String,
      required: true,
      trim: true,
    },
    size: {
      type: String,
      required: true,
      trim: true,
    },
    status: {
      type: String,
      required: true,
      trim: true,
    },
    lastMaintainedDate: {
      type: String,
      required: true,
    },
  },
  baseSchemaOptions
);

EquipmentSchema.index({ adminId: 1 });

export default mongoose.models.Equipment || mongoose.model<IEquipment>('Equipment', EquipmentSchema);
