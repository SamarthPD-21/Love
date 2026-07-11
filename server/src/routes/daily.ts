import { Router, Response } from "express";
import { authMiddleware } from "../middleware/auth";
import { DailyMessage } from "../models/DailyMessage";
import { Memory } from "../models/Memory";
import { Letter } from "../models/Letter";
import { VoiceNote } from "../models/VoiceNote";
import { User } from "../models/User";
import { z } from "zod";

const router = Router();

// Authenticate all routes
router.use(authMiddleware);

const dailyMessageSchema = z.object({
  message: z.string().min(1, "Message content is required"),
  scheduledDate: z.string().transform((val) => {
    const d = new Date(val);
    d.setHours(0, 0, 0, 0); // standardize date key
    return d;
  }),
});

/**
 * GET /api/daily/message
 * Get today's message.
 */
router.get("/message", async (req: any, res: Response) => {
  try {
    const user = await User.findById(req.userId);
    if (!user || !user.relationshipId) {
      res.status(404).json({ error: "Relationship not found" });
      return;
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const message = await DailyMessage.findOne({
      relationshipId: user.relationshipId,
      scheduledDate: today,
    }).populate("userId", "name avatar");

    if (!message) {
      // Fallback message if none scheduled
      res.json({
        success: true,
        data: {
          message: "You're the best part of every single day. Never forget that. ❤️",
          isFallback: true,
        },
      });
      return;
    }

    res.json({ success: true, data: message });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/daily/message
 * Schedule/set daily message.
 */
router.post("/message", async (req: any, res: Response) => {
  try {
    const validation = dailyMessageSchema.safeParse(req.body);
    if (!validation.success) {
      res.status(400).json({ error: validation.error.errors[0].message });
      return;
    }

    const user = await User.findById(req.userId);
    if (!user || !user.relationshipId) {
      res.status(404).json({ error: "Relationship not found" });
      return;
    }

    // Upsert the message for that date (only one message per day per relationship)
    const { message, scheduledDate } = validation.data;

    const msg = await DailyMessage.findOneAndUpdate(
      { relationshipId: user.relationshipId, scheduledDate },
      {
        message,
        userId: user._id,
        scheduledDate,
      },
      { upsert: true, new: true }
    );

    res.status(201).json({ success: true, data: msg });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/daily/surprise
 * Get today's daily surprise. Rotates daily based on day of year.
 */
router.get("/surprise", async (req: any, res: Response) => {
  try {
    const user = await User.findById(req.userId);
    if (!user || !user.relationshipId) {
      res.status(404).json({ error: "Relationship not found" });
      return;
    }

    // Fetch pool of surprise elements:
    // 1. Memories
    const memories = await Memory.find({ relationshipId: user.relationshipId }).select("title photos story date");
    // 2. Unlocked Letters
    const letters = await Letter.find({ relationshipId: user.relationshipId, isUnlocked: true }).select("title content");
    // 3. Voice Notes
    const voiceNotes = await VoiceNote.find({ relationshipId: user.relationshipId }).select("title category audioUrl duration");

    // Map them to unified surprise items
    const surprisePool: any[] = [];

    memories.forEach((m) => {
      surprisePool.push({
        type: "memory",
        title: `Memory of the Day: ${m.title}`,
        detail: m.story || "A beautiful memory you shared.",
        media: m.photos?.[0] || "",
        link: `/memories/${m._id}`,
      });
    });

    letters.forEach((l) => {
      surprisePool.push({
        type: "letter",
        title: `A Hidden Letter: ${l.title}`,
        detail: l.content.slice(0, 100) + "...",
        link: `/letters/${l._id}`,
      });
    });

    voiceNotes.forEach((vn) => {
      surprisePool.push({
        type: "voice",
        title: `Voice Whisper: ${vn.title || vn.category}`,
        detail: `A voice note recorded for you (${Math.round(vn.duration)}s).`,
        media: vn.audioUrl,
        link: `/voice-notes`,
      });
    });

    if (surprisePool.length === 0) {
      res.json({
        success: true,
        data: {
          type: "quote",
          title: "Today's Quote",
          detail: "Home is wherever I am with you.",
          link: "/",
        },
      });
      return;
    }

    // Get stable index based on day of year
    const now = new Date();
    const start = new Date(now.getFullYear(), 0, 0);
    const diff = now.getTime() - start.getTime();
    const oneDay = 1000 * 60 * 60 * 24;
    const dayOfYear = Math.floor(diff / oneDay);

    const surprise = surprisePool[dayOfYear % surprisePool.length];

    res.json({ success: true, data: surprise });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
