import * as cheerio from "cheerio";
import { Movie } from "../models/Movie";
import { User } from "../models/User";
import { emitToUser } from "../sockets";

/**
 * Normalizes title string for robust match comparison.
 */
function normalizeTitle(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, "") // remove special characters
    .replace(/\s+/g, " ")       // normalize spaces
    .trim();
}

/**
 * Fetch search page and resolve the streaming link from 1hd.art.
 */
export async function fetchWatchLinkFrom1HD(
  title: string,
  type: "movie" | "show"
): Promise<string | null> {
  try {
    const searchUrl = `https://1hd.art/search?keyword=${encodeURIComponent(title)}`;
    
    const response = await fetch(searchUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch 1hd.art search, status: ${response.status}`);
    }

    const html = await response.text();
    const $ = cheerio.load(html);
    const results: Array<{ href: string; title: string; type: string; year: string }> = [];

    $(".film-list .item-film").each((_, element) => {
      const href = $(element).find("a.film-mask").attr("href");
      const filmNameLink = $(element).find("h3.film-name a");
      const filmTitle = filmNameLink.attr("title") || filmNameLink.text();
      const filmType = $(element).find(".film-info .item").first().text();
      const filmYear = $(element).find(".film-info .item").last().text();

      if (href) {
        // Ensure link is fully qualified
        const watchUrl = href.startsWith("http") ? href : `https://1hd.art${href}`;
        results.push({
          href: watchUrl,
          title: filmTitle,
          type: filmType,
          year: filmYear,
        });
      }
    });

    if (results.length === 0) {
      return null;
    }

    // Match criteria:
    // 1. Match type (1hd.art types: "Movie" or "TV")
    const targetType = type === "movie" ? "movie" : "tv";
    
    // Find best match by comparing normalized titles
    const normalizedTarget = normalizeTitle(title);
    
    let bestMatch = results.find((r) => {
      const matchTypeOk = r.type.toLowerCase().includes(targetType);
      const matchTitleOk = normalizeTitle(r.title) === normalizedTarget;
      return matchTypeOk && matchTitleOk;
    });

    // Fallback 1: Match by title only (any type)
    if (!bestMatch) {
      bestMatch = results.find((r) => normalizeTitle(r.title) === normalizedTarget);
    }

    // Fallback 2: Match by type only (first item of this type)
    if (!bestMatch) {
      bestMatch = results.find((r) => r.type.toLowerCase().includes(targetType));
    }

    // Fallback 3: Return first result overall
    if (!bestMatch) {
      bestMatch = results[0];
    }

    return bestMatch.href;
  } catch (err) {
    console.error(`fetchWatchLinkFrom1HD error for "${title}":`, err);
    return null;
  }
}

/**
 * Background worker task to fetch watchLink and save to database.
 * Real-time emits updates to connection users.
 */
export async function fetchWatchLink(movieId: string): Promise<void> {
  try {
    const movie = await Movie.findById(movieId);
    if (!movie) {
      console.warn(`[MovieBot] Movie not found: ${movieId}`);
      return;
    }

    console.log(`[MovieBot] Fetching link for "${movie.title}" (${movie.type})...`);
    const link = await fetchWatchLinkFrom1HD(movie.title, movie.type);

    if (link) {
      movie.watchLink = link;
      await movie.save();
      console.log(`[MovieBot] Successfully found link for "${movie.title}": ${link}`);

      // Emit update to both users so the UI refreshes in real-time
      emitToUser(movie.userId.toString(), "movie_updated", movie);
      
      const user = await User.findById(movie.userId);
      if (user && user.partnerId) {
        emitToUser(user.partnerId.toString(), "movie_updated", movie);
      }
    } else {
      console.log(`[MovieBot] No link found for "${movie.title}" on 1hd.art`);
    }
  } catch (err) {
    console.error(`[MovieBot] Failed resolving watch link for movie: ${movieId}`, err);
  }
}
