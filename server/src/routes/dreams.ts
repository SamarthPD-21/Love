import { Router, Response } from "express";
import { authMiddleware } from "../middleware/auth";
import { Dream } from "../models/Dream";
import { User } from "../models/User";
import { z } from "zod";

const router = Router();
router.use(authMiddleware);

const dreamSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().optional(),
  category: z.enum(["travel", "fun", "house", "career", "general"]).default("general"),
  targetDate: z.string().optional().nullable().transform((val) => val ? new Date(val) : undefined),
});

// GET /api/dreams
router.get("/", async (req: any, res: Response) => {
  try {
    const user = await User.findById(req.userId);
    if (!user || !user.relationshipId) {
      res.status(404).json({ error: "Relationship not found" });
      return;
    }

    const dreams = await Dream.find({ relationshipId: user.relationshipId })
      .populate("userId", "name avatar")
      .sort({ createdAt: -1 });

    res.json({ success: true, data: dreams });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/dreams
router.post("/", async (req: any, res: Response) => {
  try {
    const validation = dreamSchema.safeParse(req.body);
    if (!validation.success) {
      res.status(400).json({ error: validation.error.errors[0].message });
      return;
    }

    const user = await User.findById(req.userId);
    if (!user || !user.relationshipId) {
      res.status(404).json({ error: "Relationship not found" });
      return;
    }

    const dream = new Dream({
      ...validation.data,
      relationshipId: user.relationshipId,
      userId: user._id,
      isCompleted: false,
    });

    await dream.save();
    const populated = await dream.populate("userId", "name avatar");

    res.status(201).json({ success: true, data: populated });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// PUT /api/dreams/:id
router.put("/:id", async (req: any, res: Response) => {
  try {
    const validation = dreamSchema.partial().extend({
      isCompleted: z.boolean().optional(),
    }).safeParse(req.body);

    if (!validation.success) {
      res.status(400).json({ error: validation.error.errors[0].message });
      return;
    }

    const user = await User.findById(req.userId);
    if (!user || !user.relationshipId) {
      res.status(404).json({ error: "Relationship not found" });
      return;
    }

    const dream = await Dream.findOneAndUpdate(
      { _id: req.params.id, relationshipId: user.relationshipId },
      { $set: validation.data },
      { new: true }
    );

    if (!dream) {
      res.status(404).json({ error: "Dream not found" });
      return;
    }

    const populated = await dream.populate("userId", "name avatar");
    res.json({ success: true, data: populated });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// DELETE /api/dreams/:id
router.delete("/:id", async (req: any, res: Response) => {
  try {
    const user = await User.findById(req.userId);
    if (!user || !user.relationshipId) {
      res.status(404).json({ error: "Relationship not found" });
      return;
    }

    const dream = await Dream.findOneAndDelete({
      _id: req.params.id,
      relationshipId: user.relationshipId,
    });

    if (!dream) {
      res.status(404).json({ error: "Dream not found" });
      return;
    }

    res.json({ success: true, message: "Dream deleted successfully" });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
