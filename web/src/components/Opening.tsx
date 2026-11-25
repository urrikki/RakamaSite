import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import gsap from "gsap";
import { api } from "../api";
import { useStore } from "../store";
import { toast } from "../toast";
import { Card } from "./Card";
import { Pack, NORMAL_PACK, type PackLook } from "./Pack";
import { ShaderBackdrop, hexToRgb, type BackdropHandle } from "./ShaderBackdrop";
import { Bursts, type BurstsHandle } from "./Bursts";
import { eventTheme } from "../eventThemes";
import { eventName } from "../eventNames";
import { reloadEvents } from "../useEvents";
import { RARITY_META, RARITY_ORDER, type Card as CardT, type OpenResult, type PackResult, type Rarity } from "../types";
import "./opening.css";

export type OpeningMode = { kind: "normal"; count: number } | { kind: "event"; eventId: string; count: number };

const DRAMATIC: Rarity[] = ["SSR", "UR", "MYTH"];

function tellOf(c: CardT): string {
  if (c.kind === "event") return "event";
  return c.rarity && ["SR", ...DRAMATIC].includes(c.rarity) ? c.rarity : "none";
}

function colorOf(c: CardT): string {
  if (c.kind === "event") return eventTheme(c.eventId).glow;
  return RARITY_META[c.rarity ?? "C"].color;
}

function bestOf(cards: CardT[]): CardT | undefined {
  return [...cards].sort((a, b) => {
    const ra = a.kind === "event" ? -1 : RARITY_ORDER.indexOf(a.rarity ?? "C");
    const rb = b.kind === "event" ? -1 : RARITY_ORDER.indexOf(b.rarity ?? "C");
    return ra - rb;
  })[0];
}

