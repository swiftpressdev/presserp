import mongoose, { Schema, Document, Types } from 'mongoose';
import { baseSchemaFields, baseSchemaOptions } from '@/lib/baseSchema';

export interface IParticular {
  sn: number;
  particulars: string;
  quantity: number;
  rate: number;
  amount: number;
}

export interface IEstimate extends Document {
  adminId: Types.ObjectId | string;
  clientId: Types.ObjectId | string;
  jobId: Types.ObjectId | string;
  totalBWPages: number;
  totalColorPages: number;
  totalPages: number;
  estimateNumber: string;
  estimateDate: string;
  paperSize: string;
  finishSize?: string;
  particulars: IParticular[];
  total: number;
  hasDiscount: boolean;
  discountPercentage?: number;
  discountAmount?: number;
  priceAfterDiscount?: number;
  vatType: 'excluded' | 'included' | 'none';
  vatAmount?: number;
  grandTotal: number;
  amountInWords?: string;
  remarks?: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

const ParticularSchema = new Schema<IParticular>(
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
    rate: {
      type: Number,
      required: true,
    },
    amount: {
      type: Number,
      required: true,
    },
  },
  { _id: false }
);

const EstimateSchema = new Schema<IEstimate>(
  {
    ...baseSchemaFields,
    clientId: {
      type: Schema.Types.ObjectId,
      ref: 'Client',
      required: true,
    },
    jobId: {
      type: Schema.Types.ObjectId,
      ref: 'Job',
      required: true,
    },
    totalBWPages: {
      type: Number,
      required: true,
    },
    totalColorPages: {
      type: Number,
      required: true,
    },
    totalPages: {
      type: Number,
      required: true,
    },
    estimateNumber: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    estimateDate: {
      type: String,
      required: true,
    },
    paperSize: {
      type: String,
      required: true,
      trim: true,
    },
    finishSize: {
      type: String,
      trim: true,
    },
    particulars: {
      type: [ParticularSchema],
      required: true,
    },
    total: {
      type: Number,
      required: true,
    },
    hasDiscount: {
      type: Boolean,
      default: false,
    },
    discountPercentage: {
      type: Number,
    },
    discountAmount: {
      type: Number,
    },
    priceAfterDiscount: {
      type: Number,
    },
    vatType: {
      type: String,
      enum: ['excluded', 'included', 'none'],
      default: 'none',
    },
    vatAmount: {
      type: Number,
    },
    grandTotal: {
      type: Number,
      required: true,
    },
    amountInWords: {
      type: String,
      trim: true,
    },
    remarks: {
      type: String,
      trim: true,
    },
  },
  baseSchemaOptions
);

EstimateSchema.index({ adminId: 1 });

export default mongoose.models.Estimate || mongoose.model<IEstimate>('Estimate', EstimateSchema);
