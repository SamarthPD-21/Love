import mongoose, { Schema, Document, Types } from "mongoose";

export interface ICountdown extends Document {
  _id: Types.ObjectId;
  title: string;
  description?: string;
  targetDate: Date;
  coverImage?: string;
  relationshipId: Types.ObjectId;
  userId: Types.ObjectId;
  createdAt: Date;
}

const countdownSchema = new Schema<ICountdown>({
  title: {
    type: String,
    required: true,
    trim: true,
  },
  description: {
    type: String,
    default: "",
  },
  targetDate: {
    type: Date,
    required: true,
  },
  coverImage: {
    type: String,
    default: "",
  },
  relationshipId: {
    type: Schema.Types.ObjectId,
    ref: "Relationship",
    required: true,
    index: true,
  },
  userId: {
    type: Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

export const Countdown = mongoose.model<ICountdown>("Countdown", countdownSchema);
