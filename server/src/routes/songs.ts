import { Router, Response } from "express";
import { authMiddleware } from "../middleware/auth";
import { Song } from "../models/Song";
import { User } from "../models/User";
import { z } from "zod";

const router = Router();
router.use(authMiddleware);

const songSchema = z.object({
  title: z.string().min(1, "Title is required"),
  artist: z.string().min(1, "Artist is required"),
  url: z.string().url("Must be a valid Youtube or Spotify link"),
  notes: z.string().optional(),
});

// GET /api/songs
router.get("/", async (req: any, res: Response) => {
  try {
    const user = await User.findById(req.userId);
    if (!user || !user.relationshipId) {
      res.status(404).json({ error: "Relationship not found" });
      return;
    }

    const songs = await Song.find({ relationshipId: user.relationshipId })
      .populate("userId", "name avatar")
      .sort({ createdAt: -1 });

    res.json({ success: true, data: songs });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/songs
router.post("/", async (req: any, res: Response) => {
  try {
    const validation = songSchema.safeParse(req.body);
    if (!validation.success) {
      res.status(400).json({ error: validation.error.errors[0].message });
      return;
    }

    const user = await User.findById(req.userId);
    if (!user || !user.relationshipId) {
      res.status(404).json({ error: "Relationship not found" });
      return;
    }

    const song = new Song({
      ...validation.data,
      relationshipId: user.relationshipId,
      userId: user._id,
    });

    await song.save();
    const populated = await song.populate("userId", "name avatar");

    res.status(201).json({ success: true, data: populated });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// DELETE /api/songs/:id
router.delete("/:id", async (req: any, res: Response) => {
  try {
    const user = await User.findById(req.userId);
    if (!user || !user.relationshipId) {
      res.status(404).json({ error: "Relationship not found" });
      return;
    }

    const song = await Song.findOneAndDelete({
      _id: req.params.id,
      relationshipId: user.relationshipId,
    });

    if (!song) {
      res.status(404).json({ error: "Song not found" });
      return;
    }

    res.json({ success: true, message: "Song deleted successfully" });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
