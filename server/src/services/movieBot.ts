import * as cheerio from "cheerio";
import { Movie } from "../models/Movie";
import { User } from "../models/User";
import { emitToUser } from "../sockets";

const TMDB_API_KEY = process.env.TMDB_API_KEY;

/**
 * Normalizes title string for robust match comparison.
 */
function normalizeTitle(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, "") // remove special characters
    .replace(/\s+/g, " ")        // normalize spaces
    .trim();
}

/**
 * Fetch search page and resolve the streaming link from 1hd.art.
 * This only works when the server IP is not blocked by Cloudflare.
 */
export async function fetchWatchLinkFrom1HD(
  title: string,
  type: "movie" | "show"
): Promise<string | null> {
  try {
    const searchUrl = `https://1hd.art/search?keyword=${encodeURIComponent(title)}`;

    const response = await fetch(searchUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9",
        "Accept-Encoding": "gzip, deflate, br",
        "Referer": "https://1hd.art/",
        "sec-ch-ua": '"Chromium";v="124", "Google Chrome";v="124", "Not-A.Brand";v="99"',
        "sec-ch-ua-mobile": "?0",
        "sec-ch-ua-platform": '"Windows"',
        "Sec-Fetch-Dest": "document",
        "Sec-Fetch-Mode": "navigate",
        "Sec-Fetch-Site": "same-origin",
        "Sec-Fetch-User": "?1",
        "Upgrade-Insecure-Requests": "1",
        "Cache-Control": "max-age=0",
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
        const watchUrl = href.startsWith("http") ? href : `https://1hd.art${href}`;
        results.push({ href: watchUrl, title: filmTitle, type: filmType, year: filmYear });
      }
    });

    if (results.length === 0) return null;

    const targetType = type === "movie" ? "movie" : "tv";
    const normalizedTarget = normalizeTitle(title);

    let bestMatch = results.find((r) => {
      const matchTypeOk = r.type.toLowerCase().includes(targetType);
      const matchTitleOk = normalizeTitle(r.title) === normalizedTarget;
      return matchTypeOk && matchTitleOk;
    });
    if (!bestMatch) bestMatch = results.find((r) => normalizeTitle(r.title) === normalizedTarget);
    if (!bestMatch) bestMatch = results.find((r) => r.type.toLowerCase().includes(targetType));
    if (!bestMatch) bestMatch = results[0];

    return bestMatch?.href ?? null;
  } catch (err) {
    console.error(`fetchWatchLinkFrom1HD error for "${title}":`, err);
    return null;
  }
}

/**
 * Look up a movie/show on TMDB and return its numeric ID.
 */
async function fetchTmdbId(
  title: string,
  type: "movie" | "show"
): Promise<number | null> {
  if (!TMDB_API_KEY) return null;

  try {
    const mediaType = type === "movie" ? "movie" : "tv";
    const url = `https://api.themoviedb.org/3/search/${mediaType}?api_key=${TMDB_API_KEY}&query=${encodeURIComponent(title)}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`TMDB status ${res.status}`);
    const json = await res.json() as { results?: { id: number; title?: string; name?: string }[] };
    const results = json.results ?? [];
    if (results.length === 0) return null;

    // Try to find the best title match first
    const norm = normalizeTitle(title);
    const exact = results.find((r) => {
      const t = type === "movie" ? (r.title ?? "") : (r.name ?? "");
      return normalizeTitle(t) === norm;
    });
    return (exact ?? results[0]).id;
  } catch (err) {
    console.error(`fetchTmdbId error for "${title}":`, err);
    return null;
  }
}

/**
 * Build a VidSrc embed URL from a TMDB ID.
 * VidSrc works from any IP and doesn't block datacenters.
 */
function buildVidSrcUrl(tmdbId: number, type: "movie" | "show"): string {
  const mediaType = type === "movie" ? "movie" : "tv";
  // vidsrc.to/embed/{type}/{tmdbId}
  return `https://vidsrc.to/embed/${mediaType}/${tmdbId}`;
}

/**
 * Fallback: resolve a VidSrc embed URL via TMDB.
 */
async function fetchWatchLinkFromVidSrc(
  title: string,
  type: "movie" | "show"
): Promise<string | null> {
  const tmdbId = await fetchTmdbId(title, type);
  if (!tmdbId) {
    console.log(`[MovieBot] No TMDB ID found for "${title}", cannot build VidSrc link.`);
    return null;
  }
  const url = buildVidSrcUrl(tmdbId, type);
  console.log(`[MovieBot] VidSrc fallback for "${title}": ${url}`);
  return url;
}

/**
 * Background worker task to fetch watchLink and save to database.
 * Tries: 1) 1hd.art direct  2) VidSrc via TMDB  3) Extension fallback
 */
export async function fetchWatchLink(movieId: string): Promise<void> {
  try {
    const movie = await Movie.findById(movieId);
    if (!movie) {
      console.warn(`[MovieBot] Movie not found: ${movieId}`);
      return;
    }

    console.log(`[MovieBot] Fetching link for "${movie.title}" (${movie.type})...`);

    // --- Attempt 1: 1hd.art (may be blocked on datacenter IPs) ---
    let link = await fetchWatchLinkFrom1HD(movie.title, movie.type);

    // --- Attempt 2: VidSrc via TMDB (always works) ---
    if (!link) {
      console.log(`[MovieBot] 1hd.art failed for "${movie.title}", trying VidSrc via TMDB...`);
      link = await fetchWatchLinkFromVidSrc(movie.title, movie.type);
    }

    if (link) {
      movie.watchLink = link;
      await movie.save();
      console.log(`[MovieBot] Successfully found link for "${movie.title}": ${link}`);

      emitToUser(movie.userId.toString(), "movie_updated", movie);
      const user = await User.findById(movie.userId);
      if (user && user.partnerId) {
        emitToUser(user.partnerId.toString(), "movie_updated", movie);
      }
    } else {
      // --- Attempt 3: Extension fallback (works if extension is connected) ---
      console.log(`[MovieBot] No link found for "${movie.title}" via any server source. Emitting extension resolution request.`);
      const { getIO } = require("../sockets");
      const io = getIO();
      if (io) {
        const user = await User.findById(movie.userId);
        if (user) {
          io.to(`cinema:${user.relationshipId}`).emit("cinema_resolve_link_request", {
            movieId: movie._id.toString(),
            title: movie.title,
            type: movie.type,
          });
        }
      }
    }
  } catch (err) {
    console.error(`[MovieBot] Failed resolving watch link for movie: ${movieId}`, err);
  }
}
