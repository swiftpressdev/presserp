import mongoose, { Schema, Document, Types } from 'mongoose';
import { baseSchemaFields, baseSchemaOptions } from '@/lib/baseSchema';

export interface IClient extends Document {
  adminId: Types.ObjectId | string;
  clientName: string;
  address?: string;
  emailAddress?: string;
  mobile: string;
  contactPerson?: string;
  department?: string;
  contactEmailAddress?: string;
  contactTelephone?: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

const ClientSchema = new Schema<IClient>(
  {
    ...baseSchemaFields,
    clientName: {
      type: String,
      required: true,
      trim: true,
    },
    address: {
      type: String,
      trim: true,
    },
    emailAddress: {
      type: String,
      lowercase: true,
      trim: true,
    },
    mobile: {
      type: String,
      required: true,
      trim: true,
    },
    contactPerson: {
      type: String,
      trim: true,
    },
    department: {
      type: String,
      trim: true,
    },
    contactEmailAddress: {
      type: String,
      lowercase: true,
      trim: true,
    },
    contactTelephone: {
      type: String,
      trim: true,
    },
  },
  baseSchemaOptions
);

ClientSchema.index({ adminId: 1 });

export default mongoose.models.Client || mongoose.model<IClient>('Client', ClientSchema);
