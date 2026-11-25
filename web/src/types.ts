export type Rarity = "MYTH" | "UR" | "SSR" | "SR" | "R" | "C";
export type CardKind = "normal" | "event" | "legacy";

export interface Card {
  uid: string;
  charId: number;
  name: string;
  anime: string;
  image: string;
  kind: CardKind;
  rarity: Rarity | null;
  rank: number | null;
  rankSource: "drop" | "migration";
  eventId: string | null;
  origin: string;
  obtainedAt: number | null;
  favorite: boolean;
}

export interface Me {
  id: string;
  name: string;
  points: number;
  nextPointInMs: number;
  pity: number;
  packsOpened: number;
  cardsPulled: number;
  showcase: string[];
}

export interface Rules {
  packCost: number;
  pointsPerDay: number;
  msPerPoint: number;
  pityThreshold: number;
  recycle: Partial<Record<Rarity, number>>;
  fusion: Partial<Record<Rarity, { count: number; result: Rarity }>>;
  grindEventPoints: number;
  maxPacksPerOpen: number;
  slotRates: Record<string, Record<string, number>>;
}

export interface PackResult {
  type: "pack" | "bonus";
  bonusFrom?: Rarity;
  pity: boolean;
  cards: Card[];
}

export interface OpenResult {
  packs: PackResult[];
  fusions: { from: Rarity; count: number; card: Card }[];
  recycled: { rarity: Rarity; destroyed: number }[];
  user: Me;
}

export interface GameEventInfo {
  id: string;
  name: string;
  start: string;
  end: string;
  blurb: string;
  unlocked: number;
  available: number;
}

export const RARITY_ORDER: Rarity[] = ["MYTH", "UR", "SSR", "SR", "R", "C"];

export const RARITY_META: Record<Rarity, { label: string; stars: number; color: string; material: string }> = {
  MYTH: { label: "Mythique", stars: 6, color: "#ff2d55", material: "Écarlate" },
  UR: { label: "Ultra Rare", stars: 5, color: "#ffc93c", material: "Or" },
  SSR: { label: "Super Super Rare", stars: 4, color: "#b44cff", material: "Améthyste" },
  SR: { label: "Super Rare", stars: 3, color: "#2f9bff", material: "Saphir" },
  R: { label: "Rare", stars: 2, color: "#2ed47a", material: "Jade" },
  C: { label: "Commune", stars: 1, color: "#9aa3ad", material: "Ardoise" },
};

export function rarityRank(c: Card): number {
  if (c.kind === "normal" && c.rarity) return RARITY_ORDER.indexOf(c.rarity);
  return c.kind === "event" ? 6 : 7;
}
