import { db, tx } from "./db.ts";
import { randomPopularAnime, type AniAnime } from "./anilist.ts";
import { parisDay } from "./events.ts";
import { QUIZ_POINTS, QUIZ_TRIES_PER_STAGE } from "./config.ts";
import { addPoints } from "./points.ts";
import { GameError } from "./gacha.ts";

// ─────────────────────────────────────────────
// Quiz quotidien : meme anime pour tout le monde, mais chacun joue seul.
// 4 indices. Moins on en utilise, plus on gagne de points (100 / 60 / 30 / 10).
// 3 essais par indice ; apres 3 erreurs on passe a l'indice suivant.
// ─────────────────────────────────────────────

const STAGES = 4;

const dayLocks = new Map<string, Promise<AniAnime>>();

export async function animeOfDay(day = parisDay()): Promise<AniAnime> {
  const row = db.prepare("SELECT data FROM quiz_days WHERE day = ?").get(day) as { data: string } | undefined;
  if (row) return JSON.parse(row.data);
  if (!dayLocks.has(day)) {
    dayLocks.set(
      day,
      (async () => {
        try {
          const used = new Set(
            (db.prepare("SELECT anime_id FROM quiz_days").all() as { anime_id: number }[]).map((r) => r.anime_id),
          );
          const anime = await randomPopularAnime(used);
          db.prepare("INSERT OR IGNORE INTO quiz_days (day, anime_id, data) VALUES (?, ?, ?)").run(
            day,
            anime.id,
            JSON.stringify(anime),
          );
          return anime;
        } finally {
          dayLocks.delete(day);
        }
      })(),
    );
  }
  return dayLocks.get(day)!;
}

interface Progress {
  stage: number;
  wrong: number;
  status: "playing" | "won" | "lost";
  points: number;
  guesses: { text: string; stage: number; ok: boolean }[];
}

function getProgress(userId: string, day: string): Progress {
  const row = db.prepare("SELECT * FROM quiz_progress WHERE user_id = ? AND day = ?").get(userId, day) as
    | { stage: number; wrong: number; status: Progress["status"]; points: number; guesses: string }
    | undefined;
  if (!row) return { stage: 1, wrong: 0, status: "playing", points: 0, guesses: [] };
  return { ...row, guesses: JSON.parse(row.guesses) };
}

function saveProgress(userId: string, day: string, p: Progress) {
  db.prepare(
    `INSERT INTO quiz_progress (user_id, day, stage, wrong, status, points, guesses) VALUES (?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(user_id, day) DO UPDATE SET stage = excluded.stage, wrong = excluded.wrong, status = excluded.status,
       points = excluded.points, guesses = excluded.guesses`,
  ).run(userId, day, p.stage, p.wrong, p.status, p.points, JSON.stringify(p.guesses));
}

// ── Nettoyage du synopsis : on retire les titres
function cleanSynopsis(desc: string | null, a: AniAnime): string {
  let d = (desc ?? "Aucun synopsis.")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/\(Source:.*?\)/gi, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
  const titles = [a.title.romaji, a.title.english, a.title.native, ...a.synonyms].filter(Boolean) as string[];
  for (const t of titles) {
    d = d.replace(new RegExp(escapeRe(t), "gi"), "▇▇▇▇");
    for (const w of t.split(/\s+/)) {
      if (w.length > 3 && !COMMON_WORDS.has(w.toLowerCase())) {
        d = d.replace(new RegExp(`\\b${escapeRe(w)}\\b`, "gi"), "▇▇▇▇");
      }
    }
  }
  return d.length > 1400 ? d.slice(0, 1397) + "…" : d;
}

const COMMON_WORDS = new Set(["with", "from", "that", "this", "have", "season", "part", "the", "and", "your", "into", "world"]);

function escapeRe(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// ── Comparaison des titres (on ignore saisons / parties / ponctuation)
export function baseTitle(s: string | null | undefined): string {
  if (!s) return "";
  return s
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/\b(season|saison|part|cour)\s*\d+\b/g, " ")
    .replace(/\b\d+(st|nd|rd|th)\s+(season|part|cour)\b/g, " ")
    .replace(/\b(the\s+)?(final|second|third|2nd|3rd)\s+season\b/g, " ")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .replace(/\s+\d+$/g, "")
    .trim();
}

