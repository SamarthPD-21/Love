import mongoose, { Schema, Document, Types } from "mongoose";

export interface IGratitude extends Document {
  _id: Types.ObjectId;
  content: string;
  likes: Types.ObjectId[]; // User IDs who liked the gratitude note
  relationshipId: Types.ObjectId;
  userId: Types.ObjectId;
  createdAt: Date;
}

const gratitudeSchema = new Schema<IGratitude>({
  content: {
    type: String,
    required: true,
    trim: true,
  },
  likes: {
    type: [Schema.Types.ObjectId],
    ref: "User",
    default: [],
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

export const Gratitude = mongoose.model<IGratitude>("Gratitude", gratitudeSchema);
