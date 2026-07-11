import { Router, Response } from "express";
import { authMiddleware } from "../middleware/auth";
import { Countdown } from "../models/Countdown";
import { User } from "../models/User";
import { z } from "zod";

const router = Router();

// Authenticate all routes
router.use(authMiddleware);

const countdownSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().optional(),
  targetDate: z.string().transform((val) => new Date(val)),
  coverImage: z.string().optional(),
});

/**
 * GET /api/countdowns
 * Get all countdowns for the relationship. Sorted by targetDate.
 */
router.get("/", async (req: any, res: Response) => {
  try {
    const user = await User.findById(req.userId);
    if (!user || !user.relationshipId) {
      res.status(404).json({ error: "Relationship not found" });
      return;
    }

    const countdowns = await Countdown.find({ relationshipId: user.relationshipId })
      .populate("userId", "name avatar")
      .sort({ targetDate: 1 });

    res.json({ success: true, data: countdowns });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/countdowns
 * Create new countdown.
 */
router.post("/", async (req: any, res: Response) => {
  try {
    const validation = countdownSchema.safeParse(req.body);
    if (!validation.success) {
      res.status(400).json({ error: validation.error.errors[0].message });
      return;
    }

    const user = await User.findById(req.userId);
    if (!user || !user.relationshipId) {
      res.status(404).json({ error: "Relationship not found" });
      return;
    }

    const countdown = new Countdown({
      ...validation.data,
      relationshipId: user.relationshipId,
      userId: user._id,
    });

    await countdown.save();
    res.status(201).json({ success: true, data: countdown });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * PUT /api/countdowns/:id
 * Update countdown.
 */
router.put("/:id", async (req: any, res: Response) => {
  try {
    const validation = countdownSchema.partial().safeParse(req.body);
    if (!validation.success) {
      res.status(400).json({ error: validation.error.errors[0].message });
      return;
    }

    const user = await User.findById(req.userId);
    if (!user || !user.relationshipId) {
      res.status(404).json({ error: "Relationship not found" });
      return;
    }

    const countdown = await Countdown.findOneAndUpdate(
      { _id: req.params.id, relationshipId: user.relationshipId },
      { $set: validation.data },
      { new: true }
    );

    if (!countdown) {
      res.status(404).json({ error: "Countdown not found" });
      return;
    }

    res.json({ success: true, data: countdown });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * DELETE /api/countdowns/:id
 * Delete countdown.
 */
router.delete("/:id", async (req: any, res: Response) => {
  try {
    const user = await User.findById(req.userId);
    if (!user || !user.relationshipId) {
      res.status(404).json({ error: "Relationship not found" });
      return;
    }

    const countdown = await Countdown.findOneAndDelete({
      _id: req.params.id,
      relationshipId: user.relationshipId,
    });

    if (!countdown) {
      res.status(404).json({ error: "Countdown not found" });
      return;
    }

    res.json({ success: true, message: "Countdown deleted successfully" });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
