import mongoose, { Schema, Document, Types } from 'mongoose';
import { baseSchemaFields, baseSchemaOptions } from '@/lib/baseSchema';

export interface IPaperStock extends Document {
  adminId: Types.ObjectId | string;
  paperId: Types.ObjectId | string;
  date: string;
  jobNo?: string;
  jobName?: string;
  jobId?: Types.ObjectId | string;
  issuedPaper: number;
  wastage: number;
  remaining: number;
  remarks?: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

const PaperStockSchema = new Schema<IPaperStock>(
  {
    ...baseSchemaFields,
    paperId: {
      type: Schema.Types.ObjectId,
      ref: 'Paper',
      required: true,
    },
    date: {
      type: String,
      required: true,
    },
    jobNo: {
      type: String,
      trim: true,
    },
    jobName: {
      type: String,
      trim: true,
    },
    jobId: {
      type: Schema.Types.ObjectId,
      ref: 'Job',
    },
    issuedPaper: {
      type: Number,
      required: true,
      default: 0,
    },
    wastage: {
      type: Number,
      required: true,
      default: 0,
    },
    remaining: {
      type: Number,
      required: true,
    },
    remarks: {
      type: String,
      trim: true,
    },
  },
  baseSchemaOptions
);

PaperStockSchema.index({ adminId: 1 });
PaperStockSchema.index({ paperId: 1 });

export default mongoose.models.PaperStock || mongoose.model<IPaperStock>('PaperStock', PaperStockSchema);
