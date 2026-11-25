import { useEffect, useMemo, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { api } from "../api";
import { useStore } from "../store";
import { Card } from "../components/Card";
import CardModal from "../components/CardModal";
import { RARITY_META, rarityRank, type Card as CardT } from "../types";
import { PageHead } from "../components/PageHead";
import "./collection.css";

type Filter = "all" | "MYTH" | "UR" | "SSR" | "SR" | "R" | "C" | "event" | "legacy" | "fav";
type Sort = "rarity" | "rank" | "recent" | "name" | "anime";

const FILTERS: { id: Filter; label: string; color?: string }[] = [
  { id: "all", label: "Tout" },
  { id: "MYTH", label: "MYTH", color: RARITY_META.MYTH.color },
  { id: "UR", label: "UR", color: RARITY_META.UR.color },
  { id: "SSR", label: "SSR", color: RARITY_META.SSR.color },
  { id: "SR", label: "SR", color: RARITY_META.SR.color },
  { id: "R", label: "R", color: RARITY_META.R.color },
  { id: "C", label: "C", color: RARITY_META.C.color },
  { id: "event", label: "Événements", color: "#ff7ad9" },
  { id: "legacy", label: "Archives", color: "#c9b89a" },
  { id: "fav", label: "★ Favoris", color: "#ffd36b" },
];

function matches(c: CardT, f: Filter) {
  if (f === "all") return true;
  if (f === "event") return c.kind === "event";
  if (f === "legacy") return c.kind === "legacy";
  if (f === "fav") return c.favorite;
  return c.kind === "normal" && c.rarity === f;
}

export default function Collection() {
  const { playerId } = useParams();
  const { me, cards: myCards } = useStore();
  const isMine = !playerId || playerId === me?.id;
  const [other, setOther] = useState<{ name: string; cards: CardT[] } | null>(null);
  const [players, setPlayers] = useState<{ id: string; name: string }[]>([]);

  useEffect(() => {
    api<{ id: string; name: string }[]>("/game/players").then(setPlayers).catch(() => {});
  }, []);
  useEffect(() => {
    if (isMine) return setOther(null);
    api<{ user: { name: string }; cards: CardT[] }>(`/game/players/${playerId}`)
      .then((d) => setOther({ name: d.user.name, cards: d.cards }))
      .catch(() => setOther({ name: "?", cards: [] }));
  }, [playerId, isMine]);

  const cards = isMine ? myCards : other?.cards ?? [];
  const [filter, setFilter] = useState<Filter>("all");
  const [sort, setSort] = useState<Sort>("rarity");
  const [q, setQ] = useState("");
  const [open, setOpen] = useState<string | null>(null);

  const counts = useMemo(() => Object.fromEntries(FILTERS.map((f) => [f.id, cards.filter((c) => matches(c, f.id)).length])), [cards]);

  const list = useMemo(() => {
    const needle = q.trim().toLowerCase();
    const l = cards.filter((c) => matches(c, filter) && (!needle || c.name.toLowerCase().includes(needle) || c.anime.toLowerCase().includes(needle)));
    const byRank = (a: CardT, b: CardT) => (a.rank ?? 99999) - (b.rank ?? 99999);
    switch (sort) {
      case "rarity":
        return l.sort((a, b) => rarityRank(a) - rarityRank(b) || byRank(a, b));
      case "rank":
        return l.sort(byRank);
      case "recent":
        return l.sort((a, b) => (b.obtainedAt ?? 0) - (a.obtainedAt ?? 0));
      case "name":
        return l.sort((a, b) => a.name.localeCompare(b.name));
      case "anime":
        return l.sort((a, b) => a.anime.localeCompare(b.anime) || a.name.localeCompare(b.name));
    }
  }, [cards, filter, sort, q]);

  const uniqueChars = useMemo(() => new Set(cards.map((c) => c.charId)).size, [cards]);
  const idx = open ? list.findIndex((c) => c.uid === open) : -1;

  return (
    <div className="page collection">
      <PageHead
        kicker={`${cards.length} cartes · ${uniqueChars} persos différents`}
        title={isMine ? "Ma collection" : `Collection de ${other?.name ?? "…"}`}
        jp="コレクション"
      >
        <div className="col-players">
          {players.map((p) => (
            <Link key={p.id} to={p.id === me?.id ? "/collection" : `/collection/${p.id}`} className={`chip ${(p.id === me?.id ? isMine : p.id === playerId) ? "on" : ""}`}>
              {p.id === me?.id ? "Moi" : p.name}
            </Link>
          ))}
        </div>
      </PageHead>

      <div className="col-toolbar">
        <div className="col-filters">
          {FILTERS.map((f) => (
            <button
              key={f.id}
              className={`chip ${filter === f.id ? "on" : ""}`}
              style={{ "--chip": f.color } as React.CSSProperties}
              onClick={() => setFilter(f.id)}
              disabled={!counts[f.id] && f.id !== "all"}
            >
              {f.color && <span className="chip-dot" style={{ background: f.color }} />}
              {f.label} <span className="n">{counts[f.id]}</span>
            </button>
          ))}
        </div>
        <div className="col-search">
          <input className="input" placeholder="Rechercher un perso ou un anime…" value={q} onChange={(e) => setQ(e.target.value)} />
          <select className="input" value={sort} onChange={(e) => setSort(e.target.value as Sort)}>
            <option value="rarity">Tri : rareté</option>
            <option value="rank">Tri : rang de favori</option>
            <option value="recent">Tri : plus récentes</option>
            <option value="name">Tri : nom</option>
            <option value="anime">Tri : anime</option>
          </select>
        </div>
      </div>

      {list.length === 0 ? (
        <div className="col-empty muted">Aucune carte ici.</div>
      ) : (
        <div className="col-grid">
          {list.map((c) => (
            <div key={c.uid} className="col-cell">
              <Card card={c} width={196} lite onClick={() => setOpen(c.uid)} />
              {c.favorite && <span className="col-fav">★</span>}
            </div>
          ))}
        </div>
      )}

      {open && idx >= 0 && (
        <CardModal
          card={list[idx]}
          readOnly={!isMine}
          onClose={() => setOpen(null)}
          onPrev={idx > 0 ? () => setOpen(list[idx - 1].uid) : undefined}
          onNext={idx < list.length - 1 ? () => setOpen(list[idx + 1].uid) : undefined}
          position={`${idx + 1} / ${list.length}`}
        />
      )}
    </div>
  );
}
