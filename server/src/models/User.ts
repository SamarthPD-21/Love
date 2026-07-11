import mongoose, { Schema, Document, Types } from "mongoose";
import bcrypt from "bcryptjs";

export interface IUser extends Document {
  _id: Types.ObjectId;
  name: string;
  email: string;
  passwordHash: string;
  avatar: string;
  partnerId?: Types.ObjectId;
  relationshipId?: Types.ObjectId;
  createdAt: Date;
  comparePassword(candidatePassword: string): Promise<boolean>;
}

const userSchema = new Schema<IUser>({
  name: {
    type: String,
    required: true,
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
  avatar: {
    type: String,
    default: "",
  },
  partnerId: {
    type: Schema.Types.ObjectId,
    ref: "User",
    default: undefined,
  },
  relationshipId: {
    type: Schema.Types.ObjectId,
    ref: "Relationship",
    default: undefined,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

userSchema.methods.comparePassword = async function (
  candidatePassword: string
): Promise<boolean> {
  return bcrypt.compare(candidatePassword, this.passwordHash);
};

// Don't return passwordHash in JSON
userSchema.set("toJSON", {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  transform(_doc: any, ret: any) {
    delete ret.passwordHash;
    delete ret.__v;
    return ret;
  },
});

export const User = mongoose.model<IUser>("User", userSchema);
