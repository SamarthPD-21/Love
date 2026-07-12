import { Router, Response } from "express";
import { authMiddleware } from "../middleware/auth";
import { MemoryJarNote } from "../models/MemoryJarNote";
import { User } from "../models/User";
import { z } from "zod";

const router = Router();
router.use(authMiddleware);

const noteSchema = z.object({
  content: z.string().min(1, "Note content cannot be empty"),
});

// GET /api/memory-jar
router.get("/", async (req: any, res: Response) => {
  try {
    const user = await User.findById(req.userId);
    if (!user || !user.relationshipId) {
      res.status(404).json({ error: "Relationship not found" });
      return;
    }

    const notes = await MemoryJarNote.find({ 
      relationshipId: user.relationshipId,
      isDrawn: true
    })
      .populate("userId", "name avatar")
      .sort({ drawnAt: -1, createdAt: -1 });

    const undrawnCount = await MemoryJarNote.countDocuments({
      relationshipId: user.relationshipId,
      isDrawn: false
    });

    res.json({ success: true, data: notes, undrawnCount });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/memory-jar/draw
router.get("/draw", async (req: any, res: Response) => {
  try {
    const user = await User.findById(req.userId);
    if (!user || !user.relationshipId) {
      res.status(404).json({ error: "Relationship not found" });
      return;
    }

    const count = await MemoryJarNote.countDocuments({ 
      relationshipId: user.relationshipId,
      isDrawn: false 
    });
    
    if (count === 0) {
      res.json({ success: true, data: null });
      return;
    }

    const randomIndex = Math.floor(Math.random() * count);
    const randomNote = await MemoryJarNote.findOne({ 
      relationshipId: user.relationshipId,
      isDrawn: false 
    })
      .skip(randomIndex)
      .populate("userId", "name avatar");

    if (randomNote) {
      randomNote.isDrawn = true;
      randomNote.drawnAt = new Date();
      await randomNote.save();
    }

    res.json({ success: true, data: randomNote });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/memory-jar
router.post("/", async (req: any, res: Response) => {
  try {
    const validation = noteSchema.safeParse(req.body);
    if (!validation.success) {
      res.status(400).json({ error: validation.error.errors[0].message });
      return;
    }

    const user = await User.findById(req.userId);
    if (!user || !user.relationshipId) {
      res.status(404).json({ error: "Relationship not found" });
      return;
    }

    const note = new MemoryJarNote({
      content: validation.data.content,
      relationshipId: user.relationshipId,
      userId: user._id,
      isDrawn: false,
    });

    await note.save();
    const populated = await note.populate("userId", "name avatar");

    res.status(201).json({ success: true, data: populated });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// DELETE /api/memory-jar/:id
router.delete("/:id", async (req: any, res: Response) => {
  try {
    const user = await User.findById(req.userId);
    if (!user || !user.relationshipId) {
      res.status(404).json({ error: "Relationship not found" });
      return;
    }

    const note = await MemoryJarNote.findOneAndDelete({
      _id: req.params.id,
      relationshipId: user.relationshipId,
    });

    if (!note) {
      res.status(404).json({ error: "Note not found" });
      return;
    }

    res.json({ success: true, message: "Note deleted successfully" });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
