import { Router, Response } from "express";
import { authMiddleware } from "../middleware/auth";
import { Notification } from "../models/Notification";
import { User } from "../models/User";

const router = Router();

// Authenticate all routes
router.use(authMiddleware);

/**
 * GET /api/notifications
 * List notifications for the current user (newest first).
 * Optional ?limit=30 and ?before=<isoDate> for cursor pagination.
 */
router.get("/", async (req: any, res: Response) => {
  try {
    const user = await User.findById(req.userId);
    if (!user) {
      res.status(404).json({ error: "User not found" });
      return;
    }

    const limit = Math.min(parseInt(req.query.limit as string) || 30, 100);
    const before = req.query.before ? new Date(req.query.before as string) : undefined;

    const filter: Record<string, unknown> = { recipientUserId: user._id };
    if (before) {
      filter.createdAt = { $lt: before };
    }

    const notifications = await Notification.find(filter)
      .populate("actorUserId", "name avatar")
      .sort({ createdAt: -1 })
      .limit(limit);

    res.json({ success: true, data: notifications });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/notifications/unread-count
 * Cheap count used by the bell badge + polling fallback.
 */
router.get("/unread-count", async (req: any, res: Response) => {
  try {
    const user = await User.findById(req.userId);
    if (!user) {
      res.status(404).json({ error: "User not found" });
      return;
    }

    const count = await Notification.countDocuments({
      recipientUserId: user._id,
      isRead: false,
    });

    res.json({ success: true, count });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * PATCH /api/notifications/read
 * Mark all of the current user's notifications as read.
 */
router.patch("/read", async (req: any, res: Response) => {
  try {
    const user = await User.findById(req.userId);
    if (!user) {
      res.status(404).json({ error: "User not found" });
      return;
    }

    await Notification.updateMany(
      { recipientUserId: user._id, isRead: false },
      { $set: { isRead: true } }
    );

    res.json({ success: true, message: "All notifications marked as read" });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * PATCH /api/notifications/:id/read
 * Mark a single notification as read.
 */
router.patch("/:id/read", async (req: any, res: Response) => {
  try {
    const user = await User.findById(req.userId);
    if (!user) {
      res.status(404).json({ error: "User not found" });
      return;
    }

    const notification = await Notification.findOneAndUpdate(
      { _id: req.params.id, recipientUserId: user._id },
      { $set: { isRead: true } },
      { new: true }
    );

    if (!notification) {
      res.status(404).json({ error: "Notification not found" });
      return;
    }

    res.json({ success: true, data: notification });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * DELETE /api/notifications/:id
 * Dismiss a single notification.
 */
router.delete("/:id", async (req: any, res: Response) => {
  try {
    const user = await User.findById(req.userId);
    if (!user) {
      res.status(404).json({ error: "User not found" });
      return;
    }

    const notification = await Notification.findOneAndDelete({
      _id: req.params.id,
      recipientUserId: user._id,
    });

    if (!notification) {
      res.status(404).json({ error: "Notification not found" });
      return;
    }

    res.json({ success: true, message: "Notification dismissed" });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
