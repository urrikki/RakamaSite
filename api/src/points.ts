import { db, type UserRow } from "./db.ts";
import { MS_PER_POINT } from "./config.ts";

// Les points passifs s'accumulent en continu (1 point / 432 s = 200 / jour), sans plafond.
// On ne stocke qu'un solde + l'instant a partir duquel on compte.

export function pointsOf(u: UserRow, now = Date.now()) {
  const earned = Math.max(0, Math.floor((now - u.accrual_since) / MS_PER_POINT));
  const nextIn = MS_PER_POINT - ((now - u.accrual_since) % MS_PER_POINT);
  return { points: u.points + earned, earned, nextPointInMs: nextIn };
}

/** Transfere les points gagnes dans le solde (en gardant la fraction en cours). */
export function settle(u: UserRow, now = Date.now()): UserRow {
  const { earned } = pointsOf(u, now);
  if (earned > 0) {
    u.points += earned;
    u.accrual_since += earned * MS_PER_POINT;
    db.prepare("UPDATE users SET points = ?, accrual_since = ? WHERE id = ?").run(u.points, u.accrual_since, u.id);
  }
  return u;
}

export function addPoints(userId: string, delta: number) {
  db.prepare("UPDATE users SET points = points + ? WHERE id = ?").run(delta, userId);
}
