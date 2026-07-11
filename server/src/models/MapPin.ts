import mongoose, { Schema, Document, Types } from "mongoose";

export interface IMapPin extends Document {
  _id: Types.ObjectId;
  title: string;
  description?: string;
  lat: number;
  lng: number;
  category: "visited" | "planned";
  date?: Date;
  relationshipId: Types.ObjectId;
  userId: Types.ObjectId;
  createdAt: Date;
}

const mapPinSchema = new Schema<IMapPin>({
  title: {
    type: String,
    required: true,
    trim: true,
  },
  description: {
    type: String,
    default: "",
  },
  lat: {
    type: Number,
    required: true,
  },
  lng: {
    type: Number,
    required: true,
  },
  category: {
    type: String,
    enum: ["visited", "planned"],
    default: "visited",
  },
  date: {
    type: Date,
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

export const MapPin = mongoose.model<IMapPin>("MapPin", mapPinSchema);
