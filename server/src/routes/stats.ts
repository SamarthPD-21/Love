import { Router, Response } from "express";
import { authMiddleware } from "../middleware/auth";
import { User } from "../models/User";
import { Memory } from "../models/Memory";
import { Letter } from "../models/Letter";
import { VoiceNote } from "../models/VoiceNote";
import { Dream } from "../models/Dream";
import { Song } from "../models/Song";
import { Gratitude } from "../models/Gratitude";
import { Relationship } from "../models/Relationship";

const router = Router();
router.use(authMiddleware);

// GET /api/stats
router.get("/", async (req: any, res: Response) => {
  try {
    const user = await User.findById(req.userId);
    if (!user || !user.relationshipId) {
      res.status(404).json({ error: "Relationship not found" });
      return;
    }

    const relationship = await Relationship.findById(user.relationshipId);
    if (!relationship) {
      res.status(404).json({ error: "Relationship not found" });
      return;
    }

    // Anniversary diff days
    const anniversary = new Date(relationship.startDate);
    const diffTime = Math.abs(Date.now() - anniversary.getTime());
    const togetherDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    // Parallel counts
    const [
      memoriesCount,
      lettersCount,
      voiceNotesCount,
      dreamsTotal,
      dreamsCompleted,
      songsCount,
      gratitudesCount
    ] = await Promise.all([
      Memory.countDocuments({ relationshipId: user.relationshipId }),
      Letter.countDocuments({ relationshipId: user.relationshipId }),
      VoiceNote.countDocuments({ relationshipId: user.relationshipId }),
      Dream.countDocuments({ relationshipId: user.relationshipId }),
      Dream.countDocuments({ relationshipId: user.relationshipId, isCompleted: true }),
      Song.countDocuments({ relationshipId: user.relationshipId }),
      Gratitude.countDocuments({ relationshipId: user.relationshipId }),
    ]);

    res.json({
      success: true,
      data: {
        togetherDays,
        memoriesCount,
        lettersCount,
        voiceNotesCount,
        dreamsCount: {
          total: dreamsTotal,
          completed: dreamsCompleted,
        },
        songsCount,
        gratitudesCount,
      },
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
