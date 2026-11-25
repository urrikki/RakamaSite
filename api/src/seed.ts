import { db } from "./db.ts";
import { MIGRATION_STARTING_POINTS } from "./config.ts";

// Les deux seuls joueurs du site
export const PLAYERS = [
  { id: "urrikki", discordId: "699703329487454258", name: "Urrikki" },
  { id: "frere", discordId: "887655483727564830", name: "Frérot" },
];

export function ensureUsers() {
  const now = Date.now();
  for (const p of PLAYERS) {
    db.prepare(
      `INSERT OR IGNORE INTO users (id, discord_id, display_name, points, accrual_since, created_at)
       VALUES (?, ?, ?, ?, ?, ?)`,
    ).run(p.id, p.discordId, p.name, MIGRATION_STARTING_POINTS, now, now);
  }
}
