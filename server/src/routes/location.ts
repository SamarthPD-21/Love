import { Router, Response } from "express";
import { authMiddleware } from "../middleware/auth";
import { User } from "../models/User";
import { z } from "zod";

const router = Router();
router.use(authMiddleware);

const locationSchema = z.object({
  lat: z.number(),
  lng: z.number(),
});

// PUT /api/location
router.put("/", async (req: any, res: Response) => {
  try {
    const validation = locationSchema.safeParse(req.body);
    if (!validation.success) {
      res.status(400).json({ error: validation.error.errors[0].message });
      return;
    }

    const { lat, lng } = validation.data;
    const user = await User.findByIdAndUpdate(
      req.userId,
      {
        lastLocation: {
          lat,
          lng,
          updatedAt: new Date(),
        },
      },
      { new: true }
    );

    if (!user) {
      res.status(404).json({ error: "User not found" });
      return;
    }

    res.json({ success: true, message: "Location updated successfully", location: user.lastLocation });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/location/partner
router.get("/partner", async (req: any, res: Response) => {
  try {
    const user = await User.findById(req.userId);
    if (!user) {
      res.status(404).json({ error: "User not found" });
      return;
    }

    if (!user.partnerId) {
      res.status(404).json({ error: "No partner linked" });
      return;
    }

    const partner = await User.findById(user.partnerId).select("name avatar lastLocation");
    if (!partner) {
      res.status(404).json({ error: "Partner not found" });
      return;
    }

    res.json({ success: true, partnerLocation: partner.lastLocation, partnerName: partner.name });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
