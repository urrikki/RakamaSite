import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useStore } from "../store";
import { useEvents } from "../useEvents";
import { eventTheme } from "../eventThemes";
import { Motif } from "../components/motifs";
import { Card } from "../components/Card";
import CardModal from "../components/CardModal";
import Opening, { type OpeningMode } from "../components/Opening";
import type { Card as CardT } from "../types";
import "./events.css";

function fmtDay(d: string) {
  return new Date(d + "T12:00:00").toLocaleDateString("fr-FR", { day: "numeric", month: "short" });
}

export default function Events() {
  const { cards } = useStore();
  const { data } = useEvents();
  const [selected, setSelected] = useState<string | null>(null);
  const [opening, setOpening] = useState<OpeningMode | null>(null);
  const [open, setOpen] = useState<string | null>(null);

  const byEvent = useMemo(() => {
    const m = new Map<string, CardT[]>();
    for (const c of cards) if (c.kind === "event" && c.eventId) m.set(c.eventId, [...(m.get(c.eventId) ?? []), c]);
    return m;
  }, [cards]);

  if (!data) return <div className="page"><div className="spinner" /></div>;

  const current = data.events.find((e) => e.id === data.current);
  const sel = data.events.find((e) => e.id === (selected ?? data.current)) ?? current;
  const selCards = sel ? byEvent.get(sel.id) ?? [] : [];
  const t = sel ? eventTheme(sel.id) : null;
  const modalIdx = open ? selCards.findIndex((c) => c.uid === open) : -1;

  // Apercu : une carte de l'event si on en a une, sinon une carte d'exemple
  const preview: CardT | null = sel
    ? selCards[0] ?? {
        uid: `preview-${sel.id}`,
        charId: 0,
        name: "???",
        anime: "Carte événement",
        image: "https://s4.anilist.co/file/anilistcdn/character/large/default.jpg",
        kind: "event",
        rarity: null,
        rank: null,
        rankSource: "drop",
        eventId: sel.id,
        origin: "event",
        obtainedAt: null,
        favorite: false,
      }
    : null;

  return (
    <div className="page events">
      {sel && t && (
        <section className="ev-hero" style={{ "--a": t.a, "--b": t.b, "--deep": t.deep, "--glow": t.glow } as React.CSSProperties}>
          <div className="ev-hero-motifs">
            {Array.from({ length: 14 }, (_, i) => (
              <Motif key={i} name={t.motifs[i % t.motifs.length]} size={24 + (i % 4) * 12} className={`evh-m evh-m${i}`} />
            ))}
          </div>
          <div className="ev-hero-text">
            <div className="tile-kicker">
              {sel.id === data.current ? "Événement en cours" : sel.unlocked >= 7 ? "Événement passé" : sel.unlocked > 0 ? "En cours" : "À venir"} · {fmtDay(sel.start)} → {fmtDay(sel.end)}
            </div>
            <h1 className="ev-title">{sel.name}</h1>
            <p className="ev-blurb">{sel.blurb}</p>
            <div className="ev-days">
              {Array.from({ length: 7 }, (_, i) => (
                <div key={i} className={`ev-day ${i < sel.unlocked ? (i < sel.unlocked - sel.available ? "used" : "ready") : ""}`}>
                  <Motif name={t.motifs[0]} size={18} />
                  <span>J{i + 1}</span>
                </div>
              ))}
            </div>
            <div className="ev-actions">
              <button
                className="btn"
                style={{ "--c1": t.a, "--c2": t.b } as React.CSSProperties}
                disabled={!sel.available}
                onClick={() => setOpening({ kind: "event", eventId: sel.id, count: 1 })}
              >
                {sel.available ? `Ouvrir un pack (${sel.available} dispo)` : sel.unlocked === 0 ? "Pas encore commencé" : "Aucun pack dispo"}
              </button>
              {sel.available > 1 && (
                <button className="btn ghost" onClick={() => setOpening({ kind: "event", eventId: sel.id, count: sel.available })}>
                  Tout ouvrir
                </button>
              )}
            </div>
            <p className="muted small">1 pack par jour pendant 7 jours, 1 carte sans rareté par pack. Les packs non ouverts restent disponibles après l'événement.</p>
          </div>
          {preview && (
            <div className="ev-hero-card">
              <Card card={preview} width={280} />
            </div>
          )}
        </section>
      )}

      {sel && selCards.length > 0 && (
        <section className="ev-owned">
          <h3 className="section-title">
            Tes cartes {sel.name} <span className="muted mono">({selCards.length})</span>
          </h3>
          <div className="ev-owned-row">
            {selCards.map((c) => (
              <Card key={c.uid} card={c} width={170} lite onClick={() => setOpen(c.uid)} />
            ))}
          </div>
        </section>
      )}

      <section className="ev-calendar">
        <h3 className="section-title">
          Calendrier · 52 semaines{" "}
          <Link to="/styles" className="muted" style={{ fontSize: 14, fontFamily: "Sora" }}>
            · voir toutes les bordures →
          </Link>
        </h3>
        <div className="ev-grid">
          {data.events.map((e) => {
            const th = eventTheme(e.id);
            const state = e.id === data.current ? "now" : e.unlocked >= 7 ? "past" : e.unlocked > 0 ? "now" : "future";
            const owned = byEvent.get(e.id)?.length ?? 0;
            return (
              <button
                key={e.id}
                className={`ev-tile ${state} ${sel?.id === e.id ? "sel" : ""}`}
                style={{ "--a": th.a, "--b": th.b, "--deep": th.deep, "--glow": th.glow } as React.CSSProperties}
                onClick={() => {
                  setSelected(e.id);
                  window.scrollTo({ top: 0, behavior: "smooth" });
                }}
              >
                <Motif name={th.motifs[0]} size={30} className="ev-tile-icon" />
                <span className="ev-tile-name">{e.name}</span>
                <span className="ev-tile-date">{fmtDay(e.start)}</span>
                {e.available > 0 && <span className="ev-tile-badge">×{e.available}</span>}
                {owned > 0 && <span className="ev-tile-owned">{owned} carte{owned > 1 ? "s" : ""}</span>}
              </button>
            );
          })}
        </div>
      </section>

      {opening && <Opening mode={opening} onClose={() => setOpening(null)} />}
      {open && modalIdx >= 0 && (
        <CardModal
          card={selCards[modalIdx]}
          onClose={() => setOpen(null)}
          onPrev={modalIdx > 0 ? () => setOpen(selCards[modalIdx - 1].uid) : undefined}
          onNext={modalIdx < selCards.length - 1 ? () => setOpen(selCards[modalIdx + 1].uid) : undefined}
        />
      )}
    </div>
  );
}
