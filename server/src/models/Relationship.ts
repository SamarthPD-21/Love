import mongoose, { Schema, Document, Types } from "mongoose";

export interface IRelationship extends Document {
  _id: Types.ObjectId;
  user1: Types.ObjectId;
  user2?: Types.ObjectId;
  startDate: Date;
  inviteCode: string;
  status: "pending" | "active";
  hugs: Map<string, number>;
  createdAt: Date;
}

const relationshipSchema = new Schema<IRelationship>({
  user1: {
    type: Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  user2: {
    type: Schema.Types.ObjectId,
    ref: "User",
    default: undefined,
  },
  startDate: {
    type: Date,
    default: Date.now,
  },
  inviteCode: {
    type: String,
    required: true,
    unique: true,
  },
  status: {
    type: String,
    enum: ["pending", "active"],
    default: "pending",
  },
  hugs: {
    type: Map,
    of: Number,
    default: {},
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

export const Relationship = mongoose.model<IRelationship>(
  "Relationship",
  relationshipSchema
);
