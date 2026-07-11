import mongoose, { Schema, Document, Types } from "mongoose";

export interface IDream extends Document {
  _id: Types.ObjectId;
  title: string;
  description?: string;
  category: "travel" | "fun" | "house" | "career" | "general";
  isCompleted: boolean;
  targetDate?: Date;
  relationshipId: Types.ObjectId;
  userId: Types.ObjectId;
  createdAt: Date;
}

const dreamSchema = new Schema<IDream>({
  title: {
    type: String,
    required: true,
    trim: true,
  },
  description: {
    type: String,
    default: "",
  },
  category: {
    type: String,
    enum: ["travel", "fun", "house", "career", "general"],
    default: "general",
  },
  isCompleted: {
    type: Boolean,
    default: false,
  },
  targetDate: {
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

export const Dream = mongoose.model<IDream>("Dream", dreamSchema);
