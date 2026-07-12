import mongoose, { Schema, Document, Types } from "mongoose";

export interface IMemoryJarNote extends Document {
  _id: Types.ObjectId;
  content: string;
  isDrawn: boolean;
  drawnAt?: Date;
  relationshipId: Types.ObjectId;
  userId: Types.ObjectId;
  createdAt: Date;
}

const memoryJarNoteSchema = new Schema<IMemoryJarNote>({
  content: {
    type: String,
    required: true,
    trim: true,
  },
  isDrawn: {
    type: Boolean,
    default: false,
  },
  drawnAt: {
    type: Date,
    default: null,
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

export const MemoryJarNote = mongoose.model<IMemoryJarNote>("MemoryJarNote", memoryJarNoteSchema);
