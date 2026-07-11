import { Router, Response } from "express";
import { authMiddleware } from "../middleware/auth";
import { Journal } from "../models/Journal";
import { User } from "../models/User";
import { z } from "zod";

const router = Router();
router.use(authMiddleware);

const journalSchema = z.object({
  title: z.string().min(1, "Title is required"),
  content: z.string().min(1, "Content cannot be empty"),
  mood: z.enum(["loved", "cozy", "happy", "excited", "thoughtful"]).default("cozy"),
});

// GET /api/journal
router.get("/", async (req: any, res: Response) => {
  try {
    const user = await User.findById(req.userId);
    if (!user || !user.relationshipId) {
      res.status(404).json({ error: "Relationship not found" });
      return;
    }

    const logs = await Journal.find({ relationshipId: user.relationshipId })
      .populate("userId", "name avatar")
      .sort({ createdAt: -1 });

    res.json({ success: true, data: logs });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/journal
router.post("/", async (req: any, res: Response) => {
  try {
    const validation = journalSchema.safeParse(req.body);
    if (!validation.success) {
      res.status(400).json({ error: validation.error.errors[0].message });
      return;
    }

    const user = await User.findById(req.userId);
    if (!user || !user.relationshipId) {
      res.status(404).json({ error: "Relationship not found" });
      return;
    }

    const entry = new Journal({
      ...validation.data,
      relationshipId: user.relationshipId,
      userId: user._id,
    });

    await entry.save();
    const populated = await entry.populate("userId", "name avatar");

    res.status(201).json({ success: true, data: populated });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// PUT /api/journal/:id
router.put("/:id", async (req: any, res: Response) => {
  try {
    const validation = journalSchema.partial().safeParse(req.body);
    if (!validation.success) {
      res.status(400).json({ error: validation.error.errors[0].message });
      return;
    }

    const user = await User.findById(req.userId);
    if (!user || !user.relationshipId) {
      res.status(404).json({ error: "Relationship not found" });
      return;
    }

    const entry = await Journal.findOneAndUpdate(
      { _id: req.params.id, relationshipId: user.relationshipId },
      { $set: validation.data },
      { new: true }
    );

    if (!entry) {
      res.status(404).json({ error: "Journal entry not found" });
      return;
    }

    const populated = await entry.populate("userId", "name avatar");
    res.json({ success: true, data: populated });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// DELETE /api/journal/:id
router.delete("/:id", async (req: any, res: Response) => {
  try {
    const user = await User.findById(req.userId);
    if (!user || !user.relationshipId) {
      res.status(404).json({ error: "Relationship not found" });
      return;
    }

    const entry = await Journal.findOneAndDelete({
      _id: req.params.id,
      relationshipId: user.relationshipId,
    });

    if (!entry) {
      res.status(404).json({ error: "Journal entry not found" });
      return;
    }

    res.json({ success: true, message: "Journal entry deleted successfully" });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
