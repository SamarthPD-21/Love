import { Router, Response } from "express";
import { authMiddleware } from "../middleware/auth";
import { Album } from "../models/Album";
import { User } from "../models/User";
import { Memory } from "../models/Memory";
import { z } from "zod";

const router = Router();

// Authenticate all routes
router.use(authMiddleware);

// Zod schema for validation
const albumCreateSchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().optional(),
  coverImage: z.string().optional(),
});

/**
 * GET /api/albums
 * Get all albums for the user's relationship with memory counts.
 */
router.get("/", async (req: any, res: Response) => {
  try {
    const user = await User.findById(req.userId);
    if (!user || !user.relationshipId) {
      res.status(404).json({ error: "Relationship not found" });
      return;
    }

    const albums = await Album.find({ relationshipId: user.relationshipId }).sort({ createdAt: -1 });

    // Aggregate memory counts per album
    const albumWithCounts = await Promise.all(
      albums.map(async (album) => {
        const count = await Memory.countDocuments({ albumId: album._id });
        return {
          ...album.toJSON(),
          memoryCount: count,
        };
      })
    );

    res.json({ success: true, data: albumWithCounts });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/albums/:id
 * Get single album details.
 */
router.get("/:id", async (req: any, res: Response) => {
  try {
    const user = await User.findById(req.userId);
    if (!user || !user.relationshipId) {
      res.status(404).json({ error: "Relationship not found" });
      return;
    }

    const album = await Album.findOne({
      _id: req.params.id,
      relationshipId: user.relationshipId,
    });

    if (!album) {
      res.status(404).json({ error: "Album not found" });
      return;
    }

    const count = await Memory.countDocuments({ albumId: album._id });

    res.json({
      success: true,
      data: {
        ...album.toJSON(),
        memoryCount: count,
      },
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/albums
 * Create new album.
 */
router.post("/", async (req: any, res: Response) => {
  try {
    const validation = albumCreateSchema.safeParse(req.body);
    if (!validation.success) {
      res.status(400).json({ error: validation.error.errors[0].message });
      return;
    }

    const user = await User.findById(req.userId);
    if (!user || !user.relationshipId) {
      res.status(404).json({ error: "Relationship not found" });
      return;
    }

    const { name, description, coverImage } = validation.data;

    const album = new Album({
      name,
      description,
      coverImage,
      relationshipId: user.relationshipId,
      createdBy: user._id,
    });

    await album.save();
    res.status(201).json({ success: true, data: album });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * PUT /api/albums/:id
 * Update album details.
 */
router.put("/:id", async (req: any, res: Response) => {
  try {
    const validation = albumCreateSchema.partial().safeParse(req.body);
    if (!validation.success) {
      res.status(400).json({ error: validation.error.errors[0].message });
      return;
    }

    const user = await User.findById(req.userId);
    if (!user || !user.relationshipId) {
      res.status(404).json({ error: "Relationship not found" });
      return;
    }

    const album = await Album.findOneAndUpdate(
      { _id: req.params.id, relationshipId: user.relationshipId },
      validation.data,
      { new: true }
    );

    if (!album) {
      res.status(404).json({ error: "Album not found" });
      return;
    }

    res.json({ success: true, data: album });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * DELETE /api/albums/:id
 * Delete album and unset albumId from memories.
 */
router.delete("/:id", async (req: any, res: Response) => {
  try {
    const user = await User.findById(req.userId);
    if (!user || !user.relationshipId) {
      res.status(404).json({ error: "Relationship not found" });
      return;
    }

    const album = await Album.findOneAndDelete({
      _id: req.params.id,
      relationshipId: user.relationshipId,
    });

    if (!album) {
      res.status(404).json({ error: "Album not found" });
      return;
    }

    // Unset the album reference from associated memories
    await Memory.updateMany({ albumId: album._id }, { $unset: { albumId: "" } });

    res.json({ success: true, message: "Album deleted successfully" });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
