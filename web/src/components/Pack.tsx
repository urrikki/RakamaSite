import { forwardRef, useRef, type CSSProperties } from "react";
import { Motif } from "./motifs";
import "./pack.css";

// Pack (booster) en 3D CSS : se penche vers la souris, feuille metallisee,
// bandeau du haut separable pour l'animation de dechirure.

export interface PackLook {
  a: string;
  b: string;
  deep: string;
  glow: string;
  title: string;
  subtitle: string;
  motif?: string;
}

export const NORMAL_PACK: PackLook = {
  a: "#8b5cff",
  b: "#ffd36b",
  deep: "#140a33",
  glow: "#c4a8ff",
  title: "RAKAMA",
  subtitle: "5 cartes · Anime",
  motif: "sparkle",
};

interface Props {
  look: PackLook;
  width?: number;
  tear?: number; // 0..1 progression de la dechirure
  className?: string;
  style?: CSSProperties;
  interactive?: boolean;
}

export const Pack = forwardRef<HTMLDivElement, Props>(function Pack(
  { look, width = 260, tear = 0, className = "", style, interactive = true },
  ref,
) {
  const inner = useRef<HTMLDivElement>(null);
  const onMove = (e: React.PointerEvent) => {
    if (!interactive || !inner.current) return;
    const r = inner.current.getBoundingClientRect();
    const px = (e.clientX - r.left) / r.width;
    const py = (e.clientY - r.top) / r.height;
    inner.current.style.setProperty("--prx", `${(0.5 - py) * 18}deg`);
    inner.current.style.setProperty("--pry", `${(px - 0.5) * 24}deg`);
    inner.current.style.setProperty("--pmx", `${px * 100}%`);
    inner.current.style.setProperty("--pmy", `${py * 100}%`);
  };
  const onLeave = () => {
    inner.current?.style.setProperty("--prx", "0deg");
    inner.current?.style.setProperty("--pry", "0deg");
  };
  return (
    <div
      ref={ref}
      className={`pack ${className}`}
      style={
        {
          "--pw": `${width}px`,
          "--pa": look.a,
          "--pb": look.b,
          "--pdeep": look.deep,
          "--pglow": look.glow,
          "--tear": tear,
          ...style,
        } as CSSProperties
      }
      onPointerMove={onMove}
      onPointerLeave={onLeave}
    >
      <div className="pack-inner" ref={inner}>
        <div className="pack-top">
          <div className="pack-foil" />
          <div className="pack-crimp top" />
        </div>
        <div className="pack-body">
          <div className="pack-foil" />
          <div className="pack-art">
            <div className="pack-ring" />
            <Motif name={look.motif ?? "sparkle"} size={90} className="pack-motif" />
          </div>
          <div className="pack-title">{look.title}</div>
          <div className="pack-sub">{look.subtitle}</div>
          <div className="pack-crimp bottom" />
          <div className="pack-shine" />
        </div>
        <div className="pack-tearline" />
      </div>
    </div>
  );
});
