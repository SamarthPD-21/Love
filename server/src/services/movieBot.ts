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
// Source -1 – vidking.net (scrapes DuckDuckGo for TMDB IDs)
// ---------------------------------------------------------------------------

export async function fetchWatchLinkFromVidking(
  title: string,
  type: "movie" | "show"
): Promise<string | null> {
  try {
    const targetSite = type === "movie" ? "themoviedb.org/movie" : "themoviedb.org/tv";
    const query = `site:${targetSite} ${title}`;
    const searchUrl = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`;

    const res = await fetch(searchUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      }
    });

    if (!res.ok) {
      throw new Error(`DDG status: ${res.status}`);
    }

    const html = await res.text();
    const regex = type === "movie"
      ? /themoviedb\.org\/movie\/(\d+)/i
      : /themoviedb\.org\/tv\/(\d+)/i;

    const decodedHtml = decodeURIComponent(html);
    const match = regex.exec(decodedHtml);

    if (match) {
      const tmdbId = match[1];
      const mediaType = type === "movie" ? "movie" : "tv";
      const embedUrl = `https://www.vidking.net/embed/${mediaType}/${tmdbId}`;

      const check = await fetch(embedUrl, {
        method: "HEAD",
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        }
      });

      if (check.ok) {
        console.log(`[MovieBot] Vidking watchLink resolved for "${title}": ${embedUrl}`);
        return embedUrl;
      }
    }
  } catch (err) {
    console.error(`[MovieBot] fetchWatchLinkFromVidking error for "${title}":`, err);
  }
  return null;
}

// ---------------------------------------------------------------------------
// Source 0 – netmirror.global (scrapes netmirror search API)
// ---------------------------------------------------------------------------

export async function fetchWatchLinkFromNetMirror(
  title: string,
  type: "movie" | "show"
): Promise<string | null> {
  try {
    const query = title.trim();
    const searchUrl = `https://api2.imdb4.shop/api/search2/${encodeURIComponent(query)}?page=0`;

    const response = await fetch(searchUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Origin": "https://netmirror.global",
        "Referer": "https://netmirror.global/"
      }
    });

    if (!response.ok) {
      throw new Error(`NetMirror API status: ${response.status}`);
    }

    const data: any = await response.json();
    const results = data.results || [];

    if (!results.length) return null;

    const targetType = type === "movie" ? "movie" : "tv";
    const norm = normalizeTitle(title);

    // Filter results matching target media type
    const matched = results.filter((r: any) => {
      const mediaType = r.media_type === "movie" ? "movie" : "tv";
      return mediaType === targetType;
    });

    if (!matched.length) return null;

    // Find exact match
    const exactMatch = matched.find((r: any) => normalizeTitle(r.title) === norm);
    const bestResult = exactMatch || matched[0];

    if (bestResult) {
      const mediaType = bestResult.media_type === "movie" ? "movie" : "tv";
      return `https://netmirror.global/${mediaType}/${bestResult.id}`;
    }
  } catch (err) {
    console.error(`[MovieBot] fetchWatchLinkFromNetMirror error for "${title}":`, err);
  }
  return null;
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
      tmdbID?: { value: string };
      wikidataClass?: { value: string };
    }>;
  };
}

