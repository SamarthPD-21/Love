import { Router, Response } from "express";
import { authMiddleware } from "../middleware/auth";
import { Movie } from "../models/Movie";
import { User } from "../models/User";
import { z } from "zod";
import { fetchWatchLink } from "../services/movieBot";
import { createNotification } from "../services/notify";

const router = Router();
router.use(authMiddleware);

const movieSchema = z.object({
  title: z.string().min(1, "Title is required"),
  type: z.enum(["movie", "show"]).default("movie"),
  status: z.enum(["watchlist", "watched"]).default("watchlist"),
  rating: z.number().min(1).max(5).optional().nullable(),
  review: z.string().optional(),
  watchLink: z.string().optional().nullable(),
});

// GET /api/movies
router.get("/", async (req: any, res: Response) => {
  try {
    const user = await User.findById(req.userId);
    if (!user || !user.relationshipId) {
      res.status(404).json({ error: "Relationship not found" });
      return;
    }

    const movies = await Movie.find({ relationshipId: user.relationshipId })
      .populate("userId", "name avatar")
      .sort({ createdAt: -1 });

    res.json({ success: true, data: movies });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/movies/:id
router.get("/:id", async (req: any, res: Response) => {
  try {
    const user = await User.findById(req.userId);
    if (!user || !user.relationshipId) {
      res.status(404).json({ error: "Relationship not found" });
      return;
    }

    const movie = await Movie.findOne({
      _id: req.params.id,
      relationshipId: user.relationshipId,
    }).populate("userId", "name avatar");

    if (!movie) {
      res.status(404).json({ error: "Movie not found" });
      return;
    }

    res.json({ success: true, data: movie });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/movies
router.post("/", async (req: any, res: Response) => {
  try {
    const validation = movieSchema.safeParse(req.body);
    if (!validation.success) {
      res.status(400).json({ error: validation.error.errors[0].message });
      return;
    }

    const user = await User.findById(req.userId);
    if (!user || !user.relationshipId) {
      res.status(404).json({ error: "Relationship not found" });
      return;
    }

    const movie = new Movie({
      ...validation.data,
      relationshipId: user.relationshipId,
      userId: user._id,
    });

    await movie.save();
    const populated = await movie.populate("userId", "name avatar");

    // Trigger the background bot scraping non-blockingly
    fetchWatchLink(movie._id.toString()).catch((err) =>
      console.error("[MovieBot] background fetch failed:", err)
    );

    // Notify partner
    createNotification({
      actorId: user._id.toString(),
      type: "movie_added",
      entityType: "Movie",
      entityId: movie._id.toString(),
      meta: { detail: movie.title },
    });

    res.status(201).json({ success: true, data: populated });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// PUT /api/movies/:id
router.put("/:id", async (req: any, res: Response) => {
  try {
    const validation = movieSchema.partial().safeParse(req.body);
    if (!validation.success) {
      res.status(400).json({ error: validation.error.errors[0].message });
      return;
    }

    const user = await User.findById(req.userId);
    if (!user || !user.relationshipId) {
      res.status(404).json({ error: "Relationship not found" });
      return;
    }

    const movie = await Movie.findOneAndUpdate(
      { _id: req.params.id, relationshipId: user.relationshipId },
      { $set: validation.data },
      { new: true }
    );

    if (!movie) {
      res.status(404).json({ error: "Movie not found" });
      return;
    }

    // If title has been updated, run the background bot scraper again
    if (validation.data.title) {
      fetchWatchLink(movie._id.toString()).catch((err) =>
        console.error("[MovieBot] background fetch after title update failed:", err)
      );
    }

    const populated = await movie.populate("userId", "name avatar");
    res.json({ success: true, data: populated });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// DELETE /api/movies/:id
router.delete("/:id", async (req: any, res: Response) => {
  try {
    const user = await User.findById(req.userId);
    if (!user || !user.relationshipId) {
      res.status(404).json({ error: "Relationship not found" });
      return;
    }

    const movie = await Movie.findOneAndDelete({
      _id: req.params.id,
      relationshipId: user.relationshipId,
    });

    if (!movie) {
      res.status(404).json({ error: "Movie not found" });
      return;
    }

    res.json({ success: true, message: "Movie deleted successfully" });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
