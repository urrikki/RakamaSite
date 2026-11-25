import { DatabaseSync } from "node:sqlite";
import { mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import type { CardKind, Rarity } from "./config.ts";

// Sur Railway, DATA_DIR pointe sur le volume monte (ex: /data)
const DATA_DIR = process.env.DATA_DIR ?? resolve(import.meta.dirname, "../data");
export const DB_PATH = resolve(DATA_DIR, "rakama.sqlite");
mkdirSync(dirname(DB_PATH), { recursive: true });

export const db = new DatabaseSync(DB_PATH);
db.exec("PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON;");

db.exec(`
CREATE TABLE IF NOT EXISTS users (
  id             TEXT PRIMARY KEY,
  discord_id     TEXT,
  display_name   TEXT NOT NULL,
  password_hash  TEXT,
  points         INTEGER NOT NULL DEFAULT 0,
  accrual_since  INTEGER NOT NULL,
  pity           INTEGER NOT NULL DEFAULT 0,
  packs_opened   INTEGER NOT NULL DEFAULT 0,
  cards_pulled   INTEGER NOT NULL DEFAULT 0,
  showcase       TEXT NOT NULL DEFAULT '[]',
  created_at     INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS cards (
  uid          TEXT PRIMARY KEY,
  user_id      TEXT NOT NULL REFERENCES users(id),
  char_id      INTEGER NOT NULL,
  name         TEXT NOT NULL,
  anime        TEXT NOT NULL DEFAULT '',
  image_url    TEXT NOT NULL,
  kind         TEXT NOT NULL,            -- normal | event | legacy
  rarity       TEXT,                     -- null pour event / legacy
  fav_rank     INTEGER,                  -- rang AniList fige au moment du drop
  rank_source  TEXT NOT NULL DEFAULT 'drop', -- drop | migration
  event_id     TEXT,
  origin       TEXT NOT NULL,            -- pack | pity | recycle | fusion | event | discord
  obtained_at  INTEGER,                  -- null = obtenue sur Discord (date inconnue)
  favorite     INTEGER NOT NULL DEFAULT 0,
  legacy_rarity TEXT                     -- rarete d'origine des cartes Archives (info seulement)
);
CREATE INDEX IF NOT EXISTS cards_user ON cards(user_id);

CREATE TABLE IF NOT EXISTS event_claims (
  user_id   TEXT NOT NULL REFERENCES users(id),
  event_id  TEXT NOT NULL,
  opened    INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (user_id, event_id)
);

CREATE TABLE IF NOT EXISTS char_pages (
  page        INTEGER PRIMARY KEY,
  fetched_at  INTEGER NOT NULL,
  data        TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS quiz_days (
  day       TEXT PRIMARY KEY,
  anime_id  INTEGER NOT NULL,
  data      TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS quiz_progress (
  user_id   TEXT NOT NULL REFERENCES users(id),
  day       TEXT NOT NULL,
  stage     INTEGER NOT NULL DEFAULT 1,
  wrong     INTEGER NOT NULL DEFAULT 0,
  status    TEXT NOT NULL DEFAULT 'playing', -- playing | won | lost
  points    INTEGER NOT NULL DEFAULT 0,
  guesses   TEXT NOT NULL DEFAULT '[]',
  PRIMARY KEY (user_id, day)
);
`);

export interface UserRow {
  id: string;
  discord_id: string | null;
  display_name: string;
  password_hash: string | null;
  points: number;
  accrual_since: number;
  pity: number;
  packs_opened: number;
  cards_pulled: number;
  showcase: string;
  created_at: number;
}

export interface CardRow {
  uid: string;
  user_id: string;
  char_id: number;
  name: string;
  anime: string;
  image_url: string;
  kind: CardKind;
  rarity: Rarity | null;
  fav_rank: number | null;
  rank_source: "drop" | "migration";
  event_id: string | null;
  origin: string;
  obtained_at: number | null;
  favorite: number;
  legacy_rarity: string | null;
}

export function tx<T>(fn: () => T): T {
  db.exec("BEGIN IMMEDIATE");
  try {
    const out = fn();
    db.exec("COMMIT");
    return out;
  } catch (e) {
    db.exec("ROLLBACK");
    throw e;
  }
}

export function getUser(id: string): UserRow | undefined {
  return db.prepare("SELECT * FROM users WHERE id = ?").get(id) as UserRow | undefined;
}

export function listUsers(): UserRow[] {
  return db.prepare("SELECT * FROM users ORDER BY created_at").all() as unknown as UserRow[];
}

export function getCards(userId: string): CardRow[] {
  return db.prepare("SELECT * FROM cards WHERE user_id = ?").all(userId) as unknown as CardRow[];
}

const insertCardStmt = db.prepare(`
  INSERT INTO cards (uid, user_id, char_id, name, anime, image_url, kind, rarity, fav_rank, rank_source,
                     event_id, origin, obtained_at, favorite, legacy_rarity)
  VALUES (:uid, :user_id, :char_id, :name, :anime, :image_url, :kind, :rarity, :fav_rank, :rank_source,
          :event_id, :origin, :obtained_at, :favorite, :legacy_rarity)
`);

export function insertCard(c: CardRow) {
  insertCardStmt.run({ ...c } as never);
}

export function deleteCards(uids: string[]) {
  const stmt = db.prepare("DELETE FROM cards WHERE uid = ?");
  for (const u of uids) stmt.run(u);
}

export function newUid(charId: number): string {
  return `${charId}_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
}
