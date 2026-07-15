import { Router, Response } from "express";
import { authMiddleware } from "../middleware/auth";
import { Song } from "../models/Song";
import { User } from "../models/User";
import { createNotification } from "../services/notify";
import { z } from "zod";
import * as cheerio from "cheerio";

const router = Router();
router.use(authMiddleware);

const songSchema = z.object({
  title: z.string().min(1, "Title is required"),
  artist: z.string().min(1, "Artist is required"),
  url: z.string().url("Must be a valid Youtube or Spotify link"),
  spotifyUrl: z.string().optional(),
  youtubeUrl: z.string().optional(),
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

const searchYoutubeDetails = async (queryStr: string): Promise<{ videoId: string; url: string } | null> => {
  try {
    const query = encodeURIComponent(queryStr);
    const searchUrl = `https://www.youtube.com/results?search_query=${query}`;
    const response = await fetch(searchUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"
      }
    });
    if (!response.ok) return null;
    const html = await response.text();
    const videoIdMatch = html.match(/"videoId"\s*:\s*"([a-zA-Z0-9_-]{11})"/);
    if (videoIdMatch) {
      return {
        videoId: videoIdMatch[1],
        url: `https://www.youtube.com/watch?v=${videoIdMatch[1]}`
      };
    }
    const watchMatch = html.match(/\/watch\?v=([a-zA-Z0-9_-]{11})/);
    if (watchMatch) {
      return {
        videoId: watchMatch[1],
        url: `https://www.youtube.com/watch?v=${watchMatch[1]}`
      };
    }
  } catch (err) {
    console.error("Failed to fetch YouTube details for query:", queryStr, err);
  }
  return null;
};

const fetchYoutubeVideoTitle = async (url: string): Promise<string> => {
  try {
    const response = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"
      }
    });
    if (!response.ok) return "";
    const html = await response.text();
    const $ = cheerio.load(html);
    let title = $("title").text().trim();
    title = title.replace(/\s*-\s*YouTube$/i, "").trim();
    return title;
  } catch (err) {
    console.error("Failed to fetch YouTube video title:", err);
  }
  return "";
};

const searchSpotifyDetails = async (queryStr: string): Promise<{ url: string; title: string; artist: string } | null> => {
  try {
    const query = `site:open.spotify.com/track ${queryStr}`;
    const searchUrl = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`;
    const response = await fetch(searchUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"
      }
    });
    if (!response.ok) return null;
    const html = await response.text();
    const $ = cheerio.load(html);
    let trackUrl = "";
    let trackTitle = "";

    $(".result").each((_i, el) => {
      if (trackUrl) return;
      const link = $(el).find(".result__a").attr("href");
      if (link && link.includes("open.spotify.com/track")) {
        try {
          const fullLink = link.startsWith("//") ? `https:${link}` : link;
          if (fullLink.startsWith("http")) {
            const urlObj = new URL(fullLink);
            const uddg = urlObj.searchParams.get("uddg");
            if (uddg) {
              trackUrl = uddg;
            } else {
              trackUrl = urlObj.toString();
            }
          } else {
            trackUrl = link;
          }
        } catch (e) {
          trackUrl = link;
        }
        trackTitle = $(el).find(".result__a").text().trim();
      }
    });

    if (trackUrl) {
      let title = queryStr;
      let artist = "Spotify Track";

      if (trackTitle) {
        const cleanTitle = trackTitle.replace(/\s*\|\s*Spotify/i, "").trim();
        if (cleanTitle.includes(" - song by ")) {
          const parts = cleanTitle.split(" - song by ");
          title = parts[0].trim();
          artist = parts[1].trim();
        } else if (cleanTitle.includes(" by ")) {
          const parts = cleanTitle.split(" by ");
          title = parts[0].trim();
          artist = parts[1].trim();
        } else if (cleanTitle.includes(" - ")) {
          const parts = cleanTitle.split(" - ");
          artist = parts[0].trim();
          title = parts[1].trim();
        } else {
          title = cleanTitle;
        }
      }

      return {
        url: trackUrl,
        title,
        artist,
      };
    }
  } catch (err) {
    console.error("Failed to scrape Spotify link from DDG:", err);
  }
  return null;
};

const fetchSpotifyTrackDetails = async (url: string): Promise<{ title: string; artist: string } | null> => {
  try {
    const spotifyUrl = `https://open.spotify.com/oembed?url=${encodeURIComponent(url)}`;
    const response = await fetch(spotifyUrl);
    if (!response.ok) return null;
    const data: any = await response.json();
    const rawTitle = data.title || "";
    let parsedTitle = rawTitle;
    let parsedArtist = "Spotify Track";

    if (rawTitle.includes(" - song by ")) {
      const parts = rawTitle.split(" - song by ");
      parsedTitle = parts[0];
      parsedArtist = parts[1].replace(" | Spotify", "").trim();
    } else if (rawTitle.includes(" by ")) {
      const parts = rawTitle.split(" by ");
      parsedTitle = parts[0];
      parsedArtist = parts[1].replace(" | Spotify", "").trim();
    }
    return { title: parsedTitle, artist: parsedArtist };
  } catch (e) {
    console.error("Failed to fetch Spotify oembed info:", e);
  }
  return null;
};

