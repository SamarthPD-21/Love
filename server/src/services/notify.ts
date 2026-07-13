import { Notification, INotification, NotificationType } from "../models/Notification";
import { User } from "../models/User";
import { emitToUser } from "../sockets";

interface CreateNotificationInput {
  actorId: string;
  type: NotificationType;
  entityType?: string;
  entityId?: string;
  /**
   * Optional free-form data used to render the title (e.g. a letter title).
   * Falls back to the friendly copy below when not provided.
   */
  meta?: Record<string, string>;
}

/**
 * Warm, playful copy per notification type.
 * `{name}` is substituted with the actor's first name.
 * `{detail}` is substituted with meta.detail when present.
 */
const COPY: Record<NotificationType, { emoji: string; text: string }> = {
  letter_created: { emoji: "💌", text: "{name} wrote you a new letter!" },
  letter_deleted: { emoji: "🗑️", text: "{name} removed a letter." },
  letter_unlocked: { emoji: "🔓", text: "{name} unlocked a letter for you!" },
  memory_created: { emoji: "📸", text: "{name} added a new memory{detail}." },
  memory_deleted: { emoji: "🗑️", text: "{name} removed a memory." },
  memory_commented: { emoji: "💬", text: "{name} commented on a memory." },
  voice_created: { emoji: "🎙️", text: "{name} left you a voice note!" },
  jar_note_created: { emoji: "🫙", text: "{name} dropped a note in the memory jar ✨" },
  hug_sent: { emoji: "🫂", text: "{name} sent you a big squeeze! 💕" },
  countdown_created: { emoji: "⏰", text: "{name} added a new countdown{detail}." },
  gratitude_added: { emoji: "🙏", text: "{name} shared something they're grateful for." },
  milestone_added: { emoji: "🏆", text: "{name} added a milestone to your timeline!" },
  song_added: { emoji: "🎵", text: "{name} added a new song to the lounge!" },
  map_pin_added: { emoji: "📍", text: "{name} pinned a new place on the map!" },
  profile_updated: { emoji: "✨", text: "{name} refreshed their profile." },
  movie_added: { emoji: "🎬", text: "{name} added a movie to the watchlist!" },
};

/**
 * Notification types considered "big" / celebratory on the client.
 * Kept here so the wire format stays the single source of truth.
 */
const CELEBRATION_TYPES: NotificationType[] = [
  "hug_sent",
  "letter_unlocked",
  "milestone_added",
  "jar_note_created",
];

function renderTitle(text: string, firstName: string, detail?: string): string {
  return text
    .replace("{name}", firstName)
    .replace(
      "{detail}",
      detail ? `: "${detail.slice(0, 40)}${detail.length > 40 ? "…" : ""}"` : ""
    );
}

/**
 * Create a notification for the actor's partner and push it in real time.
 * Fully non-fatal: any error is logged and swallowed so it never breaks
 * the originating request.
 */
function incrementTitleCount(currentTitle: string): string {
  const regex = /\(x(\d+)\)$/;
  const match = currentTitle.match(regex);
  if (match) {
    const count = parseInt(match[1], 10);
    return currentTitle.replace(regex, `(x${count + 1})`);
  }
  return `${currentTitle} (x2)`;
}

const COALESCE_TYPES: NotificationType[] = ["hug_sent", "profile_updated"];

export async function createNotification(
  input: CreateNotificationInput
): Promise<INotification | null> {
  try {
    const actor = await User.findById(input.actorId).select("name partnerId relationshipId");
    if (!actor || !actor.partnerId || !actor.relationshipId) {
      // No partner to notify — silently no-op.
      return null;
    }

    // Never notify yourself (safety net).
    if (actor.partnerId.toString() === actor._id.toString()) {
      return null;
    }

    const copy = COPY[input.type] ?? { emoji: "💖", text: "{name} did something sweet." };
    const firstName = actor.name?.split(" ")[0] || "Your partner";
    const title = renderTitle(copy.text, firstName, input.meta?.detail);

    let notification: INotification | null = null;

    if (COALESCE_TYPES.includes(input.type)) {
      const existing = await Notification.findOne({
        recipientUserId: actor.partnerId,
        actorUserId: actor._id,
        type: input.type,
        isRead: false,
        entityId: input.entityId || undefined,
      });

      if (existing) {
        existing.title = incrementTitleCount(existing.title);
        existing.createdAt = new Date();
        existing.isRead = false;
        notification = await existing.save();
      }
    }

    if (!notification) {
      notification = await Notification.create({
        relationshipId: actor.relationshipId,
        actorUserId: actor._id,
        recipientUserId: actor.partnerId,
        type: input.type,
        entityType: input.entityType || "",
        entityId: input.entityId || undefined,
        title,
        emoji: copy.emoji,
        isRead: false,
      });
    }

    // Push to the partner in real time. Include a flag so the client
    // knows whether to fire the confetti.
    emitToUser(actor.partnerId.toString(), "notification", {
      ...notification.toJSON(),
      isCelebration: CELEBRATION_TYPES.includes(input.type),
    });

    return notification;
  } catch (err) {
    console.warn("createNotification failed:", err);
    return null;
  }
}