export default function Opening({ mode, onClose }: { mode: OpeningMode; onClose: () => void }) {
  const { cards: owned, refresh, setMe } = useStore();
  const ownedBefore = useMemo(() => new Set(owned.map((c) => c.charId)), []); // eslint-disable-line react-hooks/exhaustive-deps

  const [result, setResult] = useState<OpenResult | null>(null);
  const [phase, setPhase] = useState<"intro" | "tearing" | "reveal" | "summary">("intro");
  const [packIdx, setPackIdx] = useState(0);
  const [flipped, setFlipped] = useState<boolean[]>([]);
  const [charging, setCharging] = useState<number | null>(null);
  const [tear, setTear] = useState(0);

  const backdrop = useRef<BackdropHandle>({ color: [0.55, 0.36, 1], intensity: 0.2, target: 0.6 });
  const bursts = useRef<BurstsHandle>(null);
  const packRef = useRef<HTMLDivElement>(null);
  const rowRef = useRef<HTMLDivElement>(null);
  const flashRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);

  const look: PackLook = useMemo(() => {
    if (mode.kind === "normal") return NORMAL_PACK;
    const t = eventTheme(mode.eventId);
    return { a: t.a, b: t.b, deep: t.deep, glow: t.glow, title: eventName(mode.eventId), subtitle: "1 carte · Événement", motif: t.motifs[0] };
  }, [mode]);

  useEffect(() => {
    backdrop.current.color = hexToRgb(look.glow);
  }, [look]);

  // ── Appel API des l'ouverture de l'ecran
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        if (mode.kind === "normal") {
          const r = await api<OpenResult>("/game/packs/open", { body: { count: mode.count } });
          if (alive) {
            setResult(r);
            setMe(r.user);
          }
        } else {
          const r = await api<{ cards: CardT[]; user: OpenResult["user"] }>(`/game/events/${mode.eventId}/open`, {
            body: { count: mode.count },
          });
          if (alive) {
            setResult({ packs: r.cards.map((c) => ({ type: "pack", pity: false, cards: [c] })), fusions: [], recycled: [], user: r.user });
            setMe(r.user);
          }
        }
      } catch (e) {
        toast((e as Error).message, true);
        onClose();
      }
    })();
    return () => {
      alive = false;
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const packs: PackResult[] = result?.packs ?? [];
  const pack = packs[packIdx];

  // ── Dechirure du pack
  const doTear = useCallback(() => {
    if (!result || phase !== "intro") return;
    setPhase("tearing");
    const best = bestOf(pack.cards);
    const color = best ? colorOf(best) : look.glow;
    backdrop.current.color = hexToRgb(color);
    const el = packRef.current!;
    const top = el.querySelector(".pack-top")!;
    const body = el.querySelector(".pack-body")!;
    const r = el.getBoundingClientRect();
    const tl = gsap.timeline({
      onComplete: () => {
        setFlipped(pack.cards.map(() => false));
        setPhase("reveal");
      },
    });
    tl.to({}, { duration: 0.01, onStart: () => setTear(1) })
      .to(top, { x: r.width * 0.9, y: -r.height * 0.35, rotate: 28, opacity: 0, duration: 0.6, ease: "power2.out" })
      .add(() => {
        bursts.current?.burst(r.left + r.width / 2, r.top + r.height * 0.13, [color, "#ffffff", look.b], 140, 1.1);
        backdrop.current.target = 1.6;
      }, 0.05)
      .fromTo(flashRef.current, { opacity: 0 }, { opacity: 0.85, duration: 0.12, yoyo: true, repeat: 1 }, 0.1)
      .to(body, { y: r.height * 0.5, scale: 0.85, opacity: 0, duration: 0.55, ease: "power2.in" }, 0.35)
      .add(() => {
        backdrop.current.target = 0.8;
      }, 0.9);
  }, [result, phase, pack, look]);

  // Glisser sur le pack pour le dechirer
  const drag = useRef<{ x: number; w: number } | null>(null);
  const onPackDown = (e: React.PointerEvent) => {
    if (!result) return;
    const r = packRef.current!.getBoundingClientRect();
    drag.current = { x: e.clientX, w: r.width };
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
  };
  const onPackMove = (e: React.PointerEvent) => {
    if (!drag.current) return;
    const t = Math.max(0, Math.min(1, (e.clientX - drag.current.x) / (drag.current.w * 0.85)));
    setTear(t);
    if (t >= 0.98) {
      drag.current = null;
      doTear();
    }
  };
  const onPackUp = () => {
    if (!drag.current) return;
    drag.current = null;
    if (tear > 0.55) doTear();
    else setTear(0);
  };

  // ── Arrivee des cartes
  useEffect(() => {
    if (phase !== "reveal" || !rowRef.current) return;
    const slots = rowRef.current.querySelectorAll(".reveal-slot");
    gsap.fromTo(
      slots,
      { y: 260, scale: 0.4, opacity: 0, rotate: (i) => (i - 2) * 8 },
      { y: 0, scale: 1, opacity: 1, rotate: 0, duration: 0.7, stagger: 0.09, ease: "back.out(1.4)" },
    );
  }, [phase, packIdx]);

  // ── Retourner une carte
  const flip = useCallback(
    (i: number) => {
      if (phase !== "reveal" || flipped[i] || charging !== null || !pack) return;
      const card = pack.cards[i];
      const slot = rowRef.current?.querySelectorAll<HTMLElement>(".reveal-slot")[i];
      const color = colorOf(card);
      const reveal = () => {
        setFlipped((f) => f.map((v, j) => (j === i ? true : v)));
        if (slot) {
          const r = slot.getBoundingClientRect();
          const big = card.kind === "normal" && card.rarity && DRAMATIC.includes(card.rarity);
          const sr = card.rarity === "SR" || card.kind === "event";
          if (big || sr) {
            bursts.current?.burst(r.left + r.width / 2, r.top + r.height / 2, [color, "#ffffff", color], big ? 220 : 80, big ? 1.4 : 0.8);
          }
          if (big) {
            backdrop.current.color = hexToRgb(color);
            backdrop.current.intensity = 2.2;
            gsap.fromTo(stageRef.current, { x: -8 }, { x: 0, duration: 0.5, ease: "elastic.out(1, 0.25)" });
            gsap.fromTo(flashRef.current, { opacity: 0.7, background: color }, { opacity: 0, duration: 0.7 });
            if (card.rarity === "UR" || card.rarity === "MYTH") bursts.current?.rain([color, "#ffffff", "#ffe08a"], 140);
          }
        }
      };
      if (card.kind === "normal" && card.rarity && DRAMATIC.includes(card.rarity)) {
        setCharging(i);
        backdrop.current.target = 1.4;
        setTimeout(() => {
          setCharging(null);
          reveal();
          backdrop.current.target = 0.9;
        }, card.rarity === "SSR" ? 650 : 1100);
      } else {
        reveal();
      }
    },
    [phase, flipped, charging, pack],
  );

  const flipAll = () => {
    if (!pack) return;
    const order = pack.cards.map((_, i) => i).filter((i) => !flipped[i]);
    let delay = 0;
    for (const i of order) {
      const c = pack.cards[i];
      const dramatic = c.kind === "normal" && c.rarity && DRAMATIC.includes(c.rarity);
      setTimeout(() => flipBypass(i), delay);
      delay += dramatic ? 1400 : 260;
    }
  };
  // flip sans le verrou "charging" pour l'enchainement automatique
  const flipRef = useRef(flip);
  flipRef.current = flip;
  const flipBypass = (i: number) => flipRef.current(i);

  const allFlipped = flipped.length > 0 && flipped.every(Boolean);

  const nextPack = () => {
    if (packIdx + 1 < packs.length) {
      setPackIdx(packIdx + 1);
      setTear(0);
      setPhase("intro");
      backdrop.current.target = 0.6;
      backdrop.current.color = hexToRgb(look.glow);
    } else {
      setPhase("summary");
      backdrop.current.target = 0.5;
    }
  };

  // Clavier : espace / entree pour avancer
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && phase === "summary") finish();
      if (e.key !== " " && e.key !== "Enter") return;
      e.preventDefault();
      if (phase === "intro") doTear();
      else if (phase === "reveal") {
        const next = flipped.findIndex((f) => !f);
        if (next >= 0) flip(next);
        else nextPack();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  const finish = async () => {
    await refresh();
    reloadEvents().catch(() => {});
    onClose();
  };

  // Resume final
  useEffect(() => {
    if (phase !== "summary") return;
    const all = packs.flatMap((p) => p.cards);
    const best = bestOf(all);
    if (best && best.kind === "normal" && (best.rarity === "UR" || best.rarity === "MYTH")) {
      bursts.current?.rain([colorOf(best), "#fff", "#ffe08a"], 200);
    }
    gsap.fromTo(".summary-card", { y: 40, opacity: 0, scale: 0.9 }, { y: 0, opacity: 1, scale: 1, stagger: 0.03, duration: 0.45, ease: "power3.out" });
  }, [phase]); // eslint-disable-line react-hooks/exhaustive-deps

  const allCards = packs.flatMap((p) => p.cards);

  return createPortal(
    <div className="opening" ref={stageRef}>
      <ShaderBackdrop handle={backdrop} />
      <div className="opening-flash" ref={flashRef} />

      <div className="opening-top">
        {phase !== "summary" && packs.length > 0 && (
          <div className="opening-counter">
            {mode.kind === "event" ? "Pack événement" : pack?.type === "bonus" ? "Pack bonus ♻" : "Pack"} {packIdx + 1} / {packs.length}
            {pack?.pity && <span className="tag pity">Pity : UR garantie</span>}
            {pack?.type === "bonus" && pack.bonusFrom && (
              <span className="tag">Recyclage de {result?.recycled.find((r) => r.rarity === pack.bonusFrom)?.destroyed} cartes {pack.bonusFrom}</span>
            )}
          </div>
        )}
        {phase !== "summary" && result && (
          <button className="btn ghost sm" onClick={() => setPhase("summary")}>
            Passer tout ⏭
          </button>
        )}
      </div>

      {(phase === "intro" || phase === "tearing") && (
        <div className="opening-center">
          <div
            className={`opening-pack ${result ? "ready" : "loading"}`}
            onPointerDown={onPackDown}
            onPointerMove={onPackMove}
            onPointerUp={onPackUp}
            onPointerCancel={onPackUp}
            key={packIdx}
          >
            <Pack ref={packRef} look={pack?.type === "bonus" ? { ...look, title: "BONUS", subtitle: "Recyclage" } : look} width={300} tear={tear} />
          </div>
          <div className="opening-hint">
            {!result ? (
              <>
                <span className="spinner sm" /> Le pack se prépare…
              </>
            ) : phase === "intro" ? (
              <>
                Glisse sur le pack vers la droite pour le déchirer
                <button className="btn sm" onClick={doTear}>
                  Ouvrir
                </button>
              </>
            ) : null}
          </div>
        </div>
      )}

      {phase === "reveal" && pack && (
        <div className="opening-reveal">
          <div className="reveal-row" ref={rowRef} data-count={pack.cards.length}>
            {pack.cards.map((c, i) => (
              <div
                key={c.uid}
                className={`reveal-slot ${flipped[i] ? "is-open" : ""} ${charging === i ? "is-charging" : ""}`}
                data-tell={tellOf(c)}
                style={{ "--tell": colorOf(c) } as React.CSSProperties}
                onClick={() => flip(i)}
              >
                <Card card={c} width={pack.cards.length === 1 ? 330 : 210} flipped={!flipped[i]} interactive={!!flipped[i]} />
                {flipped[i] && !ownedBefore.has(c.charId) && <div className="new-badge">NOUVEAU</div>}
              </div>
            ))}
          </div>
          <div className="reveal-actions">
            {!allFlipped ? (
              <button className="btn ghost" onClick={flipAll}>
                Tout retourner
              </button>
            ) : (
              <button className="btn gold" onClick={nextPack}>
                {packIdx + 1 < packs.length ? `Pack suivant (${packIdx + 2}/${packs.length})` : "Voir le résumé"}
              </button>
            )}
          </div>
        </div>
      )}

      {phase === "summary" && result && (
        <div className="opening-summary">
          <h2 className="title">Résumé</h2>
          <p className="subtitle">
            {allCards.length} carte{allCards.length > 1 ? "s" : ""} obtenue{allCards.length > 1 ? "s" : ""}
            {result.user && <> · il te reste {result.user.points} points</>}
          </p>
          {(result.fusions.length > 0 || result.recycled.length > 0) && (
            <div className="summary-notes">
              {result.recycled.map((r, i) => (
                <div key={i} className="note recycle">
                  ♻ {r.destroyed} cartes {r.rarity} recyclées → 1 pack bonus
                </div>
              ))}
              {result.fusions.map((f, i) => (
                <div key={i} className="note fusion">
                  ✦ Fusion : {f.count}× {f.from} → <b>{f.card.rarity}</b> {f.card.name}
                </div>
              ))}
            </div>
          )}
          <div className="summary-grid">
            {[...allCards, ...result.fusions.map((f) => f.card)].map((c) => (
              <div key={c.uid} className="summary-card">
                <Card card={c} width={170} lite />
                {!ownedBefore.has(c.charId) && <div className="new-badge sm">NOUVEAU</div>}
              </div>
            ))}
          </div>
          <button className="btn gold" onClick={finish}>
            Terminer
          </button>
        </div>
      )}

      <Bursts ref={bursts} />
    </div>,
    document.body,
  );
}
