import mongoose, { Schema, Document, Types } from "mongoose";

export interface IMemoryJarNote extends Document {
  _id: Types.ObjectId;
  content: string;
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
