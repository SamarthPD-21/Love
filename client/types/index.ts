/* ═══════════════════════════════════════
   Shared TypeScript types for Home
   ═══════════════════════════════════════ */

export interface User {
  _id: string;
  name: string;
  email: string;
  avatar?: string;
  partnerId?: string | User;
  relationshipId?: string | Relationship;
  createdAt: string;
}

export interface Relationship {
  _id: string;
  user1: string | User;
  user2?: string | User;
  startDate: string;
  inviteCode: string;
  status: "pending" | "active";
  createdAt: string;
}

export interface Memory {
  _id: string;
  title: string;
  photos: string[];
  videos: string[];
  location?: string;
  date: string;
  story?: string;
  mood?: string;
  tags: string[];
  albumId?: string;
  favorite: boolean;
  userId: string;
  comments: Comment[];
  createdAt: string;
}

export interface Comment {
  _id: string;
  text: string;
  userId: string;
  createdAt: string;
}

export interface Album {
  _id: string;
  name: string;
  coverImage?: string;
  description?: string;
  createdBy: string;
  memoryCount?: number;
  createdAt: string;
}

export interface Letter {
  _id: string;
  title: string;
  content: string;
  photos: string[];
  voiceNote?: string;
  songLink?: string;
  unlockType: "date" | "event" | "manual";
  unlockDate?: string;
  unlockEvent?: string;
  isUnlocked: boolean;
  userId: string;
  createdAt: string;
}

export interface OpenWhenLetter {
  _id: string;
  category: string;
  title: string;
  content: string;
  photos: string[];
  voiceNote?: string;
  videoUrl?: string;
  songLink?: string;
  gifUrl?: string;
  customBackground?: string;
  userId: string;
  createdAt: string;
}

export interface VoiceNote {
  _id: string;
  title?: string;
  audioUrl: string;
  duration: number;
  category: string;
  userId: string;
  createdAt: string;
}

export interface Countdown {
  _id: string;
  title: string;
  description?: string;
  targetDate: string;
  coverImage?: string;
  userId: string;
  createdAt: string;
}

export interface Milestone {
  _id: string;
  title: string;
  date: string;
  description?: string;
  photos: string[];
  icon?: string;
  userId: string;
  createdAt: string;
}

export interface DailyMessage {
  _id: string;
  message: string;
  scheduledDate: string;
  isRead: boolean;
  userId: string;
  createdAt: string;
}

export interface BucketListItem {
  _id: string;
  title: string;
  description?: string;
  coverImage?: string;
  status: "dreaming" | "planning" | "booked" | "completed";
  completedDate?: string;
  photos: string[];
  userId: string;
  createdAt: string;
}

export interface JournalEntry {
  _id: string;
  content: string;
  mood?: string;
  images: string[];
  voiceNote?: string;
  tags: string[];
  isPrivate: boolean;
  userId: string;
  date: string;
  createdAt: string;
}

export interface GratitudeNote {
  _id: string;
  content: string;
  userId: string;
  date: string;
  createdAt: string;
}

export interface Song {
  _id: string;
  title: string;
  artist: string;
  spotifyLink?: string;
  youtubeLink?: string;
  note?: string;
  memoryId?: string;
  addedBy: string;
  createdAt: string;
}

export interface Movie {
  _id: string;
  title: string;
  posterUrl?: string;
  status: "wishlist" | "watched";
  rating?: number;
  review?: string;
  photos: string[];
  addedBy: string;
  watchedDate?: string;
  createdAt: string;
}

export interface Achievement {
  _id: string;
  title: string;
  description: string;
  icon: string;
  isUnlocked: boolean;
  unlockedDate?: string;
  relationshipId: string;
}

export interface LocationPin {
  _id: string;
  label: string;
  lat: number;
  lng: number;
  type: "current" | "visited" | "future";
  photos: string[];
  userId: string;
  createdAt: string;
}

// Navigation
export interface NavItem {
  label: string;
  href: string;
  icon: string;
  emoji?: string;
}

// API Response
export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

// Auth
export interface LoginPayload {
  email: string;
  password: string;
}

export interface RegisterPayload {
  name: string;
  email: string;
  password: string;
  inviteCode: string;
}

export interface AuthResponse {
  user: User;
  token: string;
}
