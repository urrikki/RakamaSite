import { useState } from "react";
import { Link } from "react-router-dom";
import { useStore } from "../store";
import { useEvents } from "../useEvents";
import { Pack, NORMAL_PACK } from "../components/Pack";
import Opening, { type OpeningMode } from "../components/Opening";
import { eventTheme } from "../eventThemes";
import { Motif } from "../components/motifs";
import "./shop.css";

function fmt(ms: number) {
  const s = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  return h ? `${h}h ${String(m).padStart(2, "0")}min` : `${m}min ${String(sec).padStart(2, "0")}s`;
}

export default function Shop() {
  const { me, rules } = useStore();
  const { data: ev } = useEvents();
  const [opening, setOpening] = useState<OpeningMode | null>(null);
  if (!me || !rules) return null;

  const canOpen = Math.floor(me.points / rules.packCost);
  const toNextPack = rules.packCost - (me.points % rules.packCost);
  const msToNextPack = (toNextPack - 1) * rules.msPerPoint + me.nextPointInMs;
  const progress = 1 - toNextPack / rules.packCost;
  const choices = [1, 2, 5, 10];
  const maxN = Math.min(canOpen, rules.maxPacksPerOpen);

  const current = ev?.events.find((e) => e.id === ev.current);
  const pendingEvents = ev?.events.filter((e) => e.available > 0 && e.id !== ev.current) ?? [];

  return (
    <div className="page shop">
      <section className="shop-hero">
        <div className="shop-pack-stage">
          <div className="shop-pack-glow" />
          <Pack look={NORMAL_PACK} width={290} className="shop-pack" />
          <div className="shop-pack-shadow" />
        </div>

        <div className="shop-panel">
          <div className="shop-points">
            <div className="shop-points-label">Tes points</div>
            <div className="shop-points-value">
              <span className="coin big">✦</span>
              {me.points.toLocaleString("fr-FR")}
            </div>
            <div className="shop-bar">
              <div className="shop-bar-fill" style={{ width: `${progress * 100}%` }} />
            </div>
            <div className="shop-bar-legend">
              <span>
                Prochain pack dans <b>{fmt(msToNextPack)}</b>
              </span>
              <span className="muted">+{rules.pointsPerDay} pts / jour</span>
            </div>
          </div>

          <div className="shop-open">
            <div className="shop-open-title">Ouvrir des packs</div>
            <div className="shop-open-grid">
              {choices.map((n) => (
                <button key={n} className="shop-qty" disabled={n > canOpen} onClick={() => setOpening({ kind: "normal", count: n })}>
                  <span className="shop-qty-n">×{n}</span>
                  <span className="shop-qty-cost">{n * rules.packCost} pts</span>
                </button>
              ))}
              <button
                className="shop-qty max"
                disabled={maxN < 1}
                onClick={() => setOpening({ kind: "normal", count: maxN })}
              >
                <span className="shop-qty-n">MAX ×{maxN}</span>
                <span className="shop-qty-cost">{maxN * rules.packCost} pts</span>
              </button>
            </div>
          </div>

          <div className="shop-pity">
            <div className="shop-pity-head">
              <span>Pity UR</span>
              <span className="mono">
                {me.pity} / {rules.pityThreshold}
              </span>
            </div>
            <div className="shop-pity-pips">
              {Array.from({ length: rules.pityThreshold }, (_, i) => (
                <i key={i} className={i < me.pity ? "on" : ""} />
              ))}
            </div>
            <div className="muted small">Une UR est garantie après {rules.pityThreshold} packs sans UR.</div>
          </div>
        </div>
      </section>

      <section className="shop-row">
        {current && (
          <EventTile
            id={current.id}
            name={current.name}
            blurb={current.blurb}
            available={current.available}
            unlocked={current.unlocked}
            onOpen={(n) => setOpening({ kind: "event", eventId: current.id, count: n })}
          />
        )}
        <Link to="/quiz" className="shop-tile quiz-tile panel">
          <div className="tile-kicker">Quiz du jour</div>
          <div className="tile-title">Devine l'anime</div>
          <p className="muted">Trouve-le dès le 1er indice pour gagner jusqu'à 100 points, soit 1 pack.</p>
          <span className="btn sm">Jouer →</span>
        </Link>
        <div className="shop-tile panel rules-tile">
          <div className="tile-kicker">Mécaniques</div>
          <ul>
            <li>
              <b>Recyclage</b> : {rules.recycle.C} C, {rules.recycle.R} R ou {rules.recycle.SR} SR → 1 pack bonus
            </li>
            <li>
              <b>Fusion</b> : 3× la même SSR → UR · 2× la même UR → MYTH
            </li>
            <li>
              <b>Favoris</b> : jamais recyclés
            </li>
          </ul>
        </div>
      </section>

      {pendingEvents.length > 0 && (
        <section className="shop-pending">
          <h3 className="section-title">Packs d'événements en attente</h3>
          <div className="pending-list">
            {pendingEvents.map((e) => {
              const t = eventTheme(e.id);
              return (
                <button key={e.id} className="pending-item" style={{ "--a": t.a, "--b": t.b } as React.CSSProperties} onClick={() => setOpening({ kind: "event", eventId: e.id, count: e.available })}>
                  <Motif name={t.motifs[0]} size={22} color={t.a} />
                  <span>{e.name}</span>
                  <b>×{e.available}</b>
                </button>
              );
            })}
          </div>
        </section>
      )}

      {opening && <Opening mode={opening} onClose={() => setOpening(null)} />}
    </div>
  );
}

function EventTile({
  id,
  name,
  blurb,
  available,
  unlocked,
  onOpen,
}: {
  id: string;
  name: string;
  blurb: string;
  available: number;
  unlocked: number;
  onOpen: (n: number) => void;
}) {
  const t = eventTheme(id);
  return (
    <div className="shop-tile event-tile panel" style={{ "--a": t.a, "--b": t.b, "--deep": t.deep, "--glow": t.glow } as React.CSSProperties}>
      <div className="event-tile-bg">
        {t.motifs.concat(t.motifs).map((m, i) => (
          <Motif key={i} name={m} size={30 + (i % 3) * 14} className={`et-m et-m${i}`} />
        ))}
      </div>
      <div className="tile-kicker">Événement de la semaine</div>
      <div className="tile-title">{name}</div>
      <p className="muted">{blurb}</p>
      <div className="event-days">
        {Array.from({ length: 7 }, (_, i) => (
          <i key={i} className={i < unlocked ? (i < unlocked - available ? "used" : "ready") : ""} />
        ))}
      </div>
      <div className="event-actions">
        <button className="btn sm" style={{ "--c1": t.a, "--c2": t.b } as React.CSSProperties} disabled={!available} onClick={() => onOpen(1)}>
          {available ? `Ouvrir (${available} dispo)` : "Reviens demain"}
        </button>
        {available > 1 && (
          <button className="btn ghost sm" onClick={() => onOpen(available)}>
            Tout ouvrir
          </button>
        )}
      </div>
    </div>
  );
}
