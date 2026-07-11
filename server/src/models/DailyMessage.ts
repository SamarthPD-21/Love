import mongoose, { Schema, Document, Types } from "mongoose";

export interface IDailyMessage extends Document {
  _id: Types.ObjectId;
  message: string;
  scheduledDate: Date; // date for which the message is scheduled
  relationshipId: Types.ObjectId;
  userId: Types.ObjectId;
  createdAt: Date;
}

const dailyMessageSchema = new Schema<IDailyMessage>({
  message: {
    type: String,
    required: true,
    trim: true,
  },
  scheduledDate: {
    type: Date,
    required: true,
    index: true,
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

export const DailyMessage = mongoose.model<IDailyMessage>("DailyMessage", dailyMessageSchema);
