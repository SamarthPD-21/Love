import * as cheerio from "cheerio";
import { Movie } from "../models/Movie";
import { User } from "../models/User";
import { emitToUser } from "../sockets";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function normalizeTitle(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

// ---------------------------------------------------------------------------
// Source 1 – 1hd.art  (works from residential IPs / extension fallback)
// ---------------------------------------------------------------------------

export async function fetchWatchLinkFrom1HD(
  title: string,
  type: "movie" | "show"
): Promise<string | null> {
  try {
    const searchUrl = `https://1hd.art/search?keyword=${encodeURIComponent(title)}`;
    
    // Import got-scraping dynamically to bypass CommonJS/ESM compilation rewriting
    const { gotScraping } = await eval('import("got-scraping")');
    
    const response = await gotScraping({
      url: searchUrl,
      headerGeneratorOptions: {
        browsers: [
          { name: 'chrome', minVersion: 120 }
        ],
        devices: ['desktop'],
        operatingSystems: ['windows', 'linux']
      }
    });

    if (response.statusCode !== 200) {
      throw new Error(`Failed to fetch 1hd.art, status: ${response.statusCode}`);
    }

    const html = response.body;
    const $ = cheerio.load(html);
    const results: Array<{ href: string; title: string; type: string }> = [];

    $(".film-list .item-film").each((_, element) => {
      const href = $(element).find("a.film-mask").attr("href");
      const filmTitle =
        $(element).find("h3.film-name a").attr("title") ||
        $(element).find("h3.film-name a").text();
      const filmType = $(element).find(".film-info .item").first().text();

      if (href) {
        results.push({
          href: href.startsWith("http") ? href : `https://1hd.art${href}`,
          title: filmTitle,
          type: filmType,
        });
      }
    });

    if (!results.length) return null;

    const targetType = type === "movie" ? "movie" : "tv";
    const norm = normalizeTitle(title);

    const pick =
      results.find((r) => r.type.toLowerCase().includes(targetType) && normalizeTitle(r.title) === norm) ||
      results.find((r) => normalizeTitle(r.title) === norm) ||
      results.find((r) => r.type.toLowerCase().includes(targetType)) ||
      results[0];

    return pick?.href ?? null;
  } catch (err) {
    console.error(`fetchWatchLinkFrom1HD error for "${title}":`, err);
    return null;
  }
}

// ---------------------------------------------------------------------------
// Source 2 – Wikidata SPARQL → IMDB ID → VidSrc embed
//   • 100 % free, no API key, no registration, run by Wikimedia Foundation
//   • Returns a VidSrc embed URL like https://vidsrc.to/embed/movie/tt1234567
// ---------------------------------------------------------------------------

interface WikidataResult {
  results: {
    bindings: Array<{
      imdbID?: { value: string };
      wikidataClass?: { value: string };
    }>;
  };
}

async function fetchImdbIdFromWikidata(
  title: string,
  type: "movie" | "show"
): Promise<string | null> {
  try {
    // Q11424 = film, Q5398426 = television series
    const typeFilter =
      type === "movie"
        ? `VALUES ?class { wd:Q11424 wd:Q29168811 wd:Q24869 }`   // film / animated film / short film
        : `VALUES ?class { wd:Q5398426 wd:Q21191270 wd:Q63952888 }`;  // TV series / miniseries / web series

    // Try case-insensitive label match first, then looser CONTAINS search
    const escapedTitle = title.replace(/"/g, '\\"');
    const sparqlExact = `
      SELECT ?imdbID WHERE {
        ${typeFilter}
        ?item wdt:P31 ?class .
        ?item wdt:P345 ?imdbID .
        ?item rdfs:label ?label .
        FILTER(LCASE(STR(?label)) = LCASE("${escapedTitle}"))
      }
      LIMIT 3
    `;

    const sparqlFuzzy = `
      SELECT ?imdbID ?label WHERE {
        ${typeFilter}
        ?item wdt:P31 ?class .
        ?item wdt:P345 ?imdbID .
        ?item rdfs:label ?label .
        FILTER(CONTAINS(LCASE(STR(?label)), LCASE("${escapedTitle}")))
      }
      LIMIT 5
    `;

    const endpoint = "https://query.wikidata.org/sparql";
    const headers = {
      Accept: "application/sparql-results+json",
      "User-Agent": "LoveCinemaBot/1.0 (https://github.com/SamarthPD-21/Love-Cinema-Sync)",
    };

    // Try exact first
    let res = await fetch(`${endpoint}?query=${encodeURIComponent(sparqlExact)}`, { headers });
    if (res.ok) {
      const json = (await res.json()) as WikidataResult;
      const bindings = json.results?.bindings ?? [];
      if (bindings.length > 0 && bindings[0].imdbID) {
        const id = bindings[0].imdbID.value;
        console.log(`[MovieBot] Wikidata exact match for "${title}": ${id}`);
        return id;
      }
    }

    // Fuzzy fallback
    res = await fetch(`${endpoint}?query=${encodeURIComponent(sparqlFuzzy)}`, { headers });
    if (!res.ok) throw new Error(`Wikidata SPARQL status ${res.status}`);
    const json = (await res.json()) as WikidataResult;
    const bindings = json.results?.bindings ?? [];
    if (bindings.length > 0 && bindings[0].imdbID) {
      const id = bindings[0].imdbID.value;
      console.log(`[MovieBot] Wikidata fuzzy match for "${title}": ${id}`);
      return id;
    }

    return null;
  } catch (err) {
    console.error(`fetchImdbIdFromWikidata error for "${title}":`, err);
    return null;
  }
}

async function fetchWatchLinkFromVidSrc(
  title: string,
  type: "movie" | "show"
): Promise<string | null> {
  const imdbId = await fetchImdbIdFromWikidata(title, type);
  if (!imdbId) return null;

  const mediaType = type === "movie" ? "movie" : "tv";
  const url = `https://vidsrc.to/embed/${mediaType}/${imdbId}`;
  console.log(`[MovieBot] VidSrc URL for "${title}": ${url}`);
  return url;
}

// ---------------------------------------------------------------------------
// Main orchestrator
// ---------------------------------------------------------------------------

export async function fetchWatchLink(movieId: string): Promise<void> {
  try {
    const movie = await Movie.findById(movieId);
    if (!movie) {
      console.warn(`[MovieBot] Movie not found: ${movieId}`);
      return;
    }

    console.log(`[MovieBot] Resolving link for "${movie.title}" (${movie.type})...`);

    // Attempt 1: 1hd.art (fast, works on residential IPs)
    let link = await fetchWatchLinkFrom1HD(movie.title, movie.type);

    // Attempt 2: Wikidata → VidSrc (always works on Render, no API key needed)
    if (!link) {
      console.log(`[MovieBot] 1hd.art blocked, trying Wikidata → VidSrc for "${movie.title}"...`);
      link = await fetchWatchLinkFromVidSrc(movie.title, movie.type);
    }

    if (link) {
      movie.watchLink = link;
      await movie.save();
      console.log(`[MovieBot] ✅ Saved link for "${movie.title}": ${link}`);

      emitToUser(movie.userId.toString(), "movie_updated", movie);
      const user = await User.findById(movie.userId);
      if (user?.partnerId) {
        emitToUser(user.partnerId.toString(), "movie_updated", movie);
      }
    } else {
      // Attempt 3: Extension fallback (works if the browser extension is connected)
      console.log(
        `[MovieBot] No server-side link found for "${movie.title}". Requesting via extension...`
      );
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
