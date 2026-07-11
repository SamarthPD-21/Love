import mongoose, { Schema, Document, Types } from "mongoose";

export interface IOpenWhenLetter extends Document {
  _id: Types.ObjectId;
  category: string;
  title: string;
  content: string;
  photos: string[];
  voiceNote?: string;
  videoUrl?: string;
  songLink?: string;
  gifUrl?: string;
  customBackground?: string;
  relationshipId: Types.ObjectId;
  userId: Types.ObjectId;
  createdAt: Date;
}

const openWhenLetterSchema = new Schema<IOpenWhenLetter>({
  category: {
    type: String,
    required: true,
    index: true,
    trim: true,
  },
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
  videoUrl: {
    type: String,
    default: "",
  },
  songLink: {
    type: String,
    default: "",
  },
  gifUrl: {
    type: String,
    default: "",
  },
  customBackground: {
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

export const OpenWhenLetter = mongoose.model<IOpenWhenLetter>(
  "OpenWhenLetter",
  openWhenLetterSchema
);
