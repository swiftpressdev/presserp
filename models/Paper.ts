import mongoose, { Schema, Document, Types } from 'mongoose';
import { PaperType, PaperUnits } from '@/lib/types';
import { baseSchemaFields, baseSchemaOptions } from '@/lib/baseSchema';

export interface IPaper extends Document {
  adminId: Types.ObjectId | string;
  clientName: string;
  paperType: PaperType;
  paperTypeOther?: string;
  paperSize: string;
  paperWeight: string;
  units: PaperUnits;
  originalStock: number;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

const PaperSchema = new Schema<IPaper>(
  {
    ...baseSchemaFields,
    clientName: {
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
    units: {
      type: String,
      enum: Object.values(PaperUnits),
      required: true,
    },
    originalStock: {
      type: Number,
      required: true,
      default: 0,
    },
  },
  baseSchemaOptions
);

PaperSchema.index({ adminId: 1 });

export default mongoose.models.Paper || mongoose.model<IPaper>('Paper', PaperSchema);
