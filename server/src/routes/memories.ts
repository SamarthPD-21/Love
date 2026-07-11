import { Router, Response } from "express";
import { authMiddleware } from "../middleware/auth";
import { Memory } from "../models/Memory";
import { User } from "../models/User";
import { z } from "zod";

const router = Router();

// Authenticate all routes
router.use(authMiddleware);

const memoryCreateSchema = z.object({
  title: z.string().min(1, "Title is required"),
  photos: z.array(z.string()).default([]),
  videos: z.array(z.string()).default([]),
  location: z.string().optional(),
  date: z.string().transform((val) => new Date(val)),
  story: z.string().optional(),
  mood: z.string().optional(),
  tags: z.array(z.string()).default([]),
  albumId: z.string().optional().nullable(),
  favorite: z.boolean().default(false),
});

/**
 * GET /api/memories
 * Get all memories with filters (albumId, favorite, tag, search query).
 */
router.get("/", async (req: any, res: Response) => {
  try {
    const user = await User.findById(req.userId);
    if (!user || !user.relationshipId) {
      res.status(404).json({ error: "Relationship not found" });
      return;
    }

    const { albumId, favorite, tag, query } = req.query;

    const filter: any = { relationshipId: user.relationshipId };

    if (albumId) {
      filter.albumId = albumId;
    }

    if (favorite === "true") {
      filter.favorite = true;
    }

    if (tag) {
      filter.tags = tag;
    }

    if (query) {
      // Search in title, story or tags
      filter.$or = [
        { title: { $regex: query, $options: "i" } },
        { story: { $regex: query, $options: "i" } },
        { tags: { $regex: query, $options: "i" } },
      ];
    }

    const memories = await Memory.find(filter)
      .populate("userId", "name avatar")
      .sort({ date: -1, createdAt: -1 });

    res.json({ success: true, data: memories });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/memories/:id
 * Get single memory.
 */
router.get("/:id", async (req: any, res: Response) => {
  try {
    const user = await User.findById(req.userId);
    if (!user || !user.relationshipId) {
      res.status(404).json({ error: "Relationship not found" });
      return;
    }

    const memory = await Memory.findOne({
      _id: req.params.id,
      relationshipId: user.relationshipId,
    })
      .populate("userId", "name avatar")
      .populate("comments.userId", "name avatar");

    if (!memory) {
      res.status(404).json({ error: "Memory not found" });
      return;
    }

    res.json({ success: true, data: memory });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/memories
 * Create new memory.
 */
router.post("/", async (req: any, res: Response) => {
  try {
    const validation = memoryCreateSchema.safeParse(req.body);
    if (!validation.success) {
      res.status(400).json({ error: validation.error.errors[0].message });
      return;
    }

    const user = await User.findById(req.userId);
    if (!user || !user.relationshipId) {
      res.status(404).json({ error: "Relationship not found" });
      return;
    }

    const memoryData = {
      ...validation.data,
      relationshipId: user.relationshipId,
      userId: user._id,
      albumId: validation.data.albumId || undefined,
    };

    const memory = new Memory(memoryData);
    await memory.save();

    res.status(201).json({ success: true, data: memory });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * PUT /api/memories/:id
 * Update memory.
 */
router.put("/:id", async (req: any, res: Response) => {
  try {
    const validation = memoryCreateSchema.partial().safeParse(req.body);
    if (!validation.success) {
      res.status(400).json({ error: validation.error.errors[0].message });
      return;
    }

    const user = await User.findById(req.userId);
    if (!user || !user.relationshipId) {
      res.status(404).json({ error: "Relationship not found" });
      return;
    }

    const updatedData: any = { ...validation.data };
    if (updatedData.albumId === "") {
      updatedData.albumId = undefined; // clear out album
    }

    const memory = await Memory.findOneAndUpdate(
      { _id: req.params.id, relationshipId: user.relationshipId },
      { $set: updatedData },
      { new: true }
    );

    if (!memory) {
      res.status(404).json({ error: "Memory not found" });
      return;
    }

    res.json({ success: true, data: memory });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * DELETE /api/memories/:id
 * Delete memory.
 */
router.delete("/:id", async (req: any, res: Response) => {
  try {
    const user = await User.findById(req.userId);
    if (!user || !user.relationshipId) {
      res.status(404).json({ error: "Relationship not found" });
      return;
    }

    const memory = await Memory.findOneAndDelete({
      _id: req.params.id,
      relationshipId: user.relationshipId,
    });

    if (!memory) {
      res.status(404).json({ error: "Memory not found" });
      return;
    }

    res.json({ success: true, message: "Memory deleted successfully" });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/memories/:id/favorite
 * Toggle favorite.
 */
router.post("/:id/favorite", async (req: any, res: Response) => {
  try {
    const user = await User.findById(req.userId);
    if (!user || !user.relationshipId) {
      res.status(404).json({ error: "Relationship not found" });
      return;
    }

    const memory = await Memory.findOne({
      _id: req.params.id,
      relationshipId: user.relationshipId,
    });

    if (!memory) {
      res.status(404).json({ error: "Memory not found" });
      return;
    }

    memory.favorite = !memory.favorite;
    await memory.save();

    res.json({ success: true, data: memory });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/memories/:id/comments
 * Add comment.
 */
router.post("/:id/comments", async (req: any, res: Response) => {
  try {
    const { text } = req.body;
    if (!text || text.trim() === "") {
      res.status(400).json({ error: "Comment text is required" });
      return;
    }

    const user = await User.findById(req.userId);
    if (!user || !user.relationshipId) {
      res.status(404).json({ error: "Relationship not found" });
      return;
    }

    const memory = await Memory.findOneAndUpdate(
      { _id: req.params.id, relationshipId: user.relationshipId },
      {
        $push: {
          comments: {
            text,
            userId: user._id,
            createdAt: new Date(),
          },
        },
      },
      { new: true }
    ).populate("comments.userId", "name avatar");

    if (!memory) {
      res.status(404).json({ error: "Memory not found" });
      return;
    }

    res.status(201).json({ success: true, data: memory.comments });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * DELETE /api/memories/:id/comments/:commentId
 * Delete comment.
 */
router.delete("/:id/comments/:commentId", async (req: any, res: Response) => {
  try {
    const user = await User.findById(req.userId);
    if (!user || !user.relationshipId) {
      res.status(404).json({ error: "Relationship not found" });
      return;
    }

    const memory = await Memory.findOneAndUpdate(
      { _id: req.params.id, relationshipId: user.relationshipId },
      {
        $pull: {
          comments: { _id: req.params.commentId, userId: user._id },
        },
      },
      { new: true }
    );

    if (!memory) {
      res.status(404).json({ error: "Memory not found or you are not authorized to delete this comment" });
      return;
    }

    res.json({ success: true, message: "Comment deleted successfully", data: memory.comments });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
