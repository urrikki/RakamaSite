import { TIMEZONE } from "./config.ts";

// ─────────────────────────────────────────────
// Calendrier : 1 evenement par semaine (lundi -> dimanche, heure de Paris).
// Chaque jour de la semaine donne 1 pack evenement (7 max), cumulables et
// ouvrables plus tard, meme apres la fin de l'evenement.
// Les visuels (bordure, particules) sont definis cote site, par `id`.
// ─────────────────────────────────────────────

export interface GameEvent {
  id: string;
  name: string;
  start: string; // lundi, YYYY-MM-DD
  blurb: string;
}

export const EVENTS: GameEvent[] = [
  { id: "thanksgiving-2026", name: "Thanksgiving", start: "2026-11-23", blurb: "Feuilles d'automne et grand festin." },
  { id: "saint-nicolas-2026", name: "Saint-Nicolas", start: "2026-11-30", blurb: "Le patron des enfants passe avec sa hotte." },
  { id: "hanoucca-2026", name: "Hanoucca", start: "2026-12-07", blurb: "La fête des lumières et ses huit bougies." },
  { id: "sainte-lucie-2026", name: "Sainte-Lucie", start: "2026-12-14", blurb: "Couronne de bougies au cœur de l'hiver." },
  { id: "noel-2026", name: "Noël", start: "2026-12-21", blurb: "Neige, sapin et cadeaux." },
  { id: "nouvel-an-2027", name: "Nouvel An 2027", start: "2026-12-28", blurb: "Feux d'artifice pour la nouvelle année." },
  { id: "epiphanie-2027", name: "Épiphanie", start: "2027-01-04", blurb: "Galette et couronne des rois." },
  { id: "seijin-2027", name: "Seijin no Hi", start: "2027-01-11", blurb: "Le jour de la majorité au Japon." },
  { id: "dosojin-2027", name: "Dōsojin Matsuri", start: "2027-01-18", blurb: "La fête du feu de Nozawa." },
  { id: "chandeleur-2027", name: "Chandeleur", start: "2027-01-25", blurb: "Crêpes et chandelles." },
  { id: "setsubun-2027", name: "Setsubun", start: "2027-02-01", blurb: "On chasse les oni à coups de haricots." },
  { id: "nouvel-an-lunaire-2027", name: "Nouvel An lunaire", start: "2027-02-08", blurb: "Lanternes rouges et dragons dorés." },
  { id: "saint-valentin-2027", name: "Saint-Valentin", start: "2027-02-15", blurb: "Cœurs et chocolats." },
  { id: "carnaval-2027", name: "Carnaval", start: "2027-02-22", blurb: "Masques, confettis et défilés." },
  { id: "hina-matsuri-2027", name: "Hina Matsuri", start: "2027-03-01", blurb: "La fête des poupées et des fleurs de pêcher." },
  { id: "aid-el-fitr-2027", name: "Aïd el-Fitr", start: "2027-03-08", blurb: "Croissant de lune et fin du Ramadan." },
  { id: "saint-patrick-2027", name: "Saint-Patrick", start: "2027-03-15", blurb: "Trèfles et vert à perte de vue." },
  { id: "paques-2027", name: "Pâques", start: "2027-03-22", blurb: "Œufs peints et cloches volantes." },
  { id: "hanami-2027", name: "Hanami", start: "2027-03-29", blurb: "Pique-nique sous les cerisiers en fleurs." },
  { id: "hana-matsuri-2027", name: "Hana Matsuri", start: "2027-04-05", blurb: "Fleurs pour la naissance du Bouddha." },
  { id: "songkran-2027", name: "Songkran", start: "2027-04-12", blurb: "Le nouvel an thaï, à grandes éclaboussures." },
  { id: "jour-de-la-terre-2027", name: "Jour de la Terre", start: "2027-04-19", blurb: "Feuilles, forêts et planète bleue." },
  { id: "golden-week-2027", name: "Golden Week", start: "2027-04-26", blurb: "La grande semaine de vacances japonaise." },
  { id: "kodomo-no-hi-2027", name: "Kodomo no Hi", start: "2027-05-03", blurb: "Les carpes koinobori flottent au vent." },
  { id: "pentecote-2027", name: "Pentecôte", start: "2027-05-10", blurb: "Flammes et colombe." },
  { id: "aid-el-kebir-2027", name: "Aïd el-Kébir", start: "2027-05-17", blurb: "La grande fête du partage." },
  { id: "fete-des-meres-2027", name: "Fête des mères", start: "2027-05-24", blurb: "Bouquets pour les mamans." },
  { id: "yosakoi-2027", name: "Yosakoi Matsuri", start: "2027-05-31", blurb: "Danses et éventails colorés." },
  { id: "ajisai-2027", name: "Ajisai Matsuri", start: "2027-06-07", blurb: "Hortensias sous la pluie de juin." },
  { id: "fete-des-peres-2027", name: "Fête des pères", start: "2027-06-14", blurb: "Cravates et moustaches." },
  { id: "fete-de-la-musique-2027", name: "Fête de la musique", start: "2027-06-21", blurb: "Notes de musique dans toutes les rues." },
  { id: "saint-jean-2027", name: "Saint-Jean", start: "2027-06-28", blurb: "Les grands feux de l'été." },
  { id: "tanabata-2027", name: "Tanabata", start: "2027-07-05", blurb: "Vœux écrits sous la Voie lactée." },
  { id: "14-juillet-2027", name: "14 Juillet", start: "2027-07-12", blurb: "Bleu, blanc, rouge et feux d'artifice." },
  { id: "gion-2027", name: "Gion Matsuri", start: "2027-07-19", blurb: "Les chars géants de Kyōto." },
  { id: "hanabi-2027", name: "Hanabi Taikai", start: "2027-07-26", blurb: "Feux d'artifice d'été en yukata." },
  { id: "nebuta-2027", name: "Nebuta Matsuri", start: "2027-08-02", blurb: "Lanternes géantes illuminées." },
  { id: "obon-2027", name: "Obon", start: "2027-08-09", blurb: "Lanternes flottantes pour les ancêtres." },
  { id: "assomption-2027", name: "Assomption", start: "2027-08-16", blurb: "Lumière et lys blancs." },
  { id: "jizo-bon-2027", name: "Jizō-bon", start: "2027-08-23", blurb: "La fête des enfants de Kyōto." },
  { id: "ganesh-2027", name: "Ganesh Chaturthi", start: "2027-08-30", blurb: "Fleurs de souci et éléphant sacré." },
  { id: "choyo-2027", name: "Chōyō no Sekku", start: "2027-09-06", blurb: "La fête des chrysanthèmes." },
  { id: "tsukimi-2027", name: "Tsukimi", start: "2027-09-13", blurb: "Contempler la pleine lune d'automne." },
  { id: "higan-2027", name: "Higan", start: "2027-09-20", blurb: "Équinoxe et lys araignées rouges." },
  { id: "rosh-hashana-2027", name: "Rosh Hashana", start: "2027-09-27", blurb: "Pomme et miel pour une douce année." },
  { id: "kunchi-2027", name: "Nagasaki Kunchi", start: "2027-10-04", blurb: "La danse du dragon." },
  { id: "taiiku-2027", name: "Taiiku no Hi", start: "2027-10-11", blurb: "Le jour du sport au Japon." },
  { id: "souccot-2027", name: "Souccot", start: "2027-10-18", blurb: "Cabanes et fruits de la récolte." },
  { id: "halloween-2027", name: "Halloween", start: "2027-10-25", blurb: "Citrouilles et fantômes." },
  { id: "muertos-2027", name: "Toussaint · Día de Muertos", start: "2027-11-01", blurb: "Calaveras et fleurs de souci." },
  { id: "saint-martin-2027", name: "Saint-Martin", start: "2027-11-08", blurb: "Le défilé des lanternes." },
  { id: "shichi-go-san-2027", name: "Shichi-Go-San", start: "2027-11-15", blurb: "La fête des enfants de 3, 5 et 7 ans." },
];

const DAY_MS = 24 * 3600 * 1000;

/** Date du jour a Paris, format YYYY-MM-DD */
export function parisDay(now = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}

function dayNumber(isoDay: string): number {
  return Math.round(Date.parse(isoDay + "T00:00:00Z") / DAY_MS);
}

/** Nombre de packs debloques pour un event (0 a 7) */
export function unlockedDays(ev: GameEvent, today = parisDay()): number {
  const diff = dayNumber(today) - dayNumber(ev.start);
  if (diff < 0) return 0;
  return Math.min(7, diff + 1);
}

export function currentEvent(today = parisDay()): GameEvent | undefined {
  return EVENTS.find((e) => {
    const d = dayNumber(today) - dayNumber(e.start);
    return d >= 0 && d < 7;
  });
}

export function eventById(id: string): GameEvent | undefined {
  return EVENTS.find((e) => e.id === id);
}

export function endOf(ev: GameEvent): string {
  return new Date((dayNumber(ev.start) + 6) * DAY_MS).toISOString().slice(0, 10);
}
