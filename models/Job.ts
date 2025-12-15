import mongoose, { Schema, Document, Types } from 'mongoose';
import {
  JobType,
  PlateBy,
  LaminationType,
  BindingType,
  StitchType,
  AdditionalService,
} from '@/lib/types';
import { baseSchemaFields, baseSchemaOptions } from '@/lib/baseSchema';

export interface IJob extends Document {
  adminId: Types.ObjectId | string;
  jobNo: string;
  jobName: string;
  clientId: Types.ObjectId | string;
  jobDate: string;
  deliveryDate: string;
  jobTypes: JobType[];
  quantity: number;
  paperId: Types.ObjectId | string;
  paperSize: string;
  totalBWPages: number;
  totalColorPages: number;
  totalPages: number;
  plateBy: PlateBy;
  plateFrom?: string;
  plateSize?: string;
  machineId: Types.ObjectId | string;
  laminationThermal?: LaminationType;
  folding: boolean;
  binding?: BindingType;
  stitch?: StitchType;
  additional?: AdditionalService[];
  relatedToJobId?: Types.ObjectId | string;
  remarks?: string;
  specialInstructions?: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

const JobSchema = new Schema<IJob>(
  {
    ...baseSchemaFields,
    jobNo: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    jobName: {
      type: String,
      required: true,
      trim: true,
    },
    clientId: {
      type: Schema.Types.ObjectId,
      ref: 'Client',
      required: true,
    },
    jobDate: {
      type: String,
      required: true,
    },
    deliveryDate: {
      type: String,
      required: true,
    },
    jobTypes: {
      type: [String],
      enum: Object.values(JobType),
      required: true,
    },
    quantity: {
      type: Number,
      required: true,
    },
    paperId: {
      type: Schema.Types.ObjectId,
      ref: 'Paper',
      required: true,
    },
    paperSize: {
      type: String,
      required: true,
      trim: true,
    },
    totalBWPages: {
      type: Number,
      required: true,
      default: 0,
    },
    totalColorPages: {
      type: Number,
      required: true,
      default: 0,
    },
    totalPages: {
      type: Number,
      required: true,
    },
    plateBy: {
      type: String,
      enum: Object.values(PlateBy),
      required: true,
    },
    plateFrom: {
      type: String,
      trim: true,
    },
    plateSize: {
      type: String,
      trim: true,
    },
    machineId: {
      type: Schema.Types.ObjectId,
      ref: 'Equipment',
      required: true,
    },
    laminationThermal: {
      type: String,
      enum: Object.values(LaminationType),
    },
    folding: {
      type: Boolean,
      default: false,
    },
    binding: {
      type: String,
      enum: Object.values(BindingType),
    },
    stitch: {
      type: String,
      enum: Object.values(StitchType),
    },
    additional: {
      type: [String],
      enum: Object.values(AdditionalService),
    },
    relatedToJobId: {
      type: Schema.Types.ObjectId,
      ref: 'Job',
    },
    remarks: {
      type: String,
      trim: true,
    },
    specialInstructions: {
      type: String,
      trim: true,
    },
  },
  baseSchemaOptions
);

JobSchema.index({ adminId: 1 });

export default mongoose.models.Job || mongoose.model<IJob>('Job', JobSchema);