async function fetchIdsFromWikidata(
  title: string,
  type: "movie" | "show"
): Promise<{ imdbId: string | null; tmdbId: string | null }> {
  try {
    // Q11424 = film, Q5398426 = television series
    const typeFilter =
      type === "movie"
        ? `VALUES ?class { wd:Q11424 wd:Q29168811 wd:Q24869 }`   // film / animated film / short film
        : `VALUES ?class { wd:Q5398426 wd:Q21191270 wd:Q63952888 }`;  // TV series / miniseries / web series

    // Try case-insensitive label match first, then looser CONTAINS search
    const escapedTitle = title.replace(/"/g, '\\"');
    const sparqlExact = `
      SELECT ?imdbID ?tmdbID WHERE {
        ${typeFilter}
        ?item wdt:P31 ?class .
        ?item wdt:P345 ?imdbID .
        OPTIONAL { ?item wdt:P4947 ?tmdbID . }
        ?item rdfs:label ?label .
        FILTER(LCASE(STR(?label)) = LCASE("${escapedTitle}"))
      }
      LIMIT 3
    `;

    const sparqlFuzzy = `
      SELECT ?imdbID ?tmdbID ?label WHERE {
        ${typeFilter}
        ?item wdt:P31 ?class .
        ?item wdt:P345 ?imdbID .
        OPTIONAL { ?item wdt:P4947 ?tmdbID . }
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
    let imdbId: string | null = null;
    let tmdbId: string | null = null;
    if (res.ok) {
      const json = (await res.json()) as WikidataResult;
      const bindings = json.results?.bindings ?? [];
      if (bindings.length > 0 && bindings[0].imdbID) {
        imdbId = bindings[0].imdbID.value;
        if (bindings[0].tmdbID) tmdbId = bindings[0].tmdbID.value;
        console.log(`[MovieBot] Wikidata exact match for "${title}": IMDB=${imdbId}, TMDB=${tmdbId}`);
        return { imdbId, tmdbId };
      }
    }

    // Fuzzy fallback
    res = await fetch(`${endpoint}?query=${encodeURIComponent(sparqlFuzzy)}`, { headers });
    if (!res.ok) throw new Error(`Wikidata SPARQL status ${res.status}`);
    const json = (await res.json()) as WikidataResult;
    const bindings = json.results?.bindings ?? [];
    if (bindings.length > 0 && bindings[0].imdbID) {
      imdbId = bindings[0].imdbID.value;
      if (bindings[0].tmdbID) tmdbId = bindings[0].tmdbID.value;
      console.log(`[MovieBot] Wikidata fuzzy match for "${title}": IMDB=${imdbId}, TMDB=${tmdbId}`);
      return { imdbId, tmdbId };
    }

    return { imdbId: null, tmdbId: null };
  } catch (err) {
    console.error(`fetchIdsFromWikidata error for "${title}":`, err);
    return { imdbId: null, tmdbId: null };
  }
}

async function fetchWatchLinkFromVidSrc(
  title: string,
  type: "movie" | "show"
): Promise<string | null> {
  const { imdbId, tmdbId } = await fetchIdsFromWikidata(title, type);
  if (!imdbId && !tmdbId) return null;

  const mediaType = type === "movie" ? "movie" : "tv";

  // Build embed sources list: IMDB-based sources + TMDB-based sources
  const embedSources: Array<{ name: string; url: string }> = [];

  if (imdbId) {
    embedSources.push(
      { name: "VidSrc.to", url: `https://vidsrc.to/embed/${mediaType}/${imdbId}` },
      { name: "VidSrcMe.ru", url: `https://vidsrcme.ru/embed/${mediaType}/${imdbId}` },
      { name: "VidSrc.xyz", url: `https://vidsrc.xyz/embed/${mediaType}/${imdbId}` },
      { name: "Embed.su", url: `https://embed.su/embed/${mediaType}/${imdbId}` },
      { name: "AutoEmbed", url: `https://player.autoembed.cc/embed/${mediaType}/${imdbId}` },
      { name: "2Embed", url: `https://2embed.cc/embed/${imdbId}` },
      { name: "SmashyStream", url: `https://player.smashy.stream/${mediaType}/${imdbId}` },
    );
  }

  if (tmdbId) {
    embedSources.push(
      { name: "Cineby", url: `https://www.cineby.at/${mediaType}/${tmdbId}` },
      { name: "BFlix", url: `https://bflixs.us/${mediaType}/${tmdbId}` },
    );
  }

  // Quick HEAD check to find first responding source
  for (const source of embedSources) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 4000);
      const res = await fetch(source.url, {
        method: "HEAD",
        signal: controller.signal,
        redirect: "follow",
      });
      clearTimeout(timeout);
      if (res.ok || res.status === 302 || res.status === 301) {
        console.log(`[MovieBot] ${source.name} responded for "${title}": ${source.url}`);
        return source.url;
      }
    } catch {
      // Source timed out or errored, try next
    }
  }

  // Fallback: return first available embed anyway (may work client-side with extension headers)
  const fallback = embedSources[0]?.url;
  if (fallback) {
    console.log(`[MovieBot] No embed source responded via HEAD, using fallback for "${title}": ${fallback}`);
    return fallback;
  }
  return null;
}

// ---------------------------------------------------------------------------
// Source 0 – Cineby (cineby.at - FIRST option)
// ---------------------------------------------------------------------------

export async function fetchWatchLinkFromCineby(
  title: string,
  type: "movie" | "show"
): Promise<string | null> {
  try {
    const { tmdbId } = await fetchIdsFromWikidata(title, type);
    if (tmdbId) {
      const mediaType = type === "movie" ? "movie" : "tv";
      const cinebyUrl = `https://www.cineby.at/${mediaType}/${tmdbId}`;
      console.log(`[MovieBot] Cineby resolved for "${title}": ${cinebyUrl}`);
      return cinebyUrl;
    }
  } catch (err) {
    console.error(`[MovieBot] fetchWatchLinkFromCineby error for "${title}":`, err);
  }
  return null;
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

    if (movie.watchLink && movie.watchLink.trim() !== "") {
      console.log(`[MovieBot] Movie "${movie.title}" already has a watchLink. Skipping resolution.`);
      return;
    }

    console.log(`[MovieBot] Resolving link for "${movie.title}" (${movie.type})...`);

    // Attempt 1: Cineby (cineby.at - FIRST option)
    console.log(`[MovieBot] Trying Cineby (first option) for "${movie.title}"...`);
    let link = await fetchWatchLinkFromCineby(movie.title, movie.type);

    // Attempt 2: 1hd.art / 1hd.to (SECOND option)
    if (!link) {
      console.log(`[MovieBot] Trying 1hd.art (second option) for "${movie.title}"...`);
      link = await fetchWatchLinkFrom1HD(movie.title, movie.type);
    }

    // Attempt 3: vidking.net
    if (!link) {
      console.log(`[MovieBot] Trying Vidking for "${movie.title}"...`);
      link = await fetchWatchLinkFromVidking(movie.title, movie.type);
    }

    // Attempt 4: Wikidata → VidSrc
    if (!link) {
      console.log(`[MovieBot] Trying Wikidata → VidSrc for "${movie.title}"...`);
      link = await fetchWatchLinkFromVidSrc(movie.title, movie.type);
    }

    // Attempt 5: NetMirror (last fallback only)
    if (!link) {
      console.log(`[MovieBot] Trying NetMirror fallback for "${movie.title}"...`);
      link = await fetchWatchLinkFromNetMirror(movie.title, movie.type);
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
      // Attempt 6: Extension fallback (works if the browser extension is connected)
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
