import { Hono, type Context } from "hono";
import { cors } from "hono/cors";
import { serve } from "@hono/node-server";
import { db, getCards, getUser, listUsers, type CardRow, type UserRow } from "./db.ts";
import { hashPassword, signToken, verifyPassword, verifyToken } from "./auth.ts";
import { pointsOf } from "./points.ts";
import { GameError, eventPacksAvailable, grindCards, openEventPacks, openPacks } from "./gacha.ts";
import { EVENTS, currentEvent, endOf, parisDay, unlockedDays } from "./events.ts";
import { quizGuess, quizSkip, quizState } from "./quiz.ts";
import {
  FUSION_RULES,
  GRIND_EVENT_POINTS,
  MAX_PACKS_PER_OPEN,
  MS_PER_POINT,
  PACK_COST,
  PITY_THRESHOLD,
  POINTS_PER_DAY_PASSIVE,
  RECYCLE_THRESHOLDS,
} from "./config.ts";
import { ensureUsers } from "./seed.ts";
import { importDiscord, type DiscordData } from "./importer.ts";
import { getCharPage } from "./anilist.ts";

ensureUsers();

type Env = { Variables: { userId: string } };
const app = new Hono<Env>();

const origins = (process.env.WEB_ORIGIN ?? "http://localhost:5173")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);
app.use("/api/*", cors({ origin: origins, allowHeaders: ["Content-Type", "Authorization"], maxAge: 86400 }));

app.onError((err, c) => {
  if (err instanceof GameError) return c.json({ error: err.message }, err.status as 400);
  console.error(err);
  return c.json({ error: "Erreur serveur : " + (err as Error).message }, 500);
});

// ── Serialisation
function cardOut(c: CardRow) {
  return {
    uid: c.uid,
    charId: c.char_id,
    name: c.name,
    anime: c.anime,
    image: c.image_url,
    kind: c.kind,
    rarity: c.rarity,
    rank: c.fav_rank,
    rankSource: c.rank_source,
    eventId: c.event_id,
    origin: c.origin,
    obtainedAt: c.obtained_at,
    favorite: !!c.favorite,
  };
}

function userOut(u: UserRow) {
  const p = pointsOf(u);
  return {
    id: u.id,
    name: u.display_name,
    points: p.points,
    nextPointInMs: p.nextPointInMs,
    pity: u.pity,
    packsOpened: u.packs_opened,
    cardsPulled: u.cards_pulled,
    showcase: JSON.parse(u.showcase) as string[],
  };
}

function publicUserOut(u: UserRow) {
  return { id: u.id, name: u.display_name, showcase: JSON.parse(u.showcase), packsOpened: u.packs_opened };
}

// ── Public
app.get("/api/health", (c) => c.json({ ok: true, day: parisDay() }));

app.get("/api/accounts", (c) => c.json(listUsers().map((u) => ({ id: u.id, name: u.display_name, hasPassword: !!u.password_hash }))));

app.post("/api/login", async (c) => {
  const body = await c.req.json<{ user: string; password: string; setupCode?: string }>();
  const u = getUser(body.user);
  if (!u) return c.json({ error: "Compte inconnu." }, 404);
  if (!body.password || body.password.length < 4) return c.json({ error: "Mot de passe trop court (4 min)." }, 400);
  if (!u.password_hash) {
    // Premiere connexion : on choisit son mot de passe, protege par un code d'installation
    const code = process.env.SETUP_CODE;
    if (!code) return c.json({ error: "SETUP_CODE n'est pas configuré sur le serveur." }, 403);
    if (body.setupCode !== code) return c.json({ error: "Code d'installation incorrect.", needSetup: true }, 403);
    db.prepare("UPDATE users SET password_hash = ? WHERE id = ?").run(hashPassword(body.password), u.id);
  } else if (!verifyPassword(body.password, u.password_hash)) {
    return c.json({ error: "Mot de passe incorrect." }, 401);
  }
  return c.json({ token: signToken(u.id) });
});

// ── Authentifie
app.use("/api/me/*", authMw);
app.use("/api/me", authMw);
app.use("/api/game/*", authMw);

async function authMw(c: Context<Env>, next: () => Promise<void>) {
  const header = c.req.header("Authorization") ?? "";
  const id = verifyToken(header.replace(/^Bearer\s+/i, ""));
  if (!id || !getUser(id)) return c.json({ error: "Non connecté." }, 401);
  c.set("userId", id);
  await next();
}

app.get("/api/me", (c) => {
  const u = getUser(c.get("userId"))!;
  return c.json({ user: userOut(u), cards: getCards(u.id).map(cardOut), rules: rules() });
});

function rules() {
  return {
    packCost: PACK_COST,
    pointsPerDay: POINTS_PER_DAY_PASSIVE,
    msPerPoint: MS_PER_POINT,
    pityThreshold: PITY_THRESHOLD,
    recycle: RECYCLE_THRESHOLDS,
    fusion: FUSION_RULES,
    grindEventPoints: GRIND_EVENT_POINTS,
    maxPacksPerOpen: MAX_PACKS_PER_OPEN,
  };
}

