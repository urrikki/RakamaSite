// Habillage visuel de chaque evenement (bordure, couleurs, particules).
// La cle est l'id de l'evenement sans l'annee (ex: "noel-2026" -> "noel").

export type Fx = "fall" | "rise" | "float" | "twinkle" | "burst";

export interface EventTheme {
  deep: string; // fond du cadre
  a: string; // couleur principale
  b: string; // couleur secondaire
  glow: string; // lueur
  motifs: string[]; // motifs de bordure (le 1er est le plus present)
  fx: Fx; // animation des particules
  showYear?: boolean; // affiche l'annee en gros (Nouvel An)
}

const T: Record<string, EventTheme> = {
  thanksgiving: { deep: "#2b1206", a: "#e0702a", b: "#c9421c", glow: "#ffb15e", motifs: ["maple", "leaf", "apple"], fx: "fall" },
  "saint-nicolas": { deep: "#260808", a: "#d4282d", b: "#f2d48a", glow: "#ffd98a", motifs: ["gift", "star", "bell"], fx: "fall" },
  hanoucca: { deep: "#06122e", a: "#3a7bff", b: "#dfe8ff", glow: "#9cc1ff", motifs: ["candle", "star", "sparkle"], fx: "twinkle" },
  "sainte-lucie": { deep: "#10141f", a: "#f4f1e8", b: "#d33", glow: "#ffe6a8", motifs: ["candle", "flame", "snow"], fx: "rise" },
  noel: { deep: "#07200f", a: "#d6283a", b: "#1f8a4c", glow: "#fff2c2", motifs: ["snow", "pine", "gift", "bell"], fx: "fall" },
  "nouvel-an": { deep: "#05041a", a: "#ffd36b", b: "#ff5ec8", glow: "#9ae6ff", motifs: ["firework", "sparkle", "star"], fx: "burst", showYear: true },
  epiphanie: { deep: "#1d1406", a: "#e7b440", b: "#8a5a19", glow: "#ffe08a", motifs: ["crown", "star", "sparkle"], fx: "twinkle" },
  seijin: { deep: "#1d0a1f", a: "#e64980", b: "#ffd1dc", glow: "#ffb3c8", motifs: ["fan", "flower", "sparkle"], fx: "float" },
  dosojin: { deep: "#1a0602", a: "#ff6a1a", b: "#ffd04a", glow: "#ff9b3d", motifs: ["flame", "sparkle"], fx: "rise" },
  chandeleur: { deep: "#211405", a: "#f0b75a", b: "#fff1cf", glow: "#ffd98a", motifs: ["candle", "moon", "sparkle"], fx: "rise" },
  setsubun: { deep: "#1c0a06", a: "#e03131", b: "#3b5bdb", glow: "#ffb37a", motifs: ["oni", "bean", "mask"], fx: "fall" },
  "nouvel-an-lunaire": { deep: "#2a0505", a: "#e8261f", b: "#ffcf3f", glow: "#ffcf3f", motifs: ["lantern", "dragon", "firework"], fx: "float" },
  "saint-valentin": { deep: "#2a0614", a: "#ff3d7f", b: "#ffc2d6", glow: "#ff8fb4", motifs: ["heart", "sparkle", "ribbon"], fx: "rise" },
  carnaval: { deep: "#16062a", a: "#a33bff", b: "#ffcc00", glow: "#35e0c5", motifs: ["mask", "star", "sparkle"], fx: "burst" },
  "hina-matsuri": { deep: "#2a0c18", a: "#ff8fb1", b: "#ffe3ec", glow: "#ffc2d1", motifs: ["flower", "petal", "lantern"], fx: "fall" },
  "aid-el-fitr": { deep: "#041a1a", a: "#1fb89a", b: "#f2d38a", glow: "#ffe6a3", motifs: ["crescent", "star", "lantern"], fx: "twinkle" },
  "saint-patrick": { deep: "#05200d", a: "#2fb84e", b: "#d6b24a", glow: "#8cf0a2", motifs: ["clover", "sparkle"], fx: "fall" },
  paques: { deep: "#161a2a", a: "#ffb3d1", b: "#9be7c4", glow: "#fff3b0", motifs: ["egg", "flower", "bell"], fx: "float" },
  hanami: { deep: "#221019", a: "#ffb7cf", b: "#fff0f5", glow: "#ffd6e5", motifs: ["petal", "flower"], fx: "fall" },
  "hana-matsuri": { deep: "#1a1408", a: "#f8d24a", b: "#ff9ec4", glow: "#fff0a8", motifs: ["flower", "sparkle"], fx: "fall" },
  songkran: { deep: "#031b2e", a: "#2ec5ff", b: "#ffe066", glow: "#8be9ff", motifs: ["drop", "flower"], fx: "fall" },
  "jour-de-la-terre": { deep: "#041a12", a: "#2fae66", b: "#2f8fd6", glow: "#a8f0c6", motifs: ["globe", "leaf"], fx: "float" },
  "golden-week": { deep: "#1c1505", a: "#f0b429", b: "#ffffff", glow: "#ffe08a", motifs: ["sparkle", "carp", "flower"], fx: "twinkle" },
  "kodomo-no-hi": { deep: "#06182c", a: "#2f7dff", b: "#ff4d4d", glow: "#9cc9ff", motifs: ["carp"], fx: "float" },
  pentecote: { deep: "#200704", a: "#ff4d1a", b: "#fff4e0", glow: "#ffb27a", motifs: ["flame", "dove"], fx: "rise" },
  "aid-el-kebir": { deep: "#071a14", a: "#2bb673", b: "#e9c46a", glow: "#ffe6a3", motifs: ["crescent", "star", "lantern"], fx: "twinkle" },
  "fete-des-meres": { deep: "#24101a", a: "#ff6fa3", b: "#ffe1ec", glow: "#ffb3cf", motifs: ["flower", "heart", "ribbon"], fx: "fall" },
  yosakoi: { deep: "#1d0814", a: "#ff2e7e", b: "#ffd23f", glow: "#ff9ad0", motifs: ["fan", "sparkle", "petal"], fx: "burst" },
  ajisai: { deep: "#0c1030", a: "#7b8cff", b: "#c78cff", glow: "#a9c0ff", motifs: ["hydrangea", "drop"], fx: "fall" },
  "fete-des-peres": { deep: "#0c1422", a: "#3b6fb6", b: "#d9a441", glow: "#9ec2ff", motifs: ["tie", "mustache", "star"], fx: "float" },
  "fete-de-la-musique": { deep: "#120820", a: "#ff5ce1", b: "#39e6ff", glow: "#f8a6ff", motifs: ["note", "star"], fx: "rise" },
  "saint-jean": { deep: "#1c0904", a: "#ff8a1f", b: "#ffd35a", glow: "#ffae57", motifs: ["flame", "sparkle"], fx: "rise" },
  tanabata: { deep: "#050a24", a: "#7aa7ff", b: "#ffe58a", glow: "#c9d8ff", motifs: ["star", "sparkle"], fx: "twinkle" },
  "14-juillet": { deep: "#060b24", a: "#2b54d6", b: "#e8333b", glow: "#ffffff", motifs: ["firework", "star", "sparkle"], fx: "burst" },
  gion: { deep: "#200a06", a: "#d9381e", b: "#f0c05a", glow: "#ffc77a", motifs: ["lantern", "fan"], fx: "float" },
  hanabi: { deep: "#030716", a: "#ff5e8a", b: "#5ee7ff", glow: "#ffe27a", motifs: ["firework", "sparkle", "fan"], fx: "burst" },
  nebuta: { deep: "#140810", a: "#ff3b30", b: "#ffd23f", glow: "#ffa14a", motifs: ["lantern", "dragon"], fx: "float" },
  obon: { deep: "#0a0d1e", a: "#ffb347", b: "#ffe9c2", glow: "#ffcf7a", motifs: ["lantern", "flame"], fx: "rise" },
  assomption: { deep: "#0d1424", a: "#e8eefc", b: "#6c8fd8", glow: "#ffffff", motifs: ["flower", "star", "sparkle"], fx: "twinkle" },
  "jizo-bon": { deep: "#1a0f08", a: "#ff7a45", b: "#ffd9a8", glow: "#ffc28a", motifs: ["lantern", "flower"], fx: "float" },
  ganesh: { deep: "#200c02", a: "#ff8a00", b: "#ffd000", glow: "#ffb84d", motifs: ["mum", "flower", "sparkle"], fx: "fall" },
  choyo: { deep: "#1d1404", a: "#f5b301", b: "#fff2c4", glow: "#ffd76a", motifs: ["mum", "leaf"], fx: "fall" },
  tsukimi: { deep: "#070a1c", a: "#ffe7a3", b: "#9fb4ff", glow: "#fff4cc", motifs: ["moon", "star", "sparkle"], fx: "twinkle" },
  higan: { deep: "#1c0407", a: "#e3192d", b: "#ff7a7a", glow: "#ff6b6b", motifs: ["mum", "petal"], fx: "fall" },
  "rosh-hashana": { deep: "#1a1004", a: "#d93a2b", b: "#e7b33c", glow: "#ffd27a", motifs: ["apple", "drop", "star"], fx: "float" },
  kunchi: { deep: "#04161c", a: "#18b5a4", b: "#e2b13c", glow: "#7bf0e0", motifs: ["dragon", "ball", "sparkle"], fx: "float" },
  taiiku: { deep: "#06151f", a: "#1fa2ff", b: "#ffb800", glow: "#8fd4ff", motifs: ["ball", "star"], fx: "burst" },
  souccot: { deep: "#121a06", a: "#8cc63f", b: "#f2b134", glow: "#d7f28a", motifs: ["hut", "leaf", "apple"], fx: "fall" },
  halloween: { deep: "#140620", a: "#ff7a1a", b: "#8b3dff", glow: "#ffa24d", motifs: ["pumpkin", "ghost", "bat"], fx: "float" },
  muertos: { deep: "#1a0626", a: "#ff9f1c", b: "#ff3ea5", glow: "#ffc15e", motifs: ["skull", "mum", "flower"], fx: "fall" },
  "saint-martin": { deep: "#0b0f1d", a: "#ffb547", b: "#e64a19", glow: "#ffd08a", motifs: ["lantern", "star"], fx: "float" },
  "shichi-go-san": { deep: "#1f0a12", a: "#e83f6f", b: "#f6c65b", glow: "#ffb0c7", motifs: ["fan", "flower", "sparkle"], fx: "twinkle" },
};

const FALLBACK: EventTheme = { deep: "#120b24", a: "#b388ff", b: "#ffd36b", glow: "#e0c8ff", motifs: ["sparkle", "star"], fx: "twinkle" };

export function themeKey(eventId: string | null | undefined): string {
  return (eventId ?? "").replace(/-\d{4}$/, "");
}

export function eventTheme(eventId: string | null | undefined): EventTheme {
  return T[themeKey(eventId)] ?? FALLBACK;
}

export function eventYear(eventId: string | null | undefined): string {
  return (eventId ?? "").match(/(\d{4})$/)?.[1] ?? "";
}
