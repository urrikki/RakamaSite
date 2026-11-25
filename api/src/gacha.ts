import {
  CARDS_PER_PACK,
  FUSION_RULES,
  PACK_COST,
  PAGE_BANDS_EVENT,
  PAGE_BANDS_NORMAL,
  PITY_THRESHOLD,
  RECYCLE_THRESHOLDS,
  SLOT_RATES,
  GRIND_EVENT_POINTS,
  type Rarity,
} from "./config.ts";
import { animeTitleOf, getCharPage, type AniChar } from "./anilist.ts";
import { db, deleteCards, getUser, insertCard, isFeedWorthy, logActivity, newUid, tx, type CardRow } from "./db.ts";
import { settle } from "./points.ts";
import { eventById, unlockedDays } from "./events.ts";

export class GameError extends Error {
  status: number;
  constructor(message: string, status = 400) {
    super(message);
    this.status = status;
  }
}

// ─────────────────────────────────────────────
// Tirages
// ─────────────────────────────────────────────

function rollSlotRarity(slot: number): Rarity {
  const rates = SLOT_RATES[slot] ?? SLOT_RATES[0];
  const r = Math.random() * 100;
  let cumul = 0;
  for (const rarity of ["UR", "SSR", "SR", "R", "C"] as const) {
    cumul += rates[rarity];
    if (r < cumul) return rarity;
  }
  return "C";
}

interface Picked {
  char: AniChar;
  rank: number;
}

async function pickCharacter(bands: typeof PAGE_BANDS_NORMAL): Promise<Picked> {
  for (let attempt = 0; attempt < 3; attempt++) {
    const r = Math.random();
    const band = bands.find((b) => r < b.upTo) ?? bands[bands.length - 1];
    const page = band.from + Math.floor(Math.random() * (band.to - band.from + 1));
    let chars: AniChar[] = [];
    try {
      chars = await getCharPage(page);
    } catch {
      continue;
    }
    if (!chars.length) continue;
    // Plus un perso est populaire, plus il est rare de tomber dessus
    const weights = chars.map((c) => 100000 / ((c.favourites ?? 0) + 500));
    const idx = weightedIndex(weights);
    return { char: chars[idx], rank: (page - 1) * 50 + idx + 1 };
  }
  const fallback = await getCharPage(1);
  if (!fallback.length) throw new GameError("AniList ne répond pas. Réessaie dans un instant.", 503);
  const idx = Math.floor(Math.random() * fallback.length);
  return { char: fallback[idx], rank: idx + 1 };
}

function weightedIndex(weights: number[]): number {
  const total = weights.reduce((a, b) => a + b, 0);
  let r = Math.random() * total;
  for (let i = 0; i < weights.length; i++) {
    r -= weights[i];
    if (r <= 0) return i;
  }
  return weights.length - 1;
}

function makeCard(userId: string, p: Picked, extra: Partial<CardRow>): CardRow {
  return {
    uid: newUid(p.char.id),
    user_id: userId,
    char_id: p.char.id,
    name: p.char.name.full,
    anime: animeTitleOf(p.char),
    image_url: p.char.image.large,
    kind: "normal",
    rarity: null,
    fav_rank: p.rank,
    rank_source: "drop",
    event_id: null,
    origin: "pack",
    obtained_at: Date.now(),
    favorite: 0,
    legacy_rarity: null,
    ...extra,
  };
}

async function rollPack(userId: string, pity: number | null): Promise<{ cards: CardRow[]; pitySlot: number | null }> {
  // La carte garantie par le pity est toujours la derniere du pack
  const pitySlot = pity !== null && pity >= PITY_THRESHOLD ? CARDS_PER_PACK - 1 : null;
  const picks = await Promise.all(Array.from({ length: CARDS_PER_PACK }, () => pickCharacter(PAGE_BANDS_NORMAL)));
  const cards = picks.map((p, i) => {
    const isPity = i === pitySlot;
    return makeCard(userId, p, {
      rarity: isPity ? "UR" : rollSlotRarity(i),
      origin: isPity ? "pity" : "pack",
    });
  });
  return { cards, pitySlot };
}

// ─────────────────────────────────────────────
// Recyclage & fusion (uniquement les cartes "normales")
// ─────────────────────────────────────────────

function showcaseOf(userId: string): string[] {
  const row = db.prepare("SELECT showcase FROM users WHERE id = ?").get(userId) as { showcase: string };
  return JSON.parse(row.showcase);
}

