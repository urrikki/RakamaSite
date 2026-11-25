import type { ReactNode } from "react";

/** En-tête commun des pages : petit kicker, gros titre, mot japonais en filigrane. */
export function PageHead({
  kicker,
  title,
  jp,
  sub,
  children,
}: {
  kicker: ReactNode;
  title: ReactNode;
  jp: string;
  sub?: ReactNode;
  children?: ReactNode;
}) {
  return (
    <header className="page-head">
      <span className="page-head-jp" aria-hidden>
        {jp}
      </span>
      <div>
        <div className="kicker">{kicker}</div>
        <h1 className="title">{title}</h1>
        {sub && <p className="subtitle">{sub}</p>}
      </div>
      {children && <div className="page-head-side">{children}</div>}
    </header>
  );
}