app.patch("/api/me", async (c) => {
  const id = c.get("userId");
  const body = await c.req.json<{ name?: string; showcase?: string[]; password?: string }>();
  if (body.name !== undefined) {
    const name = body.name.trim().slice(0, 24);
    if (!name) throw new GameError("Pseudo vide.");
    db.prepare("UPDATE users SET display_name = ? WHERE id = ?").run(name, id);
  }
  if (body.showcase !== undefined) {
    const owned = new Set(getCards(id).map((c) => c.uid));
    const sc = [...new Set(body.showcase)].filter((u) => owned.has(u)).slice(0, 6);
    db.prepare("UPDATE users SET showcase = ? WHERE id = ?").run(JSON.stringify(sc), id);
  }
  if (body.password !== undefined) {
    if (body.password.length < 4) throw new GameError("Mot de passe trop court (4 min).");
    db.prepare("UPDATE users SET password_hash = ? WHERE id = ?").run(hashPassword(body.password), id);
  }
  return c.json({ user: userOut(getUser(id)!) });
});

// Profils (les deux joueurs peuvent voir la collection de l'autre)
app.get("/api/game/players", (c) => c.json(listUsers().map(publicUserOut)));

app.get("/api/game/players/:id", (c) => {
  const u = getUser(c.req.param("id"));
  if (!u) throw new GameError("Joueur inconnu.", 404);
  return c.json({ user: publicUserOut(u), cards: getCards(u.id).map(cardOut) });
});

// ── Packs
app.post("/api/game/packs/open", async (c) => {
  const id = c.get("userId");
  const { count } = await c.req.json<{ count: number }>();
  const n = Math.floor(Number(count));
  if (!(n >= 1 && n <= MAX_PACKS_PER_OPEN)) throw new GameError(`Entre 1 et ${MAX_PACKS_PER_OPEN} packs.`);
  const res = await openPacks(id, n);
  return c.json({
    packs: res.packs.map((p) => ({ ...p, cards: p.cards.map(cardOut) })),
    fusions: res.fusions.map((f) => ({ ...f, card: cardOut(f.card) })),
    recycled: res.recycled,
    user: userOut(getUser(id)!),
  });
});

// ── Cartes
app.post("/api/game/cards/:uid/favorite", async (c) => {
  const id = c.get("userId");
  const { on } = await c.req.json<{ on: boolean }>();
  const r = db.prepare("UPDATE cards SET favorite = ? WHERE uid = ? AND user_id = ?").run(on ? 1 : 0, c.req.param("uid"), id);
  if (!r.changes) throw new GameError("Carte introuvable.", 404);
  return c.json({ ok: true });
});

app.post("/api/game/cards/grind", async (c) => {
  const id = c.get("userId");
  const { uids } = await c.req.json<{ uids: string[] }>();
  if (!Array.isArray(uids) || !uids.length) throw new GameError("Aucune carte.");
  const res = grindCards(id, uids);
  return c.json({ ...res, user: userOut(getUser(id)!) });
});

// ── Evenements
app.get("/api/game/events", (c) => {
  const id = c.get("userId");
  const today = parisDay();
  const cur = currentEvent(today);
  return c.json({
    today,
    current: cur?.id ?? null,
    events: EVENTS.map((e) => ({
      ...e,
      end: endOf(e),
      unlocked: unlockedDays(e, today),
      available: eventPacksAvailable(id, e.id),
    })),
  });
});

app.post("/api/game/events/:id/open", async (c) => {
  const id = c.get("userId");
  const { count } = await c.req.json<{ count: number }>();
  const cards = await openEventPacks(id, c.req.param("id"), Math.max(1, Math.floor(Number(count) || 1)));
  return c.json({ cards: cards.map(cardOut), user: userOut(getUser(id)!) });
});

// ── Quiz
app.get("/api/game/quiz", async (c) => c.json(await quizState(c.get("userId"))));

app.post("/api/game/quiz/guess", async (c) => {
  const id = c.get("userId");
  const body = await c.req.json<{ id?: number; titles?: string[]; text: string }>();
  const res = await quizGuess(id, { id: body.id, titles: body.titles ?? [body.text], text: body.text });
  return c.json({ ...res, user: userOut(getUser(id)!) });
});

app.post("/api/game/quiz/skip", async (c) => c.json(await quizSkip(c.get("userId"))));

// ── Admin : import unique des donnees Discord (protege par SETUP_CODE)
let importLog: string[] = [];
let importRunning = false;
function isAdmin(c: Context<Env>) {
  const code = process.env.SETUP_CODE;
  return !!code && c.req.header("X-Setup-Code") === code;
}
app.post("/api/admin/import", async (c) => {
  if (!isAdmin(c)) return c.json({ error: "Interdit." }, 403);
  if (importRunning) return c.json({ error: "Import déjà en cours." }, 409);
  const data = (await c.req.json()) as DiscordData;
  const force = c.req.query("force") === "1";
  importLog = [];
  importRunning = true;
  importDiscord(data, force, (s) => importLog.push(s))
    .catch((e) => importLog.push("ERREUR : " + (e as Error).message))
    .finally(() => (importRunning = false));
  return c.json({ started: true });
});
app.get("/api/admin/import", (c) => {
  if (!isAdmin(c)) return c.json({ error: "Interdit." }, 403);
  return c.json({ running: importRunning, log: importLog });
});

const port = Number(process.env.PORT ?? 8787);
serve({ fetch: app.fetch, port }, () => {
  console.log(`Rakama API sur http://localhost:${port}`);
  warmCharPages();
});

// Prechauffe le cache des persos (pages 1-80) pour que les ouvertures soient instantanees
async function warmCharPages() {
  for (let page = 1; page <= 80; page++) {
    try {
      await getCharPage(page);
    } catch (e) {
      console.warn(`[warm] page ${page} : ${(e as Error).message}`);
    }
  }
  console.log("[warm] cache des personnages prêt");
}
