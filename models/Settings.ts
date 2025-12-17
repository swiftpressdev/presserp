import mongoose, { Schema, Document, Types } from 'mongoose';

export interface ISettings extends Document {
  adminId: Types.ObjectId | string;
  quotationPrefix: string;
  jobPrefix: string;
  estimatePrefix: string;
  challanPrefix: string;
  companyName?: string;
  address?: string;
  email?: string;
  phone?: string;
  regdNo?: string;
  companyLogo?: string;
  companyLogoPublicId?: string;
  companyStamp?: string;
  companyStampPublicId?: string;
  letterhead?: string;
  letterheadPublicId?: string;
  esignature?: string;
  esignaturePublicId?: string;
  createdAt: Date;
  updatedAt: Date;
}

const SettingsSchema = new Schema<ISettings>(
  {
    adminId: {
      type: Schema.Types.ObjectId,
      ref: 'Admin',
      required: true,
      unique: true,
      index: true,
    },
    quotationPrefix: {
      type: String,
      default: 'Q',
      trim: true,
    },
    jobPrefix: {
      type: String,
      default: 'J',
      trim: true,
    },
    estimatePrefix: {
      type: String,
      default: 'E',
      trim: true,
    },
    challanPrefix: {
      type: String,
      default: 'C',
      trim: true,
    },
    companyName: {
      type: String,
      trim: true,
    },
    address: {
      type: String,
      trim: true,
    },
    email: {
      type: String,
      trim: true,
    },
    phone: {
      type: String,
      trim: true,
    },
    regdNo: {
      type: String,
      trim: true,
    },
    companyLogo: {
      type: String,
      trim: true,
    },
    companyLogoPublicId: {
      type: String,
      trim: true,
    },
    companyStamp: {
      type: String,
      trim: true,
    },
    companyStampPublicId: {
      type: String,
      trim: true,
    },
    letterhead: {
      type: String,
      trim: true,
    },
    letterheadPublicId: {
      type: String,
      trim: true,
    },
    esignature: {
      type: String,
      trim: true,
    },
    esignaturePublicId: {
      type: String,
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

export default mongoose.models.Settings || mongoose.model<ISettings>('Settings', SettingsSchema);
