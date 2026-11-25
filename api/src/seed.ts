import { db, isFeedWorthy, logActivity, type CardRow } from "./db.ts";
import { MIGRATION_STARTING_POINTS } from "./config.ts";

// Les deux seuls joueurs du site
export const PLAYERS = [
  { id: "urrikki", discordId: "699703329487454258", name: "Urrikki" },
  { id: "frere", discordId: "887655483727564830", name: "Sigeir" },
];

export function ensureUsers() {
  const now = Date.now();
  for (const p of PLAYERS) {
    db.prepare(
      `INSERT OR IGNORE INTO users (id, discord_id, display_name, points, accrual_since, created_at)
       VALUES (?, ?, ?, ?, ?, ?)`,
    ).run(p.id, p.discordId, p.name, MIGRATION_STARTING_POINTS, now, now);
  }
  // Anciens pseudos provisoires
  db.prepare("UPDATE users SET display_name = 'Sigeir' WHERE id = 'frere' AND display_name IN ('Frérot', 'Sigir')").run();
  backfillActivity();
}

/** Remplit le fil commun avec les cartes rares deja tirees sur le site (une seule fois). */
function backfillActivity() {
  const n = (db.prepare("SELECT COUNT(*) n FROM activity").get() as { n: number }).n;
  if (n > 0) return;
  const rows = db
    .prepare("SELECT * FROM cards WHERE obtained_at IS NOT NULL ORDER BY obtained_at")
    .all() as unknown as CardRow[];
  for (const c of rows) {
    if (!isFeedWorthy(c)) continue;
    logActivity(c.user_id, c.origin === "fusion" ? "fusion" : c.kind === "event" ? "event" : "pull", c);
  }
}
