import mongoose, { Document, Schema } from 'mongoose';

export type Role =
  | 'admin'
  | 'sales'
  | 'sanction'
  | 'disbursement'
  | 'collection'
  | 'borrower';

export type BreStatus = 'pending' | 'passed' | 'failed';

export type EmploymentMode =
  | 'salaried'
  | 'self-employed'
  | 'unemployed';

export interface IUser extends Document {
  // Basic account details
  name: string;
  phone: string;
  email: string;
  passwordHash: string;
  role: Role;

  // Borrower personal details
  pan?: string;
  dob?: Date;
  monthlySalary?: number;
  employmentMode?: EmploymentMode;

  // Borrower affordability details
  rentExpense?: number;
  foodExpense?: number;
  utilitiesExpense?: number;
  transportExpense?: number;
  otherHouseholdExpense?: number;
  otherCreditPayments?: number;

  // Business Rule Engine
  breStatus: BreStatus;
  breFailReason?: string;
  isProfileComplete: boolean;

  // Timestamps
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema = new Schema<IUser>(
  {
    // ─────────────────────────────────────────
    // Basic account details
    // ─────────────────────────────────────────

    name: {
      type: String,
      required: true,
      trim: true,
    },

    phone: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },

    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },

    passwordHash: {
      type: String,
      required: true,
    },

    role: {
      type: String,
      enum: [
        'admin',
        'sales',
        'sanction',
        'disbursement',
        'collection',
        'borrower',
      ],
      default: 'borrower',
    },

    // ─────────────────────────────────────────
    // Borrower personal details
    // ─────────────────────────────────────────

    pan: {
      type: String,
      uppercase: true,
      trim: true,
    },

    dob: {
      type: Date,
    },

    monthlySalary: {
      type: Number,
      min: 0,
    },

    employmentMode: {
      type: String,
      enum: [
        'salaried',
        'self-employed',
        'unemployed',
      ],
    },

    // ─────────────────────────────────────────
    // Borrower affordability details
    // ─────────────────────────────────────────

    rentExpense: {
      type: Number,
      min: 0,
      default: 0,
    },

    foodExpense: {
      type: Number,
      min: 0,
      default: 0,
    },

    utilitiesExpense: {
      type: Number,
      min: 0,
      default: 0,
    },

    transportExpense: {
      type: Number,
      min: 0,
      default: 0,
    },

    otherHouseholdExpense: {
      type: Number,
      min: 0,
      default: 0,
    },

    otherCreditPayments: {
      type: Number,
      min: 0,
      default: 0,
    },

    // ─────────────────────────────────────────
    // Business Rule Engine
    // ─────────────────────────────────────────

    breStatus: {
      type: String,
      enum: ['pending', 'passed', 'failed'],
      default: 'pending',
    },

    breFailReason: {
      type: String,
    },

    isProfileComplete: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

export default mongoose.model<IUser>('User', UserSchema);