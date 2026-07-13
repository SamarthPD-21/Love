import mongoose, { Schema, Document, Types } from "mongoose";

/**
 * Notification types fired across the app.
 * Keep these in sync with the copy map in src/services/notify.ts.
 */
export const NOTIFICATION_TYPES = [
  "letter_created",
  "letter_deleted",
  "letter_unlocked",
  "memory_created",
  "memory_deleted",
  "memory_commented",
  "voice_created",
  "jar_note_created",
  "hug_sent",
  "countdown_created",
  "gratitude_added",
  "milestone_added",
  "song_added",
  "map_pin_added",
  "profile_updated",
  "movie_added",
] as const;

export type NotificationType = (typeof NOTIFICATION_TYPES)[number];

export interface INotification extends Document {
  _id: Types.ObjectId;
  relationshipId: Types.ObjectId;
  actorUserId: Types.ObjectId;
  recipientUserId: Types.ObjectId;
  type: NotificationType;
  entityType: string;
  entityId?: Types.ObjectId;
  title: string;
  emoji: string;
  isRead: boolean;
  createdAt: Date;
}

const notificationSchema = new Schema<INotification>({
  relationshipId: {
    type: Schema.Types.ObjectId,
    ref: "Relationship",
    required: true,
    index: true,
  },
  actorUserId: {
    type: Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  recipientUserId: {
    type: Schema.Types.ObjectId,
    ref: "User",
    required: true,
    index: true,
  },
  type: {
    type: String,
    enum: NOTIFICATION_TYPES,
    required: true,
  },
  entityType: {
    type: String,
    default: "",
  },
  entityId: {
    type: Schema.Types.ObjectId,
    default: undefined,
  },
  title: {
    type: String,
    required: true,
    trim: true,
  },
  emoji: {
    type: String,
    default: "💖",
  },
  isRead: {
    type: Boolean,
    default: false,
    index: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

// Compound index for fast "unread for this recipient" queries.
notificationSchema.index({ recipientUserId: 1, isRead: 1, createdAt: -1 });

export const Notification = mongoose.model<INotification>(
  "Notification",
  notificationSchema
);
