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
  OTHER = 'Other',
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

export enum EquipmentStatus {
  OPERATIONAL = 'Operational',
  UNDER_MAINTENANCE = 'Under Maintenance',
  OUT_OF_SERVICE = 'Out of Service',
  REPAIR = 'Repair',
}

export enum PlateFarmaType {
  PAGE_32 = '32 Page',
  PAGE_16 = '16 Page',
  PAGE_8 = '8 Page',
  PAGE_4 = '4 Page',
  PAGE_2 = '2 Page',
  OTHER = 'Other',
}

export enum PlateSizeType {
  SIZE_615x740 = '615x740',
  SIZE_550x650 = '550x650',
  SIZE_530x650 = '530x650',
  OTHER = 'Other',
}

export enum NormalType {
  MATT = 'Matt',
  GLOSS = 'Gloss',
}

export enum PageColorType {
  SINGLE_COLOR = 'Single Color',
  TWO_COLOR = '2 Color',
  THREE_COLOR = '3 Color',
  FOUR_COLOR = '4 Color',
  OTHER = 'Other',
}

export enum BookSizeType {
  SIZE_14x21 = '14x21',
  SIZE_18x24 = '18x24',
  SIZE_13x20 = '13x20',
  A4 = 'A4',
  OTHER = 'Other',
}
