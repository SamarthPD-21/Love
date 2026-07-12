import { Router, Response } from "express";
import { authMiddleware } from "../middleware/auth";
import { OpenWhenLetter } from "../models/OpenWhenLetter";
import { VoiceNote } from "../models/VoiceNote";
import { User } from "../models/User";
import { z } from "zod";

const router = Router();

// Authenticate all routes
router.use(authMiddleware);

const openWhenLetterSchema = z.object({
  category: z.string().min(1, "Category is required"),
  title: z.string().min(1, "Title is required"),
  content: z.string().min(1, "Content is required"),
  photos: z.array(z.string()).default([]),
  voiceNote: z.string().optional(),
  voiceDuration: z.number().optional(),
  videoUrl: z.string().optional(),
  songLink: z.string().optional(),
  gifUrl: z.string().optional(),
  customBackground: z.string().optional(),
});

/**
 * GET /api/open-when
 * Get all Open When letters.
 */
router.get("/", async (req: any, res: Response) => {
  try {
    const user = await User.findById(req.userId);
    if (!user || !user.relationshipId) {
      res.status(404).json({ error: "Relationship not found" });
      return;
    }

    const letters = await OpenWhenLetter.find({ relationshipId: user.relationshipId })
      .populate("userId", "name avatar")
      .sort({ createdAt: -1 });

    res.json({ success: true, data: letters });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/open-when/category/:category
 * Get letters in a specific category.
 */
router.get("/category/:category", async (req: any, res: Response) => {
  try {
    const user = await User.findById(req.userId);
    if (!user || !user.relationshipId) {
      res.status(404).json({ error: "Relationship not found" });
      return;
    }

    const letters = await OpenWhenLetter.find({
      relationshipId: user.relationshipId,
      category: req.params.category,
    })
      .populate("userId", "name avatar")
      .sort({ createdAt: -1 });

    res.json({ success: true, data: letters });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/open-when/:id
 * Get single Open When letter details.
 */
router.get("/:id", async (req: any, res: Response) => {
  try {
    const user = await User.findById(req.userId);
    if (!user || !user.relationshipId) {
      res.status(404).json({ error: "Relationship not found" });
      return;
    }

    const letter = await OpenWhenLetter.findOne({
      _id: req.params.id,
      relationshipId: user.relationshipId,
    }).populate("userId", "name avatar");

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
 * POST /api/open-when
 * Create an Open When letter.
 */
router.post("/", async (req: any, res: Response) => {
  try {
    const validation = openWhenLetterSchema.safeParse(req.body);
    if (!validation.success) {
      res.status(400).json({ error: validation.error.errors[0].message });
      return;
    }

    const user = await User.findById(req.userId);
    if (!user || !user.relationshipId) {
      res.status(404).json({ error: "Relationship not found" });
      return;
    }

    const letter = new OpenWhenLetter({
      ...validation.data,
      relationshipId: user.relationshipId,
      userId: user._id,
    });

    await letter.save();

    // If a voiceNote is attached, also save it as a standalone VoiceNote document
    if (validation.data.voiceNote) {
      const voiceNote = new VoiceNote({
        title: `Voice attachment in open-when letter: "${letter.title}"`,
        audioUrl: validation.data.voiceNote,
        duration: validation.data.voiceDuration || 0,
        category: letter.category || "Comfort",
        relationshipId: user.relationshipId,
        userId: user._id,
        openWhenLetterId: letter._id,
      });
      await voiceNote.save();
    }

    res.status(201).json({ success: true, data: letter });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * PUT /api/open-when/:id
 * Update Open When letter.
 */
router.put("/:id", async (req: any, res: Response) => {
  try {
    const validation = openWhenLetterSchema.partial().safeParse(req.body);
    if (!validation.success) {
      res.status(400).json({ error: validation.error.errors[0].message });
      return;
    }

    const user = await User.findById(req.userId);
    if (!user || !user.relationshipId) {
      res.status(404).json({ error: "Relationship not found" });
      return;
    }

    const letter = await OpenWhenLetter.findOneAndUpdate(
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
 * DELETE /api/open-when/:id
 * Delete Open When letter.
 */
router.delete("/:id", async (req: any, res: Response) => {
  try {
    const user = await User.findById(req.userId);
    if (!user || !user.relationshipId) {
      res.status(404).json({ error: "Relationship not found" });
      return;
    }

    const letter = await OpenWhenLetter.findOneAndDelete({
      _id: req.params.id,
      relationshipId: user.relationshipId,
    });

    if (!letter) {
      res.status(404).json({ error: "Letter not found" });
      return;
    }

    res.json({ success: true, message: "Letter deleted successfully" });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
