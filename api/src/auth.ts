import { createHmac, randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync, existsSync } from "node:fs";
import { dirname } from "node:path";
import { DB_PATH } from "./db.ts";

// Secret de signature des jetons : variable d'env, sinon genere une fois et garde sur le volume
function loadSecret(): string {
  if (process.env.AUTH_SECRET) return process.env.AUTH_SECRET;
  const file = dirname(DB_PATH) + "/auth_secret";
  if (!existsSync(file)) {
    mkdirSync(dirname(file), { recursive: true });
    writeFileSync(file, randomBytes(32).toString("hex"));
  }
  return readFileSync(file, "utf8").trim();
}
const SECRET = loadSecret();
const TOKEN_TTL_MS = 120 * 24 * 3600 * 1000;

export function hashPassword(pw: string): string {
  const salt = randomBytes(16);
  const hash = scryptSync(pw, salt, 64);
  return `scrypt$${salt.toString("hex")}$${hash.toString("hex")}`;
}

export function verifyPassword(pw: string, stored: string): boolean {
  const [, saltHex, hashHex] = stored.split("$");
  const expected = Buffer.from(hashHex, "hex");
  const got = scryptSync(pw, Buffer.from(saltHex, "hex"), expected.length);
  return timingSafeEqual(expected, got);
}

function b64url(s: string) {
  return Buffer.from(s).toString("base64url");
}

export function signToken(userId: string): string {
  const payload = b64url(JSON.stringify({ sub: userId, exp: Date.now() + TOKEN_TTL_MS }));
  const sig = createHmac("sha256", SECRET).update(payload).digest("base64url");
  return `${payload}.${sig}`;
}

export function verifyToken(token: string | undefined): string | null {
  if (!token) return null;
  const [payload, sig] = token.split(".");
  if (!payload || !sig) return null;
  const expected = createHmac("sha256", SECRET).update(payload).digest("base64url");
  if (sig.length !== expected.length || !timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) return null;
  try {
    const data = JSON.parse(Buffer.from(payload, "base64url").toString()) as { sub: string; exp: number };
    return data.exp > Date.now() ? data.sub : null;
  } catch {
    return null;
  }
}