function isCorrect(a: AniAnime, guess: { id?: number; titles: string[] }): boolean {
  if (guess.id && guess.id === a.id) return true;
  const targets = new Set(
    [a.title.romaji, a.title.english, a.title.native, ...a.synonyms].map(baseTitle).filter((t) => t.length >= 2),
  );
  return guess.titles.map(baseTitle).some((g) => g.length >= 2 && targets.has(g));
}

// ── Etat envoye au client : on ne revele que les indices debloques
function view(a: AniAnime, p: Progress) {
  const finished = p.status !== "playing";
  const stage = finished ? STAGES : p.stage;
  const studios = a.studios.nodes.filter((s) => s.isAnimationStudio).map((s) => s.name);
  return {
    status: p.status,
    stage: p.stage,
    wrong: p.wrong,
    triesPerStage: QUIZ_TRIES_PER_STAGE,
    points: p.points,
    pointsTable: QUIZ_POINTS,
    potential: p.status === "playing" ? QUIZ_POINTS[p.stage - 1] : 0,
    guesses: p.guesses,
    hints: {
      info: {
        genres: a.genres,
        tags: a.tags
          .filter((t) => !t.isMediaSpoiler && t.rank >= 60)
          .sort((x, y) => y.rank - x.rank)
          .slice(0, 8)
          .map((t) => t.name),
        format: a.format,
        episodes: a.episodes,
        duration: a.duration,
        season: a.season,
        year: a.seasonYear,
        studios,
        popularity: a.popularity,
        score: a.averageScore,
      },
      synopsis: stage >= 2 ? cleanSynopsis(a.description, a) : null,
      coverBlurred: stage === 3 && !finished ? a.coverImage.extraLarge ?? a.coverImage.large : null,
      cover: stage >= 4 ? a.coverImage.extraLarge ?? a.coverImage.large : null,
      firstLetter: stage >= 4 ? (a.title.english ?? a.title.romaji).trim()[0]?.toUpperCase() ?? null : null,
      color: a.coverImage.color,
    },
    answer: finished
      ? {
          id: a.id,
          romaji: a.title.romaji,
          english: a.title.english,
          native: a.title.native,
          banner: a.bannerImage,
          cover: a.coverImage.extraLarge ?? a.coverImage.large,
          url: a.siteUrl,
          trailer: a.trailer?.site === "youtube" ? `https://www.youtube.com/watch?v=${a.trailer.id}` : null,
        }
      : null,
  };
}

export async function quizState(userId: string) {
  const day = parisDay();
  const a = await animeOfDay(day);
  return { day, ...view(a, getProgress(userId, day)) };
}

export async function quizGuess(userId: string, guess: { id?: number; titles: string[]; text: string }) {
  const day = parisDay();
  const a = await animeOfDay(day);
  return tx(() => {
    const p = getProgress(userId, day);
    if (p.status !== "playing") throw new GameError("Le quiz du jour est déjà terminé.");
    if (!guess.text?.trim()) throw new GameError("Réponse vide.");
    const ok = isCorrect(a, guess);
    p.guesses.push({ text: guess.text.trim().slice(0, 120), stage: p.stage, ok });
    if (ok) {
      p.status = "won";
      p.points = QUIZ_POINTS[p.stage - 1];
      addPoints(userId, p.points);
    } else {
      p.wrong++;
      if (p.wrong >= QUIZ_TRIES_PER_STAGE) advance(p);
    }
    saveProgress(userId, day, p);
    return { correct: ok, day, ...view(a, p) };
  });
}

export async function quizSkip(userId: string) {
  const day = parisDay();
  const a = await animeOfDay(day);
  return tx(() => {
    const p = getProgress(userId, day);
    if (p.status !== "playing") throw new GameError("Le quiz du jour est déjà terminé.");
    advance(p);
    saveProgress(userId, day, p);
    return { day, ...view(a, p) };
  });
}

function advance(p: Progress) {
  if (p.stage >= STAGES) {
    p.status = "lost";
  } else {
    p.stage++;
    p.wrong = 0;
  }
}
