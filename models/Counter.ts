import mongoose, { Schema, Document, Types } from 'mongoose';

export interface ICounter extends Document {
  adminId: Types.ObjectId | string;
  name: string;
  sequenceValue: number;
}

const CounterSchema = new Schema<ICounter>(
  {
    adminId: {
      type: Schema.Types.ObjectId,
      ref: 'Admin',
      required: true,
      index: true,
    },
    name: {
      type: String,
      required: true,
    },
    sequenceValue: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

CounterSchema.index({ adminId: 1, name: 1 }, { unique: true });

export default mongoose.models.Counter || mongoose.model<ICounter>('Counter', CounterSchema);
