// Definit (ou reinitialise) le mot de passe d'un joueur.
// Usage : node scripts/set-password.ts <urrikki|frere> <motdepasse>
import { db, getUser } from "../src/db.ts";
import { hashPassword } from "../src/auth.ts";
import { ensureUsers } from "../src/seed.ts";

const [userId, password] = process.argv.slice(2);
ensureUsers();
if (!userId || !password || !getUser(userId)) {
  console.error("Usage : node scripts/set-password.ts <urrikki|frere> <motdepasse>");
  process.exit(1);
}
db.prepare("UPDATE users SET password_hash = ? WHERE id = ?").run(hashPassword(password), userId);
console.log(`Mot de passe de ${userId} mis à jour.`);
