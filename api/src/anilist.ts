import { db } from "./db.ts";
import { CHAR_PAGE_TTL_MS } from "./config.ts";

const ENDPOINT = "https://graphql.anilist.co";

export interface AniChar {
  id: number;
  favourites: number;
  name: { full: string };
  image: { large: string };
  media?: { nodes: { title: { romaji: string; english?: string | null } }[] };
}

// ── File d'attente : AniList limite a ~30-90 requetes/minute
let chain: Promise<unknown> = Promise.resolve();
let lastCall = 0;
const MIN_GAP_MS = 700;

export function anilist<T>(query: string, variables: Record<string, unknown>): Promise<T> {
  const run = async (): Promise<T> => {
    for (let attempt = 0; attempt < 4; attempt++) {
      const wait = lastCall + MIN_GAP_MS - Date.now();
      if (wait > 0) await sleep(wait);
      lastCall = Date.now();
      const res = await fetch(ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({ query, variables }),
        signal: AbortSignal.timeout(15000),
      });
      if (res.status === 429) {
        const retry = Number(res.headers.get("retry-after") ?? "5");
        await sleep(Math.min(60, retry) * 1000);
        continue;
      }
      const json = (await res.json()) as { data?: T; errors?: { message: string }[] };
      if (!res.ok || !json.data) {
        throw new Error(`AniList ${res.status}: ${json.errors?.map((e) => e.message).join(", ") ?? "?"}`);
      }
      return json.data;
    }
    throw new Error("AniList: trop de requetes, reessaie plus tard");
  };
  const p = chain.then(run, run);
  chain = p.catch(() => undefined);
  return p;
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

// ─────────────────────────────────────────────
// Pages de persos globaux tries par favoris (cache SQLite 7 jours)
// ─────────────────────────────────────────────

const PAGE_QUERY = `
query ($page: Int) {
  Page(page: $page, perPage: 50) {
    characters(sort: FAVOURITES_DESC) {
      id favourites
      name { full }
      image { large }
      media(sort: FAVOURITES_DESC, perPage: 1) { nodes { title { romaji english } } }
    }
  }
}`;

const inflight = new Map<number, Promise<AniChar[]>>();

export async function getCharPage(page: number): Promise<AniChar[]> {
  const row = db.prepare("SELECT fetched_at, data FROM char_pages WHERE page = ?").get(page) as
    | { fetched_at: number; data: string }
    | undefined;
  const fresh = row && Date.now() - row.fetched_at < CHAR_PAGE_TTL_MS;
  if (row && fresh) return JSON.parse(row.data);

  if (!inflight.has(page)) {
    const p = (async () => {
      try {
        const data = await anilist<{ Page: { characters: AniChar[] } }>(PAGE_QUERY, { page });
        const chars = data.Page.characters ?? [];
        if (chars.length) {
          db.prepare("INSERT OR REPLACE INTO char_pages (page, fetched_at, data) VALUES (?, ?, ?)").run(
            page,
            Date.now(),
            JSON.stringify(chars),
          );
        }
        return chars;
      } catch (e) {
        // AniList indisponible : on se rabat sur le cache perime s'il existe
        if (row) return JSON.parse(row.data) as AniChar[];
        throw e;
      } finally {
        inflight.delete(page);
      }
    })();
    inflight.set(page, p);
  }
  return inflight.get(page)!;
}

export function animeTitleOf(c: AniChar): string {
  const t = c.media?.nodes?.[0]?.title;
  return t?.romaji || t?.english || "";
}

// ─────────────────────────────────────────────
// Anime (quiz)
// ─────────────────────────────────────────────

export interface AniAnime {
  id: number;
  title: { romaji: string; english: string | null; native: string | null };
  synonyms: string[];
  coverImage: { extraLarge: string | null; large: string; color: string | null };
  bannerImage: string | null;
  description: string | null;
  genres: string[];
  tags: { name: string; rank: number; isMediaSpoiler: boolean }[];
  averageScore: number | null;
  popularity: number;
  episodes: number | null;
  duration: number | null;
  season: string | null;
  seasonYear: number | null;
  format: string | null;
  status: string | null;
  studios: { nodes: { name: string; isAnimationStudio: boolean }[] };
  trailer: { id: string; site: string } | null;
  siteUrl: string;
}

const ANIME_FIELDS = `
  id
  title { romaji english native }
  synonyms
  coverImage { extraLarge large color }
  bannerImage description(asHtml: false) genres
  tags { name rank isMediaSpoiler }
  averageScore popularity episodes duration season seasonYear format status
  studios { nodes { name isAnimationStudio } }
  trailer { id site }
  siteUrl
`;

