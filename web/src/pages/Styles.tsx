import { useMemo } from "react";
import { useStore } from "../store";
import { useEvents } from "../useEvents";
import { Card } from "../components/Card";
import { RARITY_ORDER, type Card as CardT } from "../types";

// Galerie de tous les styles de cartes : raretes, Archives et les 52 bordures d'evenement.
export default function Styles() {
  const { cards } = useStore();
  const { data } = useEvents();
  const images = useMemo(() => cards.map((c) => c.image), [cards]);
  const img = (i: number) => images[i % Math.max(1, images.length)] ?? "";

  const base = (i: number, extra: Partial<CardT>): CardT => ({
    uid: `style-${i}`,
    charId: 0,
    name: "Exemple",
    anime: "Aperçu de style",
    image: img(i * 7),
    kind: "normal",
    rarity: "C",
    rank: 100 + i,
    rankSource: "drop",
    eventId: null,
    origin: "pack",
    obtainedAt: null,
    favorite: false,
    ...extra,
  });

  return (
    <div className="page">
      <h1 className="title">Styles de cartes</h1>
      <p className="subtitle">Toutes les bordures du jeu, pour voir à quoi ressemble chaque rareté et chaque événement.</p>

      <h3 className="section-title" style={{ marginTop: 30 }}>
        Raretés
      </h3>
      <div className="styles-row">
        {RARITY_ORDER.map((r, i) => (
          <Card key={r} card={base(i, { rarity: r, name: r })} width={210} />
        ))}
        <Card card={base(9, { kind: "legacy", rarity: null, name: "Archives", rankSource: "migration" })} width={210} />
      </div>

      <h3 className="section-title" style={{ marginTop: 40 }}>
        Événements
      </h3>
      <div className="styles-row">
        {data?.events.map((e, i) => (
          <Card key={e.id} card={base(20 + i, { kind: "event", rarity: null, eventId: e.id, name: e.name })} width={210} lite />
        ))}
      </div>
      <style>{`.styles-row{display:flex;flex-wrap:wrap;gap:22px;margin-top:16px}`}</style>
    </div>
  );
}
