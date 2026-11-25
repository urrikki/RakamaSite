// ─────────────────────────────────────────────
// Configuration du jeu (reprise du bot Discord + nouvelles regles du site)
// ─────────────────────────────────────────────

export type Rarity = "MYTH" | "UR" | "SSR" | "SR" | "R" | "C";
export type CardKind = "normal" | "event" | "legacy";

// Du plus rare au plus commun
export const RARITY_ORDER: Rarity[] = ["MYTH", "UR", "SSR", "SR", "R", "C"];

export const CARDS_PER_PACK = 5;

// Garantie UR apres 13 packs sans UR "naturelle"
export const PITY_THRESHOLD = 13;

// Probabilites (%) par position dans le pack (style Pokemon TCGP) — identiques au bot
export const SLOT_RATES: Record<number, Record<Exclude<Rarity, "MYTH">, number>> = {
  0: { C: 75.0, R: 22.0, SR: 2.5, SSR: 0.4, UR: 0.1 },
  1: { C: 75.0, R: 22.0, SR: 2.5, SSR: 0.4, UR: 0.1 },
  2: { C: 70.0, R: 24.0, SR: 5.0, SSR: 0.8, UR: 0.2 },
  3: { C: 50.0, R: 30.0, SR: 15.0, SSR: 4.0, UR: 1.0 },
  4: { C: 28.0, R: 35.0, SR: 27.0, SSR: 8.0, UR: 2.0 },
};

// Recyclage : N cartes d'une rarete -> 1 pack bonus
export const RECYCLE_THRESHOLDS: Partial<Record<Rarity, number>> = { C: 100, R: 50, SR: 25 };

// Fusion : N exemplaires du meme perso dans une rarete -> 1 carte de rarete superieure
export const FUSION_RULES: Partial<Record<Rarity, { count: number; result: Rarity }>> = {
  SSR: { count: 3, result: "UR" },
  UR: { count: 2, result: "MYTH" },
};

// ── Economie de points
export const PACK_COST = 100; // 1 pack normal
export const POINTS_PER_DAY_PASSIVE = 200; // 2 packs / jour
export const MS_PER_POINT = Math.round((24 * 3600 * 1000) / POINTS_PER_DAY_PASSIVE); // 432 000 ms
export const QUIZ_POINTS = [100, 60, 30, 10]; // trouve a l'indice 1, 2, 3, 4
export const QUIZ_TRIES_PER_STAGE = 3;
export const GRIND_EVENT_POINTS = 25;
export const MIGRATION_STARTING_POINTS = 200;
export const MAX_PACKS_PER_OPEN = 50;

// ── Tirage du personnage (popularite AniList, top ~4000)
// Pages de 50 persos tries par favoris. Plus la page est haute, plus le perso est connu.
export const PAGE_BANDS_NORMAL = [
  { upTo: 0.01, from: 1, to: 2 },
  { upTo: 0.08, from: 3, to: 10 },
  { upTo: 0.3, from: 11, to: 30 },
  { upTo: 1, from: 31, to: 80 },
];

// Packs evenement : les persos les plus connus sont plus durs a avoir
export const PAGE_BANDS_EVENT = [
  { upTo: 0.003, from: 1, to: 2 },
  { upTo: 0.03, from: 3, to: 10 },
  { upTo: 0.18, from: 11, to: 30 },
  { upTo: 1, from: 31, to: 80 },
];

export const CHAR_PAGE_TTL_MS = 7 * 24 * 3600 * 1000;

export const TIMEZONE = "Europe/Paris";
