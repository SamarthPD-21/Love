import mongoose, { Schema, Document, Types } from "mongoose";

export interface ILetter extends Document {
  _id: Types.ObjectId;
  title: string;
  content: string;
  photos: string[];
  voiceNote?: string;
  songLink?: string;
  unlockType: "date" | "event" | "manual";
  unlockDate?: Date;
  unlockEvent?: string; // e.g. "Graduation", "Anniversary"
  isUnlocked: boolean;
  relationshipId: Types.ObjectId;
  userId: Types.ObjectId;
  createdAt: Date;
}

const letterSchema = new Schema<ILetter>({
  title: {
    type: String,
    required: true,
    trim: true,
  },
  content: {
    type: String,
    required: true,
  },
  photos: {
    type: [String],
    default: [],
  },
  voiceNote: {
    type: String,
    default: "",
  },
  songLink: {
    type: String,
    default: "",
  },
  unlockType: {
    type: String,
    enum: ["date", "event", "manual"],
    default: "manual",
  },
  unlockDate: {
    type: Date,
    default: undefined,
  },
  unlockEvent: {
    type: String,
    default: "",
  },
  isUnlocked: {
    type: Boolean,
    default: false,
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

export const Letter = mongoose.model<ILetter>("Letter", letterSchema);
