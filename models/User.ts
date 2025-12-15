import mongoose, { Schema, Document, Types } from 'mongoose';
import { UserRole } from '@/lib/types';
import { baseSchemaFields, baseSchemaOptions } from '@/lib/baseSchema';

export interface IUser extends Document {
  adminId: Types.ObjectId | string;
  name: string;
  email: string;
  password: string;
  role: UserRole.USER;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema = new Schema<IUser>(
  {
    ...baseSchemaFields,
    name: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    password: {
      type: String,
      required: true,
    },
    role: {
      type: String,
      enum: [UserRole.USER],
      default: UserRole.USER,
      required: true,
    },
  },
  baseSchemaOptions
);

UserSchema.index({ adminId: 1, email: 1 }, { unique: true });

export default mongoose.models.User || mongoose.model<IUser>('User', UserSchema);
