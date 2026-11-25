import { memo, useMemo, useRef, type CSSProperties } from "react";
import type { Card as CardT } from "../types";
import { RARITY_META } from "../types";
import { eventTheme, eventYear } from "../eventThemes";
import { eventName } from "../eventNames";
import { Motif } from "./motifs";
import "./card.css";

interface Props {
  card: CardT;
  width?: number;
  interactive?: boolean; // inclinaison 3D a la souris
  flipped?: boolean; // affiche le dos
  lite?: boolean; // moins de particules (grilles)
  onClick?: () => void;
  className?: string;
  style?: CSSProperties;
}

function hash(s: string) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
}

function CardImpl({ card, width = 240, interactive = true, flipped = false, lite = false, onClick, className = "", style }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const raf = useRef(0);

  const onMove = (e: React.PointerEvent) => {
    if (!interactive || !ref.current) return;
    const el = ref.current;
    const rect = el.getBoundingClientRect();
    const px = Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width));
    const py = Math.min(1, Math.max(0, (e.clientY - rect.top) / rect.height));
    cancelAnimationFrame(raf.current);
    raf.current = requestAnimationFrame(() => {
      el.style.setProperty("--mx", `${px * 100}%`);
      el.style.setProperty("--my", `${py * 100}%`);
      el.style.setProperty("--rx", `${(0.5 - py) * 22}deg`);
      el.style.setProperty("--ry", `${(px - 0.5) * 26}deg`);
      el.style.setProperty("--hyp", `${Math.min(1, Math.hypot(px - 0.5, py - 0.5) * 2)}`);
      el.style.setProperty("--bgx", `${40 + px * 20}%`);
      el.style.setProperty("--bgy", `${40 + py * 20}%`);
      el.classList.add("is-active");
    });
  };
  const onLeave = () => {
    const el = ref.current;
    if (!el) return;
    cancelAnimationFrame(raf.current);
    el.classList.remove("is-active");
    el.style.setProperty("--rx", "0deg");
    el.style.setProperty("--ry", "0deg");
    el.style.setProperty("--mx", "50%");
    el.style.setProperty("--my", "50%");
    el.style.setProperty("--hyp", "0");
  };

  const variant = card.kind === "normal" ? (card.rarity ?? "C") : card.kind;
  const theme = card.kind === "event" ? eventTheme(card.eventId) : null;

  const vars = {
    "--w": `${width}px`,
    ...(theme ? { "--ev-deep": theme.deep, "--ev-a": theme.a, "--ev-b": theme.b, "--ev-glow": theme.glow } : {}),
    ...style,
  } as CSSProperties;

  return (
    <div
      ref={ref}
      className={`tcg ${className} ${onClick ? "is-clickable" : ""}`}
      data-variant={variant}
      style={vars}
      onPointerMove={onMove}
      onPointerLeave={onLeave}
      onClick={onClick}
    >
      <div className={`tcg-rot ${flipped ? "is-flipped" : ""}`}>
        <div className="tcg-face tcg-front">
          {card.kind === "legacy" ? (
            <LegacyFace card={card} />
          ) : card.kind === "event" ? (
            <EventFace card={card} lite={lite} />
          ) : (
            <NormalFace card={card} />
          )}
          <div className="tcg-glare" />
        </div>
        <div className="tcg-face tcg-back">
          <CardBack />
        </div>
      </div>
    </div>
  );
}

export const Card = memo(CardImpl);

// ─────────────────────────────────────────────
// Faces
// ─────────────────────────────────────────────

function RankMedal({ card }: { card: CardT }) {
  const migration = card.rankSource === "migration";
  return (
    <div className={`tcg-rank ${migration ? "is-migration" : ""}`} title={migration ? "Rang relevé lors de la migration" : "Rang de favori AniList au moment du drop"}>
      <span className="tcg-rank-label">{migration ? "RANG 2026" : "RANG"}</span>
      <span className="tcg-rank-num">{card.rank ? `#${card.rank}` : "#5000+"}</span>
    </div>
  );
}

