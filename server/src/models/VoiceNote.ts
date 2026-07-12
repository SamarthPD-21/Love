import mongoose, { Schema, Document, Types } from "mongoose";

export interface IVoiceNote extends Document {
  _id: Types.ObjectId;
  title?: string;
  audioUrl: string;
  duration: number; // in seconds
  category: string; // Morning, Night, Comfort, Motivation, Love, Funny, Sleep, etc.
  relationshipId: Types.ObjectId;
  userId: Types.ObjectId;
  letterId?: Types.ObjectId;
  openWhenLetterId?: Types.ObjectId;
  createdAt: Date;
}

const voiceNoteSchema = new Schema<IVoiceNote>({
  title: {
    type: String,
    default: "",
    trim: true,
  },
  audioUrl: {
    type: String,
    required: true,
  },
  duration: {
    type: Number,
    required: true,
  },
  category: {
    type: String,
    required: true,
    index: true,
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
  letterId: {
    type: Schema.Types.ObjectId,
    ref: "Letter",
    default: null,
  },
  openWhenLetterId: {
    type: Schema.Types.ObjectId,
    ref: "OpenWhenLetter",
    default: null,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

export const VoiceNote = mongoose.model<IVoiceNote>("VoiceNote", voiceNoteSchema);
