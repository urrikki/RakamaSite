// Usage local : node scripts/migrate.ts <chemin/gacha_data.json> [--force]
import { readFileSync } from "node:fs";
import { importDiscord, type DiscordData } from "../src/importer.ts";

const file = process.argv[2];
if (!file) {
  console.error("Usage : node scripts/migrate.ts <gacha_data.json> [--force]");
  process.exit(1);
}
const data = JSON.parse(readFileSync(file, "utf8")) as DiscordData;
await importDiscord(data, process.argv.includes("--force"));
