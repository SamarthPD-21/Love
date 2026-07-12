import { Router, Response } from "express";
import { authMiddleware } from "../middleware/auth";
import { MapPin } from "../models/MapPin";
import { User } from "../models/User";
import { createNotification } from "../services/notify";
import { z } from "zod";

const router = Router();
router.use(authMiddleware);

const pinSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().optional(),
  lat: z.number({ required_error: "Latitude is required" }),
  lng: z.number({ required_error: "Longitude is required" }),
  category: z.enum(["visited", "planned"]).default("visited"),
  date: z.string().optional().nullable().transform((val) => val ? new Date(val) : undefined),
});

// GET /api/map
router.get("/", async (req: any, res: Response) => {
  try {
    const user = await User.findById(req.userId);
    if (!user || !user.relationshipId) {
      res.status(404).json({ error: "Relationship not found" });
      return;
    }

    const pins = await MapPin.find({ relationshipId: user.relationshipId })
      .populate("userId", "name avatar")
      .sort({ createdAt: -1 });

    res.json({ success: true, data: pins });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/map
router.post("/", async (req: any, res: Response) => {
  try {
    const validation = pinSchema.safeParse(req.body);
    if (!validation.success) {
      res.status(400).json({ error: validation.error.errors[0].message });
      return;
    }

    const user = await User.findById(req.userId);
    if (!user || !user.relationshipId) {
      res.status(404).json({ error: "Relationship not found" });
      return;
    }

    const pin = new MapPin({
      ...validation.data,
      relationshipId: user.relationshipId,
      userId: user._id,
    });

    await pin.save();
    const populated = await pin.populate("userId", "name avatar");

    createNotification({
      actorId: user._id.toString(),
      type: "map_pin_added",
      entityType: "MapPin",
      entityId: pin._id.toString(),
      meta: { detail: pin.title },
    });

    res.status(201).json({ success: true, data: populated });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// DELETE /api/map/:id
router.delete("/:id", async (req: any, res: Response) => {
  try {
    const user = await User.findById(req.userId);
    if (!user || !user.relationshipId) {
      res.status(404).json({ error: "Relationship not found" });
      return;
    }

    const pin = await MapPin.findOneAndDelete({
      _id: req.params.id,
      relationshipId: user.relationshipId,
    });

    if (!pin) {
      res.status(404).json({ error: "Map pin not found" });
      return;
    }

    res.json({ success: true, message: "Map pin deleted successfully" });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
