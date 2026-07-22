import { Router, Request, Response } from "express";
import { z } from "zod";
import { User } from "../models/User";
import { Relationship } from "../models/Relationship";
import { authMiddleware } from "../middleware/auth";
import { createNotification } from "../services/notify";

const router = Router();

// All user routes require authentication
router.use(authMiddleware);

// ── GET /me ─────────────────────────────────────────────────
router.get("/me", async (req: Request, res: Response) => {
  try {
    const user = await User.findById(req.userId)
      .select("-passwordHash")
      .populate("partnerId", "name email avatar createdAt")
      .populate("relationshipId");

    if (!user) {
      res.status(404).json({ error: "User not found" });
      return;
    }

    res.json({ user });
  } catch (error) {
    console.error("Get user error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ── PUT /me ─────────────────────────────────────────────────
router.put("/me", async (req: Request, res: Response) => {
  try {
    const updateSchema = z.object({
      name: z.string().min(1).max(100).optional(),
      avatar: z.string().url().optional(),
    });

    const parsed = updateSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.errors[0].message });
      return;
    }

    const updates: Record<string, string> = {};
    if (parsed.data.name) updates.name = parsed.data.name;
    if (parsed.data.avatar) updates.avatar = parsed.data.avatar;

    if (Object.keys(updates).length === 0) {
      res.status(400).json({ error: "No valid fields to update" });
      return;
    }

    const user = await User.findByIdAndUpdate(req.userId, updates, {
      new: true,
    }).select("-passwordHash");

    if (!user) {
      res.status(404).json({ error: "User not found" });
      return;
    }

    // Light-touch: only ping the partner when the avatar actually changed.
    if (parsed.data.avatar) {
      createNotification({
        actorId: user._id.toString(),
        type: "profile_updated",
        entityType: "User",
        entityId: user._id.toString(),
      });
    }

    res.json({ user });
  } catch (error) {
    console.error("Update user error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ── GET /partner ────────────────────────────────────────────
router.get("/partner", async (req: Request, res: Response) => {
  try {
    const user = await User.findById(req.userId);

    if (!user) {
      res.status(404).json({ error: "User not found" });
      return;
    }

    if (!user.partnerId) {
      res.status(404).json({ error: "No partner linked yet" });
      return;
    }

    const partner = await User.findById(user.partnerId).select(
      "-passwordHash"
    );

    if (!partner) {
      res.status(404).json({ error: "Partner not found" });
      return;
    }

    res.json({ partner });
  } catch (error) {
    console.error("Get partner error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ── PUT /relationship ──────────────────────────────────────────
router.put("/relationship", async (req: Request, res: Response) => {
  try {
    const relationshipSchema = z.object({
      startDate: z.string().transform((val) => new Date(val)),
    });

    const parsed = relationshipSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.errors[0].message });
      return;
    }

    const user = await User.findById(req.userId);
    if (!user || !user.relationshipId) {
      res.status(404).json({ error: "Relationship not found" });
      return;
    }

    const relationship = await Relationship.findByIdAndUpdate(
      user.relationshipId,
      { startDate: parsed.data.startDate },
      { new: true }
    );

    res.json({ relationship });
  } catch (error) {
    console.error("Update relationship error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});
// ── GET /hugs ──────────────────────────────────────────────────
router.get("/hugs", async (req: Request, res: Response) => {
  try {
    const user = await User.findById(req.userId);
    if (!user || !user.relationshipId) {
      res.json({
        success: true,
        myHugs: 0,
        partnerHugs: 0,
        noRelationship: true,
      });
      return;
    }

    const relationship = await Relationship.findById(user.relationshipId);
    if (!relationship) {
      res.json({
        success: true,
        myHugs: 0,
        partnerHugs: 0,
        noRelationship: true,
      });
      return;
    }

    const hugsMap = relationship.hugs || new Map();
    const myId = user._id.toString();
    const partnerId = user.partnerId ? user.partnerId.toString() : null;

    const myHugs = hugsMap.get(myId) || 0;
    const partnerHugs = partnerId ? (hugsMap.get(partnerId) || 0) : 0;

    res.json({
      success: true,
      myHugs,
      partnerHugs,
    });
  } catch (error) {
    console.error("Get hugs error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ── POST /hugs ─────────────────────────────────────────────────
// Accepts optional body { count?: number } to batch multiple hugs
// in a single request. Capped at 50 per call to prevent abuse.
router.post("/hugs", async (req: Request, res: Response) => {
  try {
    const rawCount = Number(req.body?.count) || 1;
    const count = Math.max(1, Math.min(rawCount, 50)); // clamp 1–50

    const user = await User.findById(req.userId);
    if (!user || !user.relationshipId) {
      res.json({
        success: true,
        myHugs: 0,
        partnerHugs: 0,
        noRelationship: true,
      });
      return;
    }

    const relationship = await Relationship.findById(user.relationshipId);
    if (!relationship) {
      res.json({
        success: true,
        myHugs: 0,
        partnerHugs: 0,
        noRelationship: true,
      });
      return;
    }

    const myId = user._id.toString();
    const currentHugs = relationship.hugs.get(myId) || 0;
    relationship.hugs.set(myId, currentHugs + count);
    await relationship.save();

    const partnerId = user.partnerId ? user.partnerId.toString() : null;
    const partnerHugs = partnerId ? (relationship.hugs.get(partnerId) || 0) : 0;

    // Only one notification per batch to avoid spam
    createNotification({
      actorId: user._id.toString(),
      type: "hug_sent",
      entityType: "Relationship",
      entityId: relationship._id.toString(),
    });

    res.json({
      success: true,
      myHugs: currentHugs + count,
      partnerHugs,
    });
  } catch (error) {
    console.error("Increment hugs error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
