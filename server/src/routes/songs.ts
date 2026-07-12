import { Router, Response } from "express";
import { authMiddleware } from "../middleware/auth";
import { Song } from "../models/Song";
import { User } from "../models/User";
import { z } from "zod";

const router = Router();
router.use(authMiddleware);

const songSchema = z.object({
  title: z.string().min(1, "Title is required"),
  artist: z.string().min(1, "Artist is required"),
  url: z.string().url("Must be a valid Youtube or Spotify link"),
  notes: z.string().optional(),
  youtubeVideoId: z.string().optional(),
});

const extractYoutubeId = (url: string): string => {
  try {
    const urlObj = new URL(url);
    if (urlObj.hostname.includes("youtu.be")) {
      return urlObj.pathname.substring(1);
    } else if (urlObj.hostname.includes("youtube.com")) {
      return urlObj.searchParams.get("v") || "";
    }
  } catch (e) {}
  return "";
};

const searchYoutubeId = async (title: string, artist: string): Promise<string> => {
  try {
    const query = encodeURIComponent(`${title} ${artist} audio`);
    const searchUrl = `https://www.youtube.com/results?search_query=${query}`;
    const response = await fetch(searchUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"
      }
    });
    if (!response.ok) return "";
    const html = await response.text();
    const videoIdMatch = html.match(/"videoId"\s*:\s*"([a-zA-Z0-9_-]{11})"/);
    if (videoIdMatch) {
      return videoIdMatch[1];
    }
    const watchMatch = html.match(/\/watch\?v=([a-zA-Z0-9_-]{11})/);
    if (watchMatch) {
      return watchMatch[1];
    }
  } catch (err) {
    console.error("Failed to fetch YouTube id for song:", err);
  }
  return "";
};

// POST /api/songs/spotify-info
router.post("/spotify-info", async (req: any, res: Response) => {
  try {
    const { url } = req.body;
    if (!url) {
      res.status(400).json({ error: "URL is required" });
      return;
    }

    const spotifyUrl = `https://open.spotify.com/oembed?url=${encodeURIComponent(url)}`;
    const response = await fetch(spotifyUrl);
    if (!response.ok) {
      res.status(400).json({ error: "Failed to fetch Spotify metadata" });
      return;
    }

    const data: any = await response.json();
    res.json({ success: true, data });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/songs
router.get("/", async (req: any, res: Response) => {
  try {
    const user = await User.findById(req.userId);
    if (!user || !user.relationshipId) {
      res.status(404).json({ error: "Relationship not found" });
      return;
    }

    const songs = await Song.find({ relationshipId: user.relationshipId })
      .populate("userId", "name avatar")
      .sort({ createdAt: -1 });

    // Background migration: asynchronously resolve missing youtubeVideoIds
    songs.forEach(async (song) => {
      if (!song.youtubeVideoId) {
        let videoId = "";
        if (song.url.includes("spotify.com")) {
          videoId = await searchYoutubeId(song.title, song.artist);
        } else {
          videoId = extractYoutubeId(song.url);
        }
        if (videoId) {
          song.youtubeVideoId = videoId;
          await song.save();
        }
      }
    });

    res.json({ success: true, data: songs });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/songs
router.post("/", async (req: any, res: Response) => {
  try {
    const validation = songSchema.safeParse(req.body);
    if (!validation.success) {
      res.status(400).json({ error: validation.error.errors[0].message });
      return;
    }

    const user = await User.findById(req.userId);
    if (!user || !user.relationshipId) {
      res.status(404).json({ error: "Relationship not found" });
      return;
    }

    let youtubeVideoId = validation.data.youtubeVideoId || "";
    if (!youtubeVideoId) {
      if (validation.data.url.includes("spotify.com")) {
        youtubeVideoId = await searchYoutubeId(validation.data.title, validation.data.artist);
      } else {
        youtubeVideoId = extractYoutubeId(validation.data.url);
      }
    }

    const song = new Song({
      ...validation.data,
      youtubeVideoId,
      relationshipId: user.relationshipId,
      userId: user._id,
    });

    await song.save();
    const populated = await song.populate("userId", "name avatar");

    res.status(201).json({ success: true, data: populated });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// DELETE /api/songs/:id
router.delete("/:id", async (req: any, res: Response) => {
  try {
    const user = await User.findById(req.userId);
    if (!user || !user.relationshipId) {
      res.status(404).json({ error: "Relationship not found" });
      return;
    }

    const song = await Song.findOneAndDelete({
      _id: req.params.id,
      relationshipId: user.relationshipId,
    });

    if (!song) {
      res.status(404).json({ error: "Song not found" });
      return;
    }

    res.json({ success: true, message: "Song deleted successfully" });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
