import mongoose, { Schema, Document, Types } from "mongoose";

export interface IMilestone extends Document {
  _id: Types.ObjectId;
  title: string;
  date: Date;
  description?: string;
  photos: string[];
  icon?: string; // e.g. "heart", "plane", "gift"
  relationshipId: Types.ObjectId;
  userId: Types.ObjectId;
  createdAt: Date;
}

const milestoneSchema = new Schema<IMilestone>({
  title: {
    type: String,
    required: true,
    trim: true,
  },
  date: {
    type: Date,
    required: true,
  },
  description: {
    type: String,
    default: "",
  },
  photos: {
    type: [String],
    default: [],
  },
  icon: {
    type: String,
    default: "heart",
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

export const Milestone = mongoose.model<IMilestone>("Milestone", milestoneSchema);