export async function randomPopularAnime(excludeIds: Set<number>): Promise<AniAnime> {
  const q = `
  query ($page: Int) {
    Page(page: $page, perPage: 50) {
      pageInfo { lastPage }
      media(type: ANIME, format_in: [TV, TV_SHORT], isAdult: false, popularity_greater: 30000, sort: POPULARITY_DESC) {
        ${ANIME_FIELDS}
      }
    }
  }`;
  // 1er appel pour connaitre le nombre de pages
  const first = await anilist<{ Page: { pageInfo: { lastPage: number }; media: AniAnime[] } }>(q, { page: 1 });
  const lastPage = Math.max(1, first.Page.pageInfo.lastPage);
  for (let attempt = 0; attempt < 6; attempt++) {
    const page = 1 + Math.floor(Math.random() * lastPage);
    const data = page === 1 ? first : await anilist<typeof first>(q, { page });
    const pool = data.Page.media.filter(
      (m) =>
        !excludeIds.has(m.id) &&
        !m.tags.some((t) => t.name.toLowerCase() === "hentai") &&
        // Il faut un vrai synopsis pour l'indice 2
        (m.description ?? "").replace(/<[^>]+>/g, "").length >= 350,
    );
    if (pool.length) return pool[Math.floor(Math.random() * pool.length)];
  }
  throw new Error("Aucun anime disponible pour le quiz");
}

// ─────────────────────────────────────────────
// Quiz : synopsis long (MyAnimeList via Jikan) + noms des persos a masquer
// ─────────────────────────────────────────────

export interface QuizExtra {
  idMal: number | null;
  /** Synopsis le plus long trouve (MAL, sinon AniList). */
  longSynopsis: string | null;
  /** Prenoms, noms, surnoms des persos de l'anime. */
  charNames: string[];
}

const EXTRA_QUERY = `
query ($id: Int, $page: Int) {
  Media(id: $id) {
    idMal
    characters(sort: [ROLE, RELEVANCE, ID], perPage: 25, page: $page) {
      pageInfo { hasNextPage }
      nodes { name { first middle last full native alternative userPreferred } }
    }
  }
}`;

type ExtraName = {
  first: string | null;
  middle: string | null;
  last: string | null;
  full: string | null;
  native: string | null;
  alternative: string[] | null;
  userPreferred: string | null;
};

export async function quizExtra(animeId: number): Promise<QuizExtra> {
  const names = new Set<string>();
  let idMal: number | null = null;
  for (let page = 1; page <= 3; page++) {
    const d = await anilist<{
      Media: { idMal: number | null; characters: { pageInfo: { hasNextPage: boolean }; nodes: { name: ExtraName }[] } };
    }>(EXTRA_QUERY, { id: animeId, page });
    idMal = d.Media.idMal;
    for (const { name } of d.Media.characters.nodes) {
      for (const n of [name.first, name.middle, name.last, name.full, name.native, name.userPreferred, ...(name.alternative ?? [])]) {
        if (n && n.trim()) names.add(n.trim());
      }
    }
    if (!d.Media.characters.pageInfo.hasNextPage) break;
  }
  let longSynopsis: string | null = null;
  if (idMal) {
    // MAL (via Jikan) et Kitsu en parallele : on garde le texte le plus long
    const found = await Promise.all([jikanSynopsis(idMal), kitsuSynopsis(idMal)]);
    longSynopsis = found.filter((s): s is string => !!s).sort((a, b) => b.length - a.length)[0] ?? null;
  }
  return { idMal, longSynopsis, charNames: [...names] };
}

async function jikanSynopsis(idMal: number): Promise<string | null> {
  try {
    const res = await fetch(`https://api.jikan.moe/v4/anime/${idMal}`, { signal: AbortSignal.timeout(10000) });
    if (!res.ok) return null;
    const j = (await res.json()) as { data?: { synopsis?: string | null } };
    return j.data?.synopsis ?? null;
  } catch {
    return null;
  }
}

async function kitsuSynopsis(idMal: number): Promise<string | null> {
  try {
    const url =
      "https://kitsu.io/api/edge/mappings?filter%5BexternalSite%5D=myanimelist/anime" +
      `&filter%5BexternalId%5D=${idMal}&include=item`;
    const res = await fetch(url, {
      headers: { Accept: "application/vnd.api+json" },
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) return null;
    const j = (await res.json()) as { included?: { type: string; attributes?: { synopsis?: string | null } }[] };
    return j.included?.find((i) => i.type === "anime")?.attributes?.synopsis ?? null;
  } catch {
    return null;
  }
}
