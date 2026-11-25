import type { GameEventInfo } from "./types";

// Cache des noms d'evenements (rempli par l'API /game/events)
const names = new Map<string, string>();

export function rememberEvents(list: GameEventInfo[]) {
  for (const e of list) names.set(e.id, e.name);
}

export function eventName(id: string | null | undefined): string {
  if (!id) return "Événement";
  const n = names.get(id);
  if (n) return `${n}${/\d{4}$/.test(n) ? "" : " " + (id.match(/(\d{4})$/)?.[1] ?? "")}`.trim();
  return id
    .replace(/-(\d{4})$/, " $1")
    .replace(/-/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}