function Stars({ n }: { n: number }) {
  return (
    <div className="tcg-stars">
      {Array.from({ length: n }, (_, i) => (
        <svg key={i} viewBox="0 0 24 24">
          <path d="M12 2l2.9 6.6 7.1.6-5.4 4.7 1.6 7L12 17.3 5.8 21l1.6-7L2 9.2l7.1-.6z" />
        </svg>
      ))}
    </div>
  );
}

function Art({ card }: { card: CardT }) {
  return (
    <div className="tcg-art">
      <img src={card.image} alt={card.name} loading="lazy" draggable={false} />
    </div>
  );
}

function NormalFace({ card }: { card: CardT }) {
  const r = card.rarity ?? "C";
  const meta = RARITY_META[r];
  return (
    <div className="tcg-normal">
      <div className="tcg-frame" />
      <div className="tcg-window">
        <Art card={card} />
        <div className="tcg-holo" />
        <div className="tcg-glitter" />
        <div className="tcg-shade" />
      </div>
      <RankMedal card={card} />
      <div className="tcg-gem" title={meta.label}>
        <span>{r}</span>
      </div>
      <div className="tcg-plate">
        <div className="tcg-name">{card.name}</div>
        <div className="tcg-anime">{card.anime || "—"}</div>
        <Stars n={meta.stars} />
      </div>
      <div className="tcg-frame-shine" />
    </div>
  );
}

function EventFace({ card, lite }: { card: CardT; lite: boolean }) {
  const theme = eventTheme(card.eventId);
  const year = eventYear(card.eventId);
  const seed = hash(card.uid);

  // Motifs sur le pourtour du cadre
  const border = useMemo(() => {
    const spots: { x: number; y: number; s: number; rot: number; m: string; d: number }[] = [];
    const per = 6;
    for (let i = 0; i < per; i++) {
      const t = (i + 0.5) / per;
      spots.push({ x: t * 100, y: 0, s: 1, rot: -8 + (i % 3) * 8, m: theme.motifs[i % theme.motifs.length], d: i * 0.4 });
      spots.push({ x: t * 100, y: 100, s: 1, rot: 8 - (i % 3) * 8, m: theme.motifs[(i + 1) % theme.motifs.length], d: i * 0.3 });
    }
    for (let i = 1; i < 8; i++) {
      const t = i / 8;
      spots.push({ x: 0, y: t * 100, s: 0.85, rot: (i % 2) * 20 - 10, m: theme.motifs[(i + 2) % theme.motifs.length], d: i * 0.5 });
      spots.push({ x: 100, y: t * 100, s: 0.85, rot: (i % 2) * -20 + 10, m: theme.motifs[i % theme.motifs.length], d: i * 0.35 });
    }
    return spots;
  }, [theme]);

  const particles = useMemo(() => {
    const n = lite ? 5 : 12;
    return Array.from({ length: n }, (_, i) => {
      const h = hash(`${seed}-${i}`);
      return {
        left: (h % 1000) / 10,
        top: ((h >> 10) % 1000) / 10,
        delay: ((h >> 4) % 6000) / 1000,
        dur: 5 + ((h >> 8) % 5000) / 1000,
        size: 0.6 + ((h >> 12) % 100) / 100,
        m: theme.motifs[i % theme.motifs.length],
      };
    });
  }, [seed, lite, theme]);

  return (
    <div className="tcg-event" data-fx={theme.fx}>
      <div className="tcg-ev-frame" />
      <div className="tcg-window">
        <Art card={card} />
        <div className="tcg-ev-holo" />
        <div className="tcg-glitter" />
        <div className="tcg-shade" />
        <div className="tcg-ev-particles">
          {particles.map((p, i) => (
            <span
              key={i}
              style={{
                left: `${p.left}%`,
                top: `${p.top}%`,
                animationDelay: `-${p.delay}s`,
                animationDuration: `${p.dur}s`,
                fontSize: `${p.size}em`,
              }}
            >
              <Motif name={p.m} size={16} />
            </span>
          ))}
        </div>
        {theme.showYear && (
          <div className="tcg-ev-year">
            {[0, 1, 2].map((i) => (
              <span key={i} className={`tcg-ev-burst b${i}`}>
                <Motif name="firework" size={64} />
              </span>
            ))}
            <span className="tcg-ev-year-text">{year}</span>
          </div>
        )}
      </div>
      <div className="tcg-ev-border">
        {[0, 1, 2, 3].map((i) => (
          <span key={`c${i}`} className={`tcg-ev-corner k${i}`}>
            <Motif name={theme.motifs[i % 2 === 0 ? 0 : Math.min(1, theme.motifs.length - 1)]} size={40} />
          </span>
        ))}
        {border.map((b, i) => (
          <span
            key={i}
            style={{
              left: `${b.x}%`,
              top: `${b.y}%`,
              transform: `translate(-50%, -50%) rotate(${b.rot}deg) scale(${b.s})`,
              animationDelay: `${b.d}s`,
              color: i % 3 === 0 ? "var(--ev-b)" : "var(--ev-a)",
            }}
          >
            <Motif name={b.m} size={18} />
          </span>
        ))}
      </div>
      <RankMedal card={card} />
      <div className="tcg-plate tcg-ev-plate">
        <div className="tcg-name">{card.name}</div>
        <div className="tcg-anime">{card.anime || "—"}</div>
        <div className="tcg-ev-ribbon">
          <Motif name={theme.motifs[0]} size={12} />
          <span>{eventName(card.eventId)}</span>
          <Motif name={theme.motifs[0]} size={12} />
        </div>
      </div>
      <div className="tcg-frame-shine" />
    </div>
  );
}

