import { Router, Response } from "express";
import { authMiddleware } from "../middleware/auth";
import { VoiceNote } from "../models/VoiceNote";
import { User } from "../models/User";
import { createNotification } from "../services/notify";
import { z } from "zod";

const router = Router();

// Authenticate all routes
router.use(authMiddleware);

const voiceNoteSchema = z.object({
  title: z.string().optional(),
  audioUrl: z.string().min(1, "Audio URL is required"),
  duration: z.number().min(1, "Duration must be positive"),
  category: z.string().min(1, "Category is required"),
  letterId: z.string().optional().nullable(),
  openWhenLetterId: z.string().optional().nullable(),
});

/**
 * GET /api/voice-notes
 * Get all voice notes for the relationship, option to filter by category.
 */
router.get("/", async (req: any, res: Response) => {
  try {
    const user = await User.findById(req.userId);
    if (!user || !user.relationshipId) {
      res.status(404).json({ error: "Relationship not found" });
      return;
    }

    const { category } = req.query;
    const filter: any = { relationshipId: user.relationshipId };
    if (category) {
      filter.category = category;
    }

    const voiceNotes = await VoiceNote.find(filter)
      .populate("userId", "name avatar")
      .populate("letterId", "title")
      .populate("openWhenLetterId", "title")
      .sort({ createdAt: -1 });

    res.json({ success: true, data: voiceNotes });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/voice-notes
 * Save a new voice note.
 */
router.post("/", async (req: any, res: Response) => {
  try {
    const validation = voiceNoteSchema.safeParse(req.body);
    if (!validation.success) {
      res.status(400).json({ error: validation.error.errors[0].message });
      return;
    }

    const user = await User.findById(req.userId);
    if (!user || !user.relationshipId) {
      res.status(404).json({ error: "Relationship not found" });
      return;
    }

    const voiceNote = new VoiceNote({
      ...validation.data,
      relationshipId: user.relationshipId,
      userId: user._id,
    });

    await voiceNote.save();

    createNotification({
      actorId: user._id.toString(),
      type: "voice_created",
      entityType: "VoiceNote",
      entityId: voiceNote._id.toString(),
    });

    res.status(201).json({ success: true, data: voiceNote });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * DELETE /api/voice-notes/:id
 * Delete voice note.
 */
router.delete("/:id", async (req: any, res: Response) => {
  try {
    const user = await User.findById(req.userId);
    if (!user || !user.relationshipId) {
      res.status(404).json({ error: "Relationship not found" });
      return;
    }

    const voiceNote = await VoiceNote.findOneAndDelete({
      _id: req.params.id,
      relationshipId: user.relationshipId,
    });

    if (!voiceNote) {
      res.status(404).json({ error: "Voice note not found" });
      return;
    }

    res.json({ success: true, message: "Voice note deleted successfully" });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
