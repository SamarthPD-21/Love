import { Router, Response } from "express";
import { authMiddleware } from "../middleware/auth";
import { Letter } from "../models/Letter";
import { VoiceNote } from "../models/VoiceNote";
import { User } from "../models/User";
import { createNotification } from "../services/notify";
import { z } from "zod";

const router = Router();

// Authenticate all routes
router.use(authMiddleware);

const letterCreateSchema = z.object({
  title: z.string().min(1, "Title is required"),
  content: z.string().min(1, "Content is required"),
  photos: z.array(z.string()).default([]),
  voiceNote: z.string().optional(),
  voiceDuration: z.number().optional(),
  songLink: z.string().optional(),
  unlockType: z.enum(["date", "event", "manual"]).default("manual"),
  unlockDate: z.string().optional().nullable().transform((val) => val ? new Date(val) : undefined),
  unlockEvent: z.string().optional(),
});

// Helper function to check and update letter unlock status
async function processLetterUnlock(letter: any) {
  if (letter.isUnlocked) return letter;

  let shouldUnlock = false;
  if (letter.unlockType === "date" && letter.unlockDate) {
    shouldUnlock = new Date() >= new Date(letter.unlockDate);
  }

  if (shouldUnlock) {
    letter.isUnlocked = true;
    await letter.save();
  }

  return letter;
}

/**
 * GET /api/letters
 * Get all letters.
 */
router.get("/", async (req: any, res: Response) => {
  try {
    const user = await User.findById(req.userId);
    if (!user || !user.relationshipId) {
      res.status(404).json({ error: "Relationship not found" });
      return;
    }

    const letters = await Letter.find({ relationshipId: user.relationshipId })
      .populate("userId", "name avatar")
      .sort({ createdAt: -1 });

    // Process unlocks for date-based letters
    const processedLetters = await Promise.all(
      letters.map(async (letter) => {
        const processed = await processLetterUnlock(letter);
        // If still locked, we redact/hide content for security/sentimentality!
        if (!processed.isUnlocked) {
          const letterObj = processed.toJSON();
          letterObj.content = "[Encrypted Letter Content. Unlocks soon! 🤫]";
          letterObj.photos = [];
          letterObj.voiceNote = "";
          letterObj.songLink = "";
          return letterObj;
        }
        return processed;
      })
    );

    res.json({ success: true, data: processedLetters });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/letters/:id
 * Get single letter details.
 */
router.get("/:id", async (req: any, res: Response) => {
  try {
    const user = await User.findById(req.userId);
    if (!user || !user.relationshipId) {
      res.status(404).json({ error: "Relationship not found" });
      return;
    }

    const foundLetter = await Letter.findOne({
      _id: req.params.id,
      relationshipId: user.relationshipId,
    }).populate("userId", "name avatar");

    if (!foundLetter) {
      res.status(404).json({ error: "Letter not found" });
      return;
    }

    const letter = await processLetterUnlock(foundLetter);

    if (!letter.isUnlocked) {
      const letterObj = letter.toJSON();
      letterObj.content = "[Encrypted Letter Content. Unlocks soon! 🤫]";
      letterObj.photos = [];
      letterObj.voiceNote = "";
      letterObj.songLink = "";
      res.json({ success: true, data: letterObj });
      return;
    }

    res.json({ success: true, data: letter });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/letters
 * Write a new letter.
 */
router.post("/", async (req: any, res: Response) => {
  try {
    const validation = letterCreateSchema.safeParse(req.body);
    if (!validation.success) {
      res.status(400).json({ error: validation.error.errors[0].message });
      return;
    }

    const user = await User.findById(req.userId);
    if (!user || !user.relationshipId) {
      res.status(404).json({ error: "Relationship not found" });
      return;
    }

    const letter = new Letter({
      title: validation.data.title,
      content: validation.data.content,
      photos: validation.data.photos,
      voiceNote: validation.data.voiceNote,
      songLink: validation.data.songLink,
      unlockType: validation.data.unlockType,
      unlockDate: validation.data.unlockDate,
      unlockEvent: validation.data.unlockEvent,
      relationshipId: user.relationshipId,
      userId: user._id,
      isUnlocked: false,
    });
    await letter.save();

    // If a voiceNote is attached, also save it as a standalone VoiceNote document
    if (validation.data.voiceNote) {
      const voiceNote = new VoiceNote({
        title: `Voice attachment in letter: "${letter.title}"`,
        audioUrl: validation.data.voiceNote,
        duration: validation.data.voiceDuration || 0,
        category: "Love", // default category for letters
        relationshipId: user.relationshipId,
        userId: user._id,
        letterId: letter._id,
      });
      await voiceNote.save();
    }

    createNotification({
      actorId: user._id.toString(),
      type: "letter_created",
      entityType: "Letter",
      entityId: letter._id.toString(),
      meta: { detail: letter.title },
    });

    res.status(201).json({ success: true, data: letter });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/letters/:id/unlock
 * Manually unlock a letter.
 */
router.post("/:id/unlock", async (req: any, res: Response) => {
  try {
    const user = await User.findById(req.userId);
    if (!user || !user.relationshipId) {
      res.status(404).json({ error: "Relationship not found" });
      return;
    }

    const letter = await Letter.findOne({
      _id: req.params.id,
      relationshipId: user.relationshipId,
    });

    if (!letter) {
      res.status(404).json({ error: "Letter not found" });
      return;
    }

    letter.isUnlocked = true;
    await letter.save();

    createNotification({
      actorId: user._id.toString(),
      type: "letter_unlocked",
      entityType: "Letter",
      entityId: letter._id.toString(),
      meta: { detail: letter.title },
    });

    res.json({ success: true, data: letter });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * PUT /api/letters/:id
 * Edit letter.
 */
router.put("/:id", async (req: any, res: Response) => {
  try {
    const validation = letterCreateSchema.partial().safeParse(req.body);
    if (!validation.success) {
      res.status(400).json({ error: validation.error.errors[0].message });
      return;
    }

    const user = await User.findById(req.userId);
    if (!user || !user.relationshipId) {
      res.status(404).json({ error: "Relationship not found" });
      return;
    }

    const letter = await Letter.findOneAndUpdate(
      { _id: req.params.id, relationshipId: user.relationshipId },
      { $set: validation.data },
      { new: true }
    );

    if (!letter) {
      res.status(404).json({ error: "Letter not found" });
      return;
    }

    res.json({ success: true, data: letter });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * DELETE /api/letters/:id
 * Delete letter.
 */
router.delete("/:id", async (req: any, res: Response) => {
  try {
    const user = await User.findById(req.userId);
    if (!user || !user.relationshipId) {
      res.status(404).json({ error: "Relationship not found" });
      return;
    }

    const letter = await Letter.findOneAndDelete({
      _id: req.params.id,
      relationshipId: user.relationshipId,
    });

    if (!letter) {
      res.status(404).json({ error: "Letter not found" });
      return;
    }

    createNotification({
      actorId: user._id.toString(),
      type: "letter_deleted",
      entityType: "Letter",
      meta: { detail: letter.title },
    });

    res.json({ success: true, message: "Letter deleted successfully" });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