/** Retourne la liste des raretes recyclees (1 entree = 1 pack bonus). */
function processRecycling(userId: string): Rarity[] {
  const protectedUids = new Set(showcaseOf(userId));
  const triggered: Rarity[] = [];
  for (const [rarity, threshold] of Object.entries(RECYCLE_THRESHOLDS) as [Rarity, number][]) {
    const rows = (
      db
        .prepare(
          `SELECT uid FROM cards WHERE user_id = ? AND kind = 'normal' AND rarity = ? AND favorite = 0
           ORDER BY COALESCE(obtained_at, 0) ASC`,
        )
        .all(userId, rarity) as { uid: string }[]
    ).filter((r) => !protectedUids.has(r.uid));
    let pool = rows.map((r) => r.uid);
    while (pool.length >= threshold) {
      deleteCards(pool.slice(0, threshold));
      pool = pool.slice(threshold);
      triggered.push(rarity);
    }
  }
  return triggered;
}

export interface FusionResult {
  from: Rarity;
  count: number;
  card: CardRow;
}

function processFusion(userId: string): FusionResult[] {
  const performed: FusionResult[] = [];
  let changed = true;
  while (changed) {
    changed = false;
    for (const [source, rule] of Object.entries(FUSION_RULES) as [Rarity, { count: number; result: Rarity }][]) {
      const rows = db
        .prepare(
          `SELECT * FROM cards WHERE user_id = ? AND kind = 'normal' AND rarity = ? ORDER BY COALESCE(obtained_at, 0) ASC`,
        )
        .all(userId, source) as unknown as CardRow[];
      const groups = new Map<number, CardRow[]>();
      for (const c of rows) groups.set(c.char_id, [...(groups.get(c.char_id) ?? []), c]);
      for (const group of groups.values()) {
        if (group.length < rule.count) continue;
        const fused = group.slice(0, rule.count);
        const base = fused[0];
        const card: CardRow = {
          ...base,
          uid: newUid(base.char_id),
          rarity: rule.result,
          origin: "fusion",
          obtained_at: Date.now(),
          favorite: fused.some((c) => c.favorite) ? 1 : 0,
          // On garde le meilleur rang connu parmi les exemplaires fusionnes
          fav_rank: Math.min(...fused.map((c) => c.fav_rank ?? Infinity)) || base.fav_rank,
        };
        if (!Number.isFinite(card.fav_rank)) card.fav_rank = null;
        deleteCards(fused.map((c) => c.uid));
        insertCard(card);
        logActivity(userId, "fusion", card, { from: source, count: rule.count });
        // La vitrine suit la nouvelle carte
        const sc = showcaseOf(userId);
        const fusedUids = new Set(fused.map((c) => c.uid));
        if (sc.some((u) => fusedUids.has(u))) {
          const next = [...new Set(sc.map((u) => (fusedUids.has(u) ? card.uid : u)))];
          db.prepare("UPDATE users SET showcase = ? WHERE id = ?").run(JSON.stringify(next), userId);
        }
        performed.push({ from: source, count: rule.count, card });
        changed = true;
        break;
      }
      if (changed) break;
    }
  }
  return performed;
}

// ─────────────────────────────────────────────
// Ouverture de packs normaux
// ─────────────────────────────────────────────

export interface PackResult {
  type: "pack" | "bonus";
  bonusFrom?: Rarity;
  pity: boolean;
  cards: CardRow[];
}

export interface OpenResult {
  packs: PackResult[];
  fusions: FusionResult[];
  recycled: { rarity: Rarity; destroyed: number }[];
  pityAfter: number;
}

const openingLocks = new Set<string>();

export async function openPacks(userId: string, count: number): Promise<OpenResult> {
  if (openingLocks.has(userId)) throw new GameError("Une ouverture est déjà en cours.", 409);
  openingLocks.add(userId);
  try {
    // 1. On debite tout de suite (rembourse si AniList plante)
    const cost = count * PACK_COST;
    tx(() => {
      const u = settle(getUser(userId)!);
      if (u.points < cost) throw new GameError(`Pas assez de points (${u.points}/${cost}).`, 402);
      db.prepare("UPDATE users SET points = points - ? WHERE id = ?").run(cost, userId);
    });

    const result: OpenResult = { packs: [], fusions: [], recycled: [], pityAfter: 0 };
    let pity = getUser(userId)!.pity;
    let opened = 0;
    try {
      for (let i = 0; i < count; i++) {
        const { cards, pitySlot } = await rollPack(userId, pity);
        const gotUr = cards.some((c) => c.rarity === "UR");
        pity = gotUr ? 0 : pity + 1;
        tx(() => {
          for (const c of cards) {
            insertCard(c);
            if (isFeedWorthy(c)) logActivity(userId, "pull", c);
          }
          db.prepare(
            "UPDATE users SET pity = ?, packs_opened = packs_opened + 1, cards_pulled = cards_pulled + ? WHERE id = ?",
          ).run(pity, cards.length, userId);
        });
        opened++;
        result.packs.push({ type: "pack", pity: pitySlot !== null, cards });
        await resolveRecycleAndFusion(userId, result);
      }
    } catch (e) {
      // Rembourse les packs non ouverts
      const refund = (count - opened) * PACK_COST;
      if (refund > 0) db.prepare("UPDATE users SET points = points + ? WHERE id = ?").run(refund, userId);
      if (opened === 0) throw e;
    }
    result.pityAfter = pity;
    return result;
  } finally {
    openingLocks.delete(userId);
  }
}

