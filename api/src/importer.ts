// Import des collections Discord (gacha_data.json du bot) dans la base du site.
// - Cartes AVEC rang  -> cartes normales (rang fige d'origine)
// - Cartes SANS rang  -> cartes "Archives" (kind = legacy) : hors rarete, hors fusion/recyclage,
//                        rang recupere sur AniList au moment de la migration.

import { db, insertCard, newUid, tx, type CardRow } from "./db.ts";
import { ensureUsers, PLAYERS } from "./seed.ts";
import { getCharPage } from "./anilist.ts";
import type { Rarity } from "./config.ts";

interface DiscordCard {
  id: number;
  name: string;
  image_url: string;
  rarity: Rarity;
  anime?: string;
  fav_rank?: number | null;
}

export type DiscordData = Record<string, { inventory: DiscordCard[]; pity_counter?: number; total_pulls?: number }>;

export async function importDiscord(data: DiscordData, force: boolean, log: (s: string) => void = console.log) {
  ensureUsers();

  const legacyIds = new Set<number>();
  for (const p of PLAYERS) for (const c of data[p.discordId]?.inventory ?? []) if (!c.fav_rank) legacyIds.add(c.id);

  const currentRank = new Map<number, number>();
  log(`${legacyIds.size} persos sans rang : recherche du rang actuel sur AniList…`);
  // AniList refuse d'aller au-dela de 5000 entrees (page 100)
  for (let page = 1; page <= 100 && [...legacyIds].some((id) => !currentRank.has(id)); page++) {
    const chars = await getCharPage(page);
    chars.forEach((ch, i) => {
      if (!currentRank.has(ch.id)) currentRank.set(ch.id, (page - 1) * 50 + i + 1);
    });
    if (page % 10 === 0) log(`  page ${page} : ${[...legacyIds].filter((id) => currentRank.has(id)).length}/${legacyIds.size} trouvés`);
  }

  for (const p of PLAYERS) {
    const u = data[p.discordId];
    if (!u) {
      log(`${p.id} : aucune donnée Discord`);
      continue;
    }
    const existing = (db.prepare("SELECT COUNT(*) n FROM cards WHERE user_id = ? AND origin = 'discord'").get(p.id) as { n: number }).n;
    if (existing && !force) {
      log(`${p.id} : déjà migré (${existing} cartes).`);
      continue;
    }
    tx(() => {
      db.prepare("DELETE FROM cards WHERE user_id = ? AND origin = 'discord'").run(p.id);
      let normal = 0;
      let legacy = 0;
      for (const c of u.inventory) {
        const isLegacy = !c.fav_rank;
        const card: CardRow = {
          uid: newUid(c.id),
          user_id: p.id,
          char_id: c.id,
          name: c.name.trim(),
          anime: c.anime ?? "",
          image_url: c.image_url,
          kind: isLegacy ? "legacy" : "normal",
          rarity: isLegacy ? null : c.rarity,
          fav_rank: isLegacy ? currentRank.get(c.id) ?? null : c.fav_rank!,
          rank_source: isLegacy ? "migration" : "drop",
          event_id: null,
          origin: "discord",
          obtained_at: null,
          favorite: 0,
          legacy_rarity: isLegacy ? c.rarity : null,
        };
        insertCard(card);
        if (isLegacy) legacy++;
        else normal++;
      }
      db.prepare("UPDATE users SET pity = ?, cards_pulled = ? WHERE id = ?").run(u.pity_counter ?? 0, u.total_pulls ?? 0, p.id);
      log(`${p.id} : ${normal} cartes normales, ${legacy} cartes Archives, pity ${u.pity_counter ?? 0}`);
    });
  }
  const missing = [...legacyIds].filter((id) => !currentRank.has(id));
  if (missing.length) log(`Rang introuvable (> 5000) pour ${missing.length} perso(s).`);
  log("Migration terminée.");
}
