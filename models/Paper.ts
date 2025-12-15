import mongoose, { Schema, Document, Types } from 'mongoose';
import { PaperType } from '@/lib/types';
import { baseSchemaFields, baseSchemaOptions } from '@/lib/baseSchema';

export interface IPaper extends Document {
  adminId: Types.ObjectId | string;
  paperName: string;
  paperType: PaperType;
  paperTypeOther?: string;
  paperSize: string;
  paperWeight: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

const PaperSchema = new Schema<IPaper>(
  {
    ...baseSchemaFields,
    paperName: {
      type: String,
      required: true,
      trim: true,
    },
    paperType: {
      type: String,
      enum: Object.values(PaperType),
      required: true,
    },
    paperTypeOther: {
      type: String,
      trim: true,
    },
    paperSize: {
      type: String,
      required: true,
      trim: true,
    },
    paperWeight: {
      type: String,
      required: true,
      trim: true,
    },
  },
  baseSchemaOptions
);

PaperSchema.index({ adminId: 1 });

export default mongoose.models.Paper || mongoose.model<IPaper>('Paper', PaperSchema);
