import mongoose, { Schema, Document, Types } from "mongoose";

export interface IAlbum extends Document {
  _id: Types.ObjectId;
  name: string;
  coverImage?: string;
  description?: string;
  relationshipId: Types.ObjectId;
  createdBy: Types.ObjectId;
  createdAt: Date;
}

const albumSchema = new Schema<IAlbum>({
  name: {
    type: String,
    required: true,
    trim: true,
  },
  coverImage: {
    type: String,
    default: "",
  },
  description: {
    type: String,
    default: "",
  },
  relationshipId: {
    type: Schema.Types.ObjectId,
    ref: "Relationship",
    required: true,
    index: true,
  },
  createdBy: {
    type: Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

export const Album = mongoose.model<IAlbum>("Album", albumSchema);
