import type { ReactElement } from "react";

// Petits motifs SVG (viewBox 0 0 24 24, couleur = currentColor) utilises
// pour decorer les bordures des cartes evenement et leurs particules.

const r = (n: number, child: ReactElement) =>
  Array.from({ length: n }, (_, i) => (
    <g key={i} transform={`rotate(${(360 / n) * i} 12 12)`}>
      {child}
    </g>
  ));

export const MOTIFS: Record<string, ReactElement> = {
  leaf: <path d="M20 3C9.5 3.5 4 9.5 4 17c0 1.3.3 2.6.8 3.6C12.3 20 19.6 14.6 20 3zM5.5 19.5c3-4.5 6.5-8 11-11" stroke="rgba(0,0,0,.35)" strokeWidth="1" />,
  maple: <path d="M12 2l1.6 4.2 3-1.6-.8 4.6 4-1-2.2 3.6 3 1.4-4.4 2 .8 2.8-4.2-1.2V22h-1.6v-5.2L7 18l.8-2.8-4.4-2 3-1.4-2.2-3.6 4 1-.8-4.6 3 1.6z" />,
  star: <path d="M12 2l2.9 6.6 7.1.6-5.4 4.7 1.6 7L12 17.3 5.8 21l1.6-7L2 9.2l7.1-.6z" />,
  sparkle: <path d="M12 1c.8 5.6 2.6 8.9 10 11-7.4 2.1-9.2 5.4-10 11-.8-5.6-2.6-8.9-10-11 7.4-2.1 9.2-5.4 10-11z" />,
  snow: (
    <g stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" fill="none">
      {r(6, <path d="M12 12V2.5M12 6l-2.5-2.5M12 6l2.5-2.5" />)}
    </g>
  ),
  candle: (
    <g>
      <rect x="9" y="10" width="6" height="12" rx="1" />
      <path d="M12 2c2 2.6 2.6 4.2 2.6 5.4a2.6 2.6 0 0 1-5.2 0C9.4 6.2 10 4.6 12 2z" fill="#ffd36b" />
    </g>
  ),
  flame: <path d="M12 1c4 5 7 8 7 13a7 7 0 0 1-14 0c0-3 1.6-5.4 3.6-7.4.2 2.2 1 3.6 2.4 4.4C11 7.6 11.6 4.4 12 1z" />,
  gift: (
    <g>
      <rect x="3" y="9" width="18" height="13" rx="1.5" />
      <rect x="2" y="6.5" width="20" height="4" rx="1" />
      <rect x="10.8" y="6.5" width="2.4" height="15.5" fill="rgba(255,255,255,.75)" />
      <path d="M12 6.5C9 2 5.5 3 7 6.5zM12 6.5c3-4.5 6.5-3.5 5 0z" fill="rgba(255,255,255,.75)" />
    </g>
  ),
  bell: <path d="M12 2a1.6 1.6 0 0 1 1.6 1.6v.6A6.5 6.5 0 0 1 18.5 10.5v4.5l2 3H3.5l2-3v-4.5a6.5 6.5 0 0 1 4.9-6.3v-.6A1.6 1.6 0 0 1 12 2zm-2.4 17h4.8a2.4 2.4 0 0 1-4.8 0z" />,
  pine: <path d="M12 1l5 6h-2.6l4.6 6h-2.8l5 6H13.5v4h-3v-4H2.8l5-6H5l4.6-6H7z" />,
  crown: <path d="M2 8l5 4 5-7 5 7 5-4-2 12H4zM4 21h16v1.6H4z" />,
  petal: <path d="M12 3c4 3 6 7 4.5 11.5C15.5 17.5 13.5 20 12 21c-1.5-1-3.5-3.5-4.5-6.5C6 10 8 6 12 3zM12 3l-1 3 1-1 1 1z" />,
  flower: (
    <g>
      {r(5, <ellipse cx="12" cy="6.5" rx="3.4" ry="5" />)}
      <circle cx="12" cy="12" r="2.6" fill="#ffe08a" />
    </g>
  ),
  mum: (
    <g>
      {r(12, <ellipse cx="12" cy="5.5" rx="1.6" ry="5" />)}
      <circle cx="12" cy="12" r="3" fill="rgba(255,255,255,.6)" />
    </g>
  ),
  heart: <path d="M12 21s-8.5-5.2-8.5-11.2A4.8 4.8 0 0 1 12 6.6a4.8 4.8 0 0 1 8.5 3.2C20.5 15.8 12 21 12 21z" />,
  lantern: (
    <g>
      <rect x="10" y="1" width="4" height="2.5" rx=".6" />
      <ellipse cx="12" cy="12.5" rx="7.5" ry="8.5" />
      <path d="M12 4v17M7 6.5c-1.6 4-1.6 8 0 12M17 6.5c1.6 4 1.6 8 0 12" stroke="rgba(0,0,0,.3)" strokeWidth="1" fill="none" />
      <rect x="10" y="20.5" width="4" height="2.5" rx=".6" />
    </g>
  ),
  mask: <path d="M2 7c3-1 6.5-1.5 10 0 3.5-1.5 7-1 10 0 0 5.5-2.5 10-6 10-2 0-3-1.5-4-3-1 1.5-2 3-4 3-3.5 0-6-4.5-6-10zm4.5 3.5a2.2 1.5 0 1 0 4.4 0 2.2 1.5 0 1 0-4.4 0zm8.6 0a2.2 1.5 0 1 0 4.4 0 2.2 1.5 0 1 0-4.4 0z" fillRule="evenodd" />,
  oni: (
    <g>
      <path d="M5 9L3 2l5 4M19 9l2-7-5 4" />
      <circle cx="12" cy="14" r="8" />
      <path d="M8 13l2.4 1M16 13l-2.4 1M8.5 18.5h7l-1.5-1.5-1 1-1-1-1 1-1-1z" stroke="rgba(0,0,0,.55)" strokeWidth="1.4" fill="none" />
    </g>
  ),
  bean: <ellipse cx="12" cy="12" rx="5" ry="7" transform="rotate(35 12 12)" />,
  crescent: <path d="M15 2.5A9.5 9.5 0 1 0 21.5 17 8 8 0 1 1 15 2.5z" />,
  moon: <circle cx="12" cy="12" r="9" />,
  clover: (
    <g>
      {r(4, <circle cx="12" cy="7" r="4.4" />)}
      <path d="M12 12c1 4 3 7 5 9" stroke="currentColor" strokeWidth="1.8" fill="none" />
    </g>
  ),
  egg: (
    <g>
      <path d="M12 2c4 0 7.5 7 7.5 12a7.5 7.5 0 0 1-15 0C4.5 9 8 2 12 2z" />
      <path d="M5 12.5l2.5-2 2.5 2 2-2 2 2 2.5-2 2.5 2" stroke="rgba(255,255,255,.8)" strokeWidth="1.4" fill="none" />
    </g>
  ),
  drop: <path d="M12 2s7 8 7 13a7 7 0 0 1-14 0c0-5 7-13 7-13z" />,
  globe: (
    <g>
      <circle cx="12" cy="12" r="10" />
      <path d="M6 7c3 1 3 4 6 4s2 4 0 6M15 4c-1 3 2 4 4 3M17 15c1 1 2 1 3 0" stroke="rgba(255,255,255,.55)" strokeWidth="1.5" fill="none" />
    </g>
  ),
  carp: (
    <g>
      <path d="M2 12c3-5 9-7 14-5l6-4-1.5 9L22 21l-6-4c-5 2-11 0-14-5z" />
      <circle cx="6.5" cy="11" r="1.4" fill="#fff" />
      <path d="M10 9c1 2 1 4 0 6M13.5 8.5c1 2 1 5 0 7" stroke="rgba(255,255,255,.5)" strokeWidth="1.2" fill="none" />
    </g>
  ),
  dove: <path d="M3 13c3 0 5-2 6.5-5C11 5 13 3 15.5 3l1.5 2 3.5.5-3 1.5c0 4-1 7-4 9.5 2 1 4.5 1.5 7.5 1-3 3-8 3.5-11.5 2C6.5 18.5 4 16 3 13z" />,
  note: <path d="M9 4l11-2.5v13a3.2 3.2 0 1 1-2-3V6.2l-7 1.6V17a3.2 3.2 0 1 1-2-3z" />,
  fan: (
    <g>
      <path d="M12 21L2 8a14 14 0 0 1 20 0z" />
      <path d="M12 21L5 6.2M12 21L9 4.6M12 21l3-16.4M12 21l7-14.8" stroke="rgba(0,0,0,.25)" strokeWidth="1" fill="none" />
    </g>
  ),
  ghost: (
    <g>
      <path d="M12 2a8 8 0 0 1 8 8v12l-2.7-2-2.6 2-2.7-2-2.7 2-2.6-2L4 22V10a8 8 0 0 1 8-8z" />
      <ellipse cx="9" cy="10" rx="1.5" ry="2" fill="#1a1030" />
      <ellipse cx="15" cy="10" rx="1.5" ry="2" fill="#1a1030" />
      <ellipse cx="12" cy="15" rx="1.6" ry="1.2" fill="#1a1030" />
    </g>
  ),
  pumpkin: (
    <g>
      <path d="M12 6c-1-2 0-4 2-4" stroke="#3d7b2e" strokeWidth="2" fill="none" />
      <ellipse cx="7.5" cy="14" rx="5.5" ry="7.5" />
      <ellipse cx="16.5" cy="14" rx="5.5" ry="7.5" />
      <ellipse cx="12" cy="14" rx="5" ry="8" />
      <path d="M8 12l2 1.6L8 14.5zM16 12l-2 1.6 2 .9zM8.5 17.5l1.5 1 1-1 1 1 1-1 1 1 1.5-1" stroke="#2a1200" strokeWidth="1.4" fill="#2a1200" />
    </g>
  ),
  bat: <path d="M12 8c1 0 1.5-1 2-2 .3 1.4 1 2.3 2.4 2.4C18 6 20.5 5.5 23 6c-2 1-3 3-3 5-1.3-.8-2.8-.8-4 .4-1-.8-2.2-.6-3 .6-.7-1-1.5-1.2-2 0-.8-1.2-2-1.4-3-.6-1.2-1.2-2.7-1.2-4-.4 0-2-1-4-3-5 2.5-.5 5 0 6.6 2.4C9 8.3 9.7 7.4 10 6c.5 1 1 2 2 2z" />,
  skull: (
    <g>
      <path d="M12 2a9 9 0 0 1 9 9c0 3-1.5 5-3.5 6v3.5h-11V17C4.5 16 3 14 3 11a9 9 0 0 1 9-9z" />
      <circle cx="8.5" cy="11.5" r="2.4" fill="#ff7a1a" />
      <circle cx="15.5" cy="11.5" r="2.4" fill="#ff7a1a" />
      <path d="M12 14.5l-1.3 2.2h2.6z" fill="#2a0e00" />
    </g>
  ),
  apple: (
    <g>
      <path d="M12 7c-2-1.5-7-1.5-8 3.5S6 21 9 21c1.4 0 2-.7 3-.7s1.6.7 3 .7c3 0 6-6.5 5-10.5S14 5.5 12 7z" />
      <path d="M12 7c0-2 1-4 3-5" stroke="#4a2a10" strokeWidth="1.6" fill="none" />
      <path d="M13.5 4.5c2-.5 3.5 0 4.5 1.5-2 .5-3.5 0-4.5-1.5z" fill="#4caf50" />
    </g>
  ),
  firework: (
    <g stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
      {r(12, <path d="M12 7V2" />)}
      {r(12, <circle cx="12" cy="4" r=".9" />)}
    </g>
  ),
  shield: <path d="M12 2l8 3v6c0 5.5-3.5 9.5-8 11-4.5-1.5-8-5.5-8-11V5z" />,
  ball: (
    <g>
      <circle cx="12" cy="12" r="9.5" />
      <path d="M12 7l3.6 2.6-1.4 4.2H9.8L8.4 9.6zM12 7V2.5M15.6 9.6l4.4-1.4M14.2 13.8l2.8 3.8M9.8 13.8L7 17.6M8.4 9.6L4 8.2" stroke="rgba(0,0,0,.6)" strokeWidth="1.2" fill="none" />
    </g>
  ),
  hut: <path d="M12 3l10 8h-2.5v10h-15V11H2zM9 21v-6h6v6" />,
  dragon: <path d="M3 15c2-4 5-6 8-5s4 4 7 3 3-4 3-6c2 3 1.5 7-1.5 9s-6 0-8-1-4 0-5.5 2 1 4 3 3c-3 2-7 0-6-5z" />,
  hydrangea: (
    <g>
      {[
        [8, 8],
        [16, 8],
        [12, 12],
        [8, 16],
        [16, 16],
        [12, 5],
        [12, 19],
        [5, 12],
        [19, 12],
      ].map(([x, y], i) => (
        <g key={i} transform={`translate(${x - 12} ${y - 12})`}>
          {r(4, <ellipse cx="12" cy="10.2" rx="1.4" ry="1.9" />)}
        </g>
      ))}
    </g>
  ),
  tie: <path d="M9 2h6l-1.5 3 3 12L12 22l-4.5-5 3-12z" />,
  mustache: <path d="M12 9c1.5-2 4-2.5 6-1.5 1.5.8 2.5.5 4-.5-.5 4-3.5 6-6.5 5.5-1.8-.3-3-1.3-3.5-2.5-.5 1.2-1.7 2.2-3.5 2.5C5.5 13 2.5 11 2 7c1.5 1 2.5 1.3 4 .5 2-1 4.5-.5 6 1.5z" />,
  ribbon: <path d="M12 2a5 5 0 0 1 5 5c0 3-2.5 5.5-5 8-2.5-2.5-5-5-5-8a5 5 0 0 1 5-5zm-1.5 13.5L7 22l2.5-.5L11 23l1-6zm3 0L17 22l-2.5-.5L13 23l-1-6z" />,
};

export type MotifName = keyof typeof MOTIFS;

export function Motif({ name, size = 24, color, className, style }: {
  name: string;
  size?: number;
  color?: string;
  className?: string;
  style?: React.CSSProperties;
}) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="currentColor"
      className={className}
      style={{ color, ...style }}
      aria-hidden
    >
      {MOTIFS[name] ?? MOTIFS.star}
    </svg>
  );
}
