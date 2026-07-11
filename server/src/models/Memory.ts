import mongoose, { Schema, Document, Types } from "mongoose";

interface IComment {
  _id: Types.ObjectId;
  text: string;
  userId: Types.ObjectId;
  createdAt: Date;
}

export interface IMemory extends Document {
  _id: Types.ObjectId;
  title: string;
  photos: string[];
  videos: string[];
  location?: string;
  date: Date;
  story?: string;
  mood?: string;
  tags: string[];
  albumId?: Types.ObjectId;
  favorite: boolean;
  relationshipId: Types.ObjectId;
  userId: Types.ObjectId;
  comments: IComment[];
  createdAt: Date;
}

const commentSchema = new Schema<IComment>({
  text: {
    type: String,
    required: true,
    trim: true,
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

const memorySchema = new Schema<IMemory>({
  title: {
    type: String,
    required: true,
    trim: true,
  },
  photos: {
    type: [String],
    default: [],
  },
  videos: {
    type: [String],
    default: [],
  },
  location: {
    type: String,
    default: "",
  },
  date: {
    type: Date,
    required: true,
  },
  story: {
    type: String,
    default: "",
  },
  mood: {
    type: String,
    default: "",
  },
  tags: {
    type: [String],
    default: [],
  },
  albumId: {
    type: Schema.Types.ObjectId,
    ref: "Album",
    default: undefined,
  },
  favorite: {
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
  comments: {
    type: [commentSchema],
    default: [],
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

export const Memory = mongoose.model<IMemory>("Memory", memorySchema);
