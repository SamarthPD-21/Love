import { Router, Response } from "express";
import { authMiddleware } from "../middleware/auth";
import { Gratitude } from "../models/Gratitude";
import { User } from "../models/User";
import { z } from "zod";

const router = Router();
router.use(authMiddleware);

const gratitudeSchema = z.object({
  content: z.string().min(1, "Gratitude content cannot be empty"),
});

// GET /api/gratitude
router.get("/", async (req: any, res: Response) => {
  try {
    const user = await User.findById(req.userId);
    if (!user || !user.relationshipId) {
      res.status(404).json({ error: "Relationship not found" });
      return;
    }

    const logs = await Gratitude.find({ relationshipId: user.relationshipId })
      .populate("userId", "name avatar")
      .sort({ createdAt: -1 });

    res.json({ success: true, data: logs });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/gratitude
router.post("/", async (req: any, res: Response) => {
  try {
    const validation = gratitudeSchema.safeParse(req.body);
    if (!validation.success) {
      res.status(400).json({ error: validation.error.errors[0].message });
      return;
    }

    const user = await User.findById(req.userId);
    if (!user || !user.relationshipId) {
      res.status(404).json({ error: "Relationship not found" });
      return;
    }

    const item = new Gratitude({
      content: validation.data.content,
      relationshipId: user.relationshipId,
      userId: user._id,
      likes: [],
    });

    await item.save();
    const populated = await item.populate("userId", "name avatar");

    res.status(201).json({ success: true, data: populated });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/gratitude/:id/like
router.post("/:id/like", async (req: any, res: Response) => {
  try {
    const user = await User.findById(req.userId);
    if (!user || !user.relationshipId) {
      res.status(404).json({ error: "Relationship not found" });
      return;
    }

    const gratitude = await Gratitude.findOne({
      _id: req.params.id,
      relationshipId: user.relationshipId,
    });

    if (!gratitude) {
      res.status(404).json({ error: "Gratitude item not found" });
      return;
    }

    const likeIndex = gratitude.likes.indexOf(user._id);
    if (likeIndex > -1) {
      gratitude.likes.splice(likeIndex, 1);
    } else {
      gratitude.likes.push(user._id);
    }

    await gratitude.save();
    const populated = await gratitude.populate("userId", "name avatar");

    res.json({ success: true, data: populated });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// DELETE /api/gratitude/:id
router.delete("/:id", async (req: any, res: Response) => {
  try {
    const user = await User.findById(req.userId);
    if (!user || !user.relationshipId) {
      res.status(404).json({ error: "Relationship not found" });
      return;
    }

    const item = await Gratitude.findOneAndDelete({
      _id: req.params.id,
      relationshipId: user.relationshipId,
    });

    if (!item) {
      res.status(404).json({ error: "Gratitude item not found" });
      return;
    }

    res.json({ success: true, message: "Gratitude item deleted successfully" });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