async function resolveRecycleAndFusion(userId: string, result: OpenResult) {
  // Les packs bonus peuvent eux-memes declencher recyclage / fusion : on boucle (borne)
  for (let guard = 0; guard < 20; guard++) {
    const recycled = tx(() => processRecycling(userId));
    const fusions = tx(() => processFusion(userId));
    result.fusions.push(...fusions);
    if (!recycled.length) return;
    for (const rarity of recycled) {
      result.recycled.push({ rarity, destroyed: RECYCLE_THRESHOLDS[rarity]! });
      const { cards } = await rollPack(userId, null);
      for (const c of cards) c.origin = "recycle";
      tx(() => {
        for (const c of cards) {
          insertCard(c);
          if (isFeedWorthy(c)) logActivity(userId, "pull", c);
        }
        db.prepare("UPDATE users SET cards_pulled = cards_pulled + ? WHERE id = ?").run(cards.length, userId);
      });
      result.packs.push({ type: "bonus", bonusFrom: rarity, pity: false, cards });
    }
  }
}

// ─────────────────────────────────────────────
// Packs evenement : 1 carte, sans rarete
// ─────────────────────────────────────────────

export function eventPacksAvailable(userId: string, eventId: string): number {
  const ev = eventById(eventId);
  if (!ev) return 0;
  const row = db.prepare("SELECT opened FROM event_claims WHERE user_id = ? AND event_id = ?").get(userId, eventId) as
    | { opened: number }
    | undefined;
  return Math.max(0, unlockedDays(ev) - (row?.opened ?? 0));
}

export async function openEventPacks(userId: string, eventId: string, count: number): Promise<CardRow[]> {
  const ev = eventById(eventId);
  if (!ev) throw new GameError("Événement inconnu.", 404);
  if (openingLocks.has(userId)) throw new GameError("Une ouverture est déjà en cours.", 409);
  openingLocks.add(userId);
  try {
    const available = eventPacksAvailable(userId, eventId);
    const n = Math.min(count, available);
    if (n <= 0) throw new GameError("Aucun pack de cet événement à ouvrir.", 402);
    const picks = await Promise.all(Array.from({ length: n }, () => pickCharacter(PAGE_BANDS_EVENT)));
    const cards = picks.map((p) => makeCard(userId, p, { kind: "event", event_id: eventId, origin: "event" }));
    tx(() => {
      for (const c of cards) {
        insertCard(c);
        if (isFeedWorthy(c)) logActivity(userId, "event", c);
      }
      db.prepare(
        `INSERT INTO event_claims (user_id, event_id, opened) VALUES (?, ?, ?)
         ON CONFLICT(user_id, event_id) DO UPDATE SET opened = opened + excluded.opened`,
      ).run(userId, eventId, n);
      db.prepare("UPDATE users SET cards_pulled = cards_pulled + ? WHERE id = ?").run(n, userId);
    });
    return cards;
  } finally {
    openingLocks.delete(userId);
  }
}

/** Broyer des cartes evenement contre des points */
export function grindCards(userId: string, uids: string[]): { gained: number } {
  return tx(() => {
    let gained = 0;
    for (const uid of uids) {
      const c = db.prepare("SELECT kind, favorite FROM cards WHERE uid = ? AND user_id = ?").get(uid, userId) as
        | { kind: string; favorite: number }
        | undefined;
      if (!c) throw new GameError("Carte introuvable.", 404);
      if (c.kind !== "event") throw new GameError("Seules les cartes événement peuvent être broyées.");
      if (c.favorite) throw new GameError("Retire d'abord la carte de tes favoris.");
      deleteCards([uid]);
      gained += GRIND_EVENT_POINTS;
    }
    const sc = showcaseOf(userId).filter((u) => !uids.includes(u));
    db.prepare("UPDATE users SET points = points + ?, showcase = ? WHERE id = ?").run(gained, JSON.stringify(sc), userId);
    return { gained };
  });
}
