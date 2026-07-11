import { Router, Response } from "express";
import { authMiddleware } from "../middleware/auth";
import { Milestone } from "../models/Milestone";
import { User } from "../models/User";
import { z } from "zod";

const router = Router();

// Authenticate all routes
router.use(authMiddleware);

const milestoneSchema = z.object({
  title: z.string().min(1, "Title is required"),
  date: z.string().transform((val) => new Date(val)),
  description: z.string().optional(),
  photos: z.array(z.string()).default([]),
  icon: z.string().optional(),
});

/**
 * GET /api/timeline
 * Get all milestones for the relationship. Sorted by date ascending.
 */
router.get("/", async (req: any, res: Response) => {
  try {
    const user = await User.findById(req.userId);
    if (!user || !user.relationshipId) {
      res.status(404).json({ error: "Relationship not found" });
      return;
    }

    const milestones = await Milestone.find({ relationshipId: user.relationshipId })
      .populate("userId", "name avatar")
      .sort({ date: 1 });

    res.json({ success: true, data: milestones });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/timeline
 * Create new milestone.
 */
router.post("/", async (req: any, res: Response) => {
  try {
    const validation = milestoneSchema.safeParse(req.body);
    if (!validation.success) {
      res.status(400).json({ error: validation.error.errors[0].message });
      return;
    }

    const user = await User.findById(req.userId);
    if (!user || !user.relationshipId) {
      res.status(404).json({ error: "Relationship not found" });
      return;
    }

    const milestone = new Milestone({
      ...validation.data,
      relationshipId: user.relationshipId,
      userId: user._id,
    });

    await milestone.save();
    res.status(201).json({ success: true, data: milestone });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * PUT /api/timeline/:id
 * Update milestone.
 */
router.put("/:id", async (req: any, res: Response) => {
  try {
    const validation = milestoneSchema.partial().safeParse(req.body);
    if (!validation.success) {
      res.status(400).json({ error: validation.error.errors[0].message });
      return;
    }

    const user = await User.findById(req.userId);
    if (!user || !user.relationshipId) {
      res.status(404).json({ error: "Relationship not found" });
      return;
    }

    const milestone = await Milestone.findOneAndUpdate(
      { _id: req.params.id, relationshipId: user.relationshipId },
      { $set: validation.data },
      { new: true }
    );

    if (!milestone) {
      res.status(404).json({ error: "Milestone not found" });
      return;
    }

    res.json({ success: true, data: milestone });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * DELETE /api/timeline/:id
 * Delete milestone.
 */
router.delete("/:id", async (req: any, res: Response) => {
  try {
    const user = await User.findById(req.userId);
    if (!user || !user.relationshipId) {
      res.status(404).json({ error: "Relationship not found" });
      return;
    }

    const milestone = await Milestone.findOneAndDelete({
      _id: req.params.id,
      relationshipId: user.relationshipId,
    });

    if (!milestone) {
      res.status(404).json({ error: "Milestone not found" });
      return;
    }

    res.json({ success: true, message: "Milestone deleted successfully" });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
