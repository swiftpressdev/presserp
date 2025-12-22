import mongoose, { Schema, Document, Types } from 'mongoose';
import { baseSchemaFields, baseSchemaOptions } from '@/lib/baseSchema';

export interface IChallanParticular {
  sn: number;
  particulars: string;
  quantity: number;
}

export interface IChallan extends Document {
  adminId: Types.ObjectId | string;
  challanNumber: string;
  challanDate: string;
  clientId?: Types.ObjectId | string;
  jobId?: Types.ObjectId | string;
  destination: string;
  remarks?: string;
  estimateReferenceNo?: string;
  particulars: IChallanParticular[];
  totalUnits: number;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

const ChallanParticularSchema = new Schema<IChallanParticular>(
  {
    sn: {
      type: Number,
      required: true,
    },
    particulars: {
      type: String,
      required: true,
      trim: true,
    },
    quantity: {
      type: Number,
      required: true,
    },
  },
  { _id: false }
);

const ChallanSchema = new Schema<IChallan>(
  {
    ...baseSchemaFields,
    challanNumber: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    challanDate: {
      type: String,
      required: true,
    },
    clientId: {
      type: Schema.Types.ObjectId,
      ref: 'Client',
      required: false,
    },
    jobId: {
      type: Schema.Types.ObjectId,
      ref: 'Job',
      required: false,
    },
    destination: {
      type: String,
      required: true,
      trim: true,
    },
    remarks: {
      type: String,
      trim: true,
    },
    estimateReferenceNo: {
      type: String,
      required: false,
      trim: true,
    },
    particulars: {
      type: [ChallanParticularSchema],
      required: true,
    },
    totalUnits: {
      type: Number,
      required: true,
    },
  },
  baseSchemaOptions
);

ChallanSchema.index({ adminId: 1 });

export default mongoose.models.Challan || mongoose.model<IChallan>('Challan', ChallanSchema);
