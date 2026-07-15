import mongoose, { Schema, Document, Types } from "mongoose";

export interface ISong extends Document {
  _id: Types.ObjectId;
  title: string;
  artist: string;
  url: string; // fallback or primary link
  spotifyUrl?: string;
  youtubeUrl?: string;
  notes?: string;
  youtubeVideoId?: string;
  relationshipId: Types.ObjectId;
  userId: Types.ObjectId;
  createdAt: Date;
}

const songSchema = new Schema<ISong>({
  title: {
    type: String,
    required: true,
    trim: true,
  },
  artist: {
    type: String,
    required: true,
    trim: true,
  },
  url: {
    type: String,
    required: true,
    trim: true,
  },
  spotifyUrl: {
    type: String,
    default: "",
  },
  youtubeUrl: {
    type: String,
    default: "",
  },
  notes: {
    type: String,
    default: "",
  },
  youtubeVideoId: {
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

export const Song = mongoose.model<ISong>("Song", songSchema);