function LegacyFace({ card }: { card: CardT }) {
  return (
    <div className="tcg-legacy">
      <div className="crt-body">
        <div className="crt-screen">
          <div className="crt-picture">
            <img src={card.image} alt={card.name} loading="lazy" draggable={false} />
          </div>
          <div className="crt-scan" />
          <div className="crt-roll" />
          <div className="crt-noise" />
          <div className="crt-vignette" />
          <div className="crt-osd crt-osd-top">
            <span>CH {card.rank ? String(card.rank).padStart(4, "0") : "5000+"}</span>
            <span className="crt-rec">● ARCHIVE</span>
          </div>
          <div className="crt-osd crt-osd-bottom">
            <div className="crt-name">{card.name}</div>
            <div className="crt-anime">{card.anime}</div>
          </div>
          <div className="crt-glass" />
        </div>
        <div className="crt-panel">
          <div className="crt-brand">RAKAMA · DISCORD</div>
          <div className="crt-grille" />
          <div className="crt-knobs">
            <i />
            <i />
          </div>
        </div>
      </div>
      <div className="crt-rank-tag" title="Rang relevé lors de la migration">
        rang {card.rank ? `#${card.rank}` : "#5000+"}
      </div>
    </div>
  );
}

export function CardBack() {
  return (
    <div className="tcg-backface">
      <div className="tcg-back-pattern" />
      <div className="tcg-back-emblem">
        <svg viewBox="0 0 100 100">
          <defs>
            <linearGradient id="emb" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0" stopColor="#ffe9a8" />
              <stop offset=".5" stopColor="#c8912b" />
              <stop offset="1" stopColor="#fff3c4" />
            </linearGradient>
          </defs>
          <circle cx="50" cy="50" r="44" fill="none" stroke="url(#emb)" strokeWidth="2.5" />
          <circle cx="50" cy="50" r="36" fill="none" stroke="url(#emb)" strokeWidth="1" strokeDasharray="2 3" />
          <path d="M50 14l9 27h28L64 57l9 28-23-17-23 17 9-28-23-16h28z" fill="url(#emb)" opacity=".9" />
        </svg>
        <span>RAKAMA</span>
      </div>
    </div>
  );
}
