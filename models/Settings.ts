import mongoose, { Schema, Document, Types } from 'mongoose';

export interface ISettings extends Document {
  adminId: Types.ObjectId | string;
  quotationPrefix: string;
  jobPrefix: string;
  estimatePrefix: string;
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
  },
  {
    timestamps: true,
  }
);

export default mongoose.models.Settings || mongoose.model<ISettings>('Settings', SettingsSchema);
