import mongoose, { Schema, Document, Types } from 'mongoose';
import { baseSchemaFields, baseSchemaOptions } from '@/lib/baseSchema';

export interface IParticular {
  sn: number;
  particulars: string;
  quantity: number;
  rate: number;
  amount: number;
}

export interface IQuotation extends Document {
  adminId: Types.ObjectId | string;
  quotationSN: string;
  partyName: string;
  address: string;
  phoneNumber: string;
  particulars: IParticular[];
  total: number;
  hasVAT: boolean;
  subtotal?: number;
  vatAmount?: number;
  grandTotal: number;
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

const QuotationSchema = new Schema<IQuotation>(
  {
    ...baseSchemaFields,
    quotationSN: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    partyName: {
      type: String,
      required: true,
      trim: true,
    },
    address: {
      type: String,
      required: true,
      trim: true,
    },
    phoneNumber: {
      type: String,
      required: true,
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
    hasVAT: {
      type: Boolean,
      default: false,
    },
    subtotal: {
      type: Number,
    },
    vatAmount: {
      type: Number,
    },
    grandTotal: {
      type: Number,
      required: true,
    },
  },
  baseSchemaOptions
);

QuotationSchema.index({ adminId: 1 });

export default mongoose.models.Quotation || mongoose.model<IQuotation>('Quotation', QuotationSchema);
