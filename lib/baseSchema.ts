import { Schema } from 'mongoose';

export const baseSchemaFields = {
  adminId: {
    type: Schema.Types.ObjectId,
    ref: 'Admin',
    required: true,
  },
  createdBy: {
    type: String,
    required: true,
  },
};

export const baseSchemaOptions = {
  timestamps: true,
};