// POST /api/songs/fetch-details
// The "bot" that retrieves both Spotify and YouTube links for a given song title or URL
router.post("/fetch-details", async (req: any, res: Response) => {
  try {
    const { url, title, artist, extraDetails } = req.body;

    let resolvedTitle = title || "";
    let resolvedArtist = artist || "";
    let spotifyUrl = "";
    let youtubeUrl = "";
    let youtubeVideoId = "";

    if (url) {
      if (url.includes("spotify.com")) {
        spotifyUrl = url;
        const details = await fetchSpotifyTrackDetails(url);
        if (details) {
          resolvedTitle = details.title;
          resolvedArtist = details.artist;
        }
        const searchTerms = `${resolvedTitle} ${resolvedArtist} ${extraDetails || ""}`.trim();
        const ytDetails = await searchYoutubeDetails(searchTerms);
        if (ytDetails) {
          youtubeUrl = ytDetails.url;
          youtubeVideoId = ytDetails.videoId;
        }
      } else if (url.includes("youtube.com") || url.includes("youtu.be")) {
        youtubeUrl = url;
        youtubeVideoId = extractYoutubeId(url);
        const ytTitle = await fetchYoutubeVideoTitle(url);
        if (ytTitle) {
          resolvedTitle = ytTitle;
        }
        const searchTerms = `${resolvedTitle} ${extraDetails || ""}`.trim();
        const spotDetails = await searchSpotifyDetails(searchTerms);
        if (spotDetails) {
          spotifyUrl = spotDetails.url;
          if (spotDetails.title) resolvedTitle = spotDetails.title;
          if (spotDetails.artist) resolvedArtist = spotDetails.artist;
        }
      }
    } else if (resolvedTitle) {
      const searchTerms = `${resolvedTitle} ${resolvedArtist} ${extraDetails || ""}`.trim();

      const spotDetails = await searchSpotifyDetails(searchTerms);
      if (spotDetails) {
        spotifyUrl = spotDetails.url;
        resolvedTitle = spotDetails.title;
        resolvedArtist = spotDetails.artist;
      }

      const ytDetails = await searchYoutubeDetails(searchTerms);
      if (ytDetails) {
        youtubeUrl = ytDetails.url;
        youtubeVideoId = ytDetails.videoId;
      }
    }

    res.json({
      success: true,
      data: {
        title: resolvedTitle,
        artist: resolvedArtist,
        spotifyUrl,
        youtubeUrl,
        youtubeVideoId,
      }
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

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

    // Background migration: asynchronously resolve missing youtubeVideoIds or links
    songs.forEach(async (song) => {
      let updated = false;
      if (!song.youtubeVideoId) {
        let videoId = "";
        if (song.url.includes("spotify.com")) {
          videoId = await searchYoutubeId(song.title, song.artist);
        } else {
          videoId = extractYoutubeId(song.url);
        }
        if (videoId) {
          song.youtubeVideoId = videoId;
          song.youtubeUrl = `https://www.youtube.com/watch?v=${videoId}`;
          updated = true;
        }
      }
      if (!song.spotifyUrl && song.url.includes("spotify.com")) {
        song.spotifyUrl = song.url;
        updated = true;
      }
      if (!song.youtubeUrl && (song.url.includes("youtube.com") || song.url.includes("youtu.be"))) {
        song.youtubeUrl = song.url;
        updated = true;
      }
      if (updated) {
        await song.save();
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
      if (validation.data.youtubeUrl) {
        youtubeVideoId = extractYoutubeId(validation.data.youtubeUrl);
      } else if (validation.data.url.includes("spotify.com")) {
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

    createNotification({
      actorId: user._id.toString(),
      type: "song_added",
      entityType: "Song",
      entityId: song._id.toString(),
      meta: { detail: `${song.title} — ${song.artist}` },
    });

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
