import mongoose, { Schema, Document, Types } from "mongoose";

export interface IJournal extends Document {
  _id: Types.ObjectId;
  title: string;
  content: string;
  mood: "loved" | "cozy" | "happy" | "excited" | "thoughtful";
  relationshipId: Types.ObjectId;
  userId: Types.ObjectId;
  createdAt: Date;
}

const journalSchema = new Schema<IJournal>({
  title: {
    type: String,
    required: true,
    trim: true,
  },
  content: {
    type: String,
    required: true,
  },
  mood: {
    type: String,
    enum: ["loved", "cozy", "happy", "excited", "thoughtful"],
    default: "cozy",
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

export const Journal = mongoose.model<IJournal>("Journal", journalSchema);
