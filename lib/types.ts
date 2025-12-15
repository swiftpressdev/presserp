import { Document } from 'mongoose';

export interface BaseDocument extends Document {
  adminId: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export enum UserRole {
  ADMIN = 'ADMIN',
  USER = 'USER',
}

export enum PaperType {
  REAM = 'Ream',
  PACKET = 'Packet',
  SHEET = 'Sheet',
  OTHERS = 'Others',
}

export enum JobType {
  INNER = 'Inner',
  OUTER = 'Outer',
}

export enum PlateBy {
  COMPANY = 'Company',
  CUSTOMER = 'Customer',
}

export enum LaminationType {
  MATT = 'Matt',
  GLOSS = 'Gloss',
}

export enum BindingType {
  PERFECT = 'Perfect',
  HARD = 'Hard',
}

export enum StitchType {
  SIDE = 'Side',
  CENTER = 'Center',
  OTHER = 'Other',
}

export enum AdditionalService {
  HOT_FOIL = 'Hot Foil',
  EMBOSS = 'Emboss',
  UV = 'UV',
  NUMBERING = 'Numbering',
  PERFECTING = 'Perfecting',
}
