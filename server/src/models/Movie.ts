import mongoose, { Schema, Document, Types } from "mongoose";

export interface IMovie extends Document {
  _id: Types.ObjectId;
  title: string;
  type: "movie" | "show";
  status: "watchlist" | "watched";
  rating?: number; // 1-5
  review?: string;
  watchLink?: string;
  posterUrl?: string;
  relationshipId: Types.ObjectId;
  userId: Types.ObjectId;
  createdAt: Date;
}

const movieSchema = new Schema<IMovie>({
  title: {
    type: String,
    required: true,
    trim: true,
  },
  type: {
    type: String,
    enum: ["movie", "show"],
    default: "movie",
  },
  status: {
    type: String,
    enum: ["watchlist", "watched"],
    default: "watchlist",
  },
  rating: {
    type: Number,
    min: 1,
    max: 5,
  },
  review: {
    type: String,
    default: "",
  },
  watchLink: {
    type: String,
    trim: true,
  },
  posterUrl: {
    type: String,
    trim: true,
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

export const Movie = mongoose.model<IMovie>("Movie", movieSchema);
