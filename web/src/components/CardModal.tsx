import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { api } from "../api";
import { useStore } from "../store";
import { toast } from "../toast";
import { Card } from "./Card";
import { eventName } from "../eventNames";
import { RARITY_META, type Card as CardT } from "../types";
import "./modal.css";

const ORIGIN: Record<string, string> = {
  pack: "Pack",
  pity: "Pack (pity)",
  recycle: "Pack bonus de recyclage",
  fusion: "Fusion",
  event: "Pack événement",
  discord: "Discord",
};

export default function CardModal({
  card,
  readOnly,
  onClose,
  onPrev,
  onNext,
  position,
}: {
  card: CardT;
  readOnly?: boolean;
  onClose: () => void;
  onPrev?: () => void;
  onNext?: () => void;
  position?: string;
}) {
  const { me, setCards, setMe, rules } = useStore();
  const [flipped, setFlipped] = useState(false);
  const [confirmGrind, setConfirmGrind] = useState(false);
  const inShowcase = me?.showcase.includes(card.uid) ?? false;

  useEffect(() => {
    setFlipped(false);
    setConfirmGrind(false);
  }, [card.uid]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowLeft") onPrev?.();
      if (e.key === "ArrowRight") onNext?.();
      if (e.key === "f" || e.key === " ") {
        e.preventDefault();
        setFlipped((f) => !f);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose, onPrev, onNext]);

  const toggleFav = async () => {
    const on = !card.favorite;
    setCards((cs) => cs.map((c) => (c.uid === card.uid ? { ...c, favorite: on } : c)));
    try {
      await api(`/game/cards/${card.uid}/favorite`, { body: { on } });
    } catch (e) {
      toast((e as Error).message, true);
      setCards((cs) => cs.map((c) => (c.uid === card.uid ? { ...c, favorite: !on } : c)));
    }
  };

  const toggleShowcase = async () => {
    if (!me) return;
    const next = inShowcase ? me.showcase.filter((u) => u !== card.uid) : [...me.showcase, card.uid];
    if (next.length > 6) return toast("La vitrine est pleine (6 cartes max).", true);
    try {
      const r = await api<{ user: typeof me }>("/me", { method: "PATCH", body: { showcase: next } });
      setMe(r.user);
      toast(inShowcase ? "Retirée de la vitrine" : "Ajoutée à la vitrine ✦");
    } catch (e) {
      toast((e as Error).message, true);
    }
  };

  const grind = async () => {
    if (!confirmGrind) return setConfirmGrind(true);
    try {
      const r = await api<{ gained: number; user: NonNullable<typeof me> }>("/game/cards/grind", { body: { uids: [card.uid] } });
      setMe(r.user);
      setCards((cs) => cs.filter((c) => c.uid !== card.uid));
      toast(`Carte broyée : +${r.gained} points`);
      if (onNext) onNext();
      else if (onPrev) onPrev();
      else onClose();
    } catch (e) {
      toast((e as Error).message, true);
    }
  };

  const rarity = card.kind === "normal" && card.rarity ? RARITY_META[card.rarity] : null;
  const kindLabel = card.kind === "event" ? "Carte événement" : card.kind === "legacy" ? "Carte Archives" : rarity?.label;
  const accent = card.kind === "event" ? "#ff7ad9" : card.kind === "legacy" ? "#c9b89a" : rarity?.color;

  return createPortal(
    <div className="modal" onClick={onClose}>
      <div className="modal-inner" onClick={(e) => e.stopPropagation()} style={{ "--acc": accent } as React.CSSProperties}>
        <button className="modal-nav prev" disabled={!onPrev} onClick={onPrev} aria-label="Précédente">
          ‹
        </button>
        <div className="modal-card" key={card.uid}>
          <Card card={card} width={380} flipped={flipped} onClick={() => setFlipped((f) => !f)} />
          <div className="modal-hint muted">Clique la carte (ou F) pour la retourner</div>
        </div>
        <div className="modal-info">
          {position && <div className="modal-pos muted mono">{position}</div>}
          <div className="modal-kind" style={{ color: accent }}>
            {kindLabel}
            {rarity && <span className="mono"> · {card.rarity}</span>}
          </div>
          <h2 className="modal-name">{card.name}</h2>
          <div className="modal-anime">{card.anime || "Anime inconnu"}</div>

          <dl className="modal-stats">
            <div>
              <dt>Rang de favori</dt>
              <dd className="mono">
                {card.rank ? `#${card.rank}` : "#5000+"}
                <small>{card.rankSource === "migration" ? "relevé à la migration" : "figé au moment du drop"}</small>
              </dd>
            </div>
            <div>
              <dt>Obtenue</dt>
              <dd>
                {card.obtainedAt ? new Date(card.obtainedAt).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" }) : "Sur Discord"}
                <small>{ORIGIN[card.origin] ?? card.origin}</small>
              </dd>
            </div>
            {card.kind === "event" && (
              <div>
                <dt>Événement</dt>
                <dd>{eventName(card.eventId)}</dd>
              </div>
            )}
            {card.kind === "legacy" && (
              <div className="wide">
                <dt>Archives</dt>
                <dd>
                  <small>Carte d'avant le site, hors rareté, hors fusion et recyclage. Un souvenir de l'époque Discord.</small>
                </dd>
              </div>
            )}
          </dl>

          {!readOnly && (
            <div className="modal-actions">
              <button className={`btn ${card.favorite ? "gold" : "ghost"}`} onClick={toggleFav}>
                {card.favorite ? "★ Favorite" : "☆ Favori"}
              </button>
              <button className={`btn ${inShowcase ? "" : "ghost"}`} onClick={toggleShowcase}>
                {inShowcase ? "✦ En vitrine" : "Mettre en vitrine"}
              </button>
              {card.kind === "event" && (
                <button className="btn danger" onClick={grind} disabled={card.favorite}>
                  {confirmGrind ? "Confirmer ?" : `Broyer (+${rules?.grindEventPoints ?? 25} pts)`}
                </button>
              )}
            </div>
          )}
          <a className="modal-link muted" href={`https://anilist.co/character/${card.charId}`} target="_blank" rel="noreferrer">
            Voir sur AniList ↗
          </a>
        </div>
        <button className="modal-nav next" disabled={!onNext} onClick={onNext} aria-label="Suivante">
          ›
        </button>
        <button className="modal-close" onClick={onClose} aria-label="Fermer">
          ✕
        </button>
      </div>
    </div>,
    document.body,
  );
}
