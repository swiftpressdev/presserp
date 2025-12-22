import mongoose, { Schema, Document, Types } from 'mongoose';
import { baseSchemaFields, baseSchemaOptions } from '@/lib/baseSchema';

export interface IChallanReportData {
  date: string;
  jobNo: string;
  challanNo: string;
  particulars: string;
  quantity: number;
  remarks?: string;
}

export interface IChallanReport extends Document {
  adminId: Types.ObjectId | string;
  reportName: string;
  filterType: 'client' | 'particular';
  clientId?: Types.ObjectId | string;
  particularName?: string;
  finalOrder?: number;
  totalIssued: number;
  reportData: IChallanReportData[];
  lastUpdated: Date;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

const ChallanReportDataSchema = new Schema<IChallanReportData>(
  {
    date: {
      type: String,
      required: true,
    },
    jobNo: {
      type: String,
      required: true,
      trim: true,
    },
    challanNo: {
      type: String,
      required: true,
      trim: true,
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
    remarks: {
      type: String,
      trim: true,
    },
  },
  { _id: false }
);

const ChallanReportSchema = new Schema<IChallanReport>(
  {
    ...baseSchemaFields,
    reportName: {
      type: String,
      required: true,
      trim: true,
    },
    filterType: {
      type: String,
      enum: ['client', 'particular'],
      required: true,
    },
    clientId: {
      type: Schema.Types.ObjectId,
      ref: 'Client',
      required: false,
    },
    particularName: {
      type: String,
      trim: true,
    },
    finalOrder: {
      type: Number,
      default: 0,
    },
    totalIssued: {
      type: Number,
      required: true,
      default: 0,
    },
    reportData: {
      type: [ChallanReportDataSchema],
      default: [],
    },
    lastUpdated: {
      type: Date,
      default: Date.now,
    },
  },
  baseSchemaOptions
);

ChallanReportSchema.index({ adminId: 1 });

export default mongoose.models.ChallanReport || mongoose.model<IChallanReport>('ChallanReport', ChallanReportSchema);
