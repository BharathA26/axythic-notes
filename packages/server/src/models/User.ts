import mongoose, { Document, Schema } from 'mongoose';

export type UserRole = 'admin' | 'user';

export interface IUser extends Document {
  firebaseUid: string;
  email: string;
  displayName: string;
  photoURL?: string;
  role: UserRole;
  isActive: boolean;
  lastLogin: Date;
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema = new Schema<IUser>(
  {
    firebaseUid: { type: String, required: true, unique: true, index: true },
    email:       { type: String, required: true, unique: true },
    displayName: { type: String, required: true },
    photoURL:    { type: String, default: '' },
    role:        { type: String, enum: ['admin', 'user'], default: 'user' },
    isActive:    { type: Boolean, default: true },
    lastLogin:   { type: Date, default: Date.now },
  },
  { timestamps: true }
);

export const User = mongoose.model<IUser>('User', UserSchema);
