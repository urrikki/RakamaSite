import { useEffect, useState } from "react";
import { api } from "../api";
import { Card } from "../components/Card";
import CardModal from "../components/CardModal";
import { eventName } from "../eventNames";
import { RARITY_META, type Card as CardT } from "../types";
import "./feed.css";

export interface FeedEntry {
  id: number;
  userId: string;
  userName: string;
  type: "pull" | "fusion" | "event";
  at: number;
  card: CardT;
  from?: string;
  count?: number;
}

export function useFeed(limit = 60) {
  const [feed, setFeed] = useState<FeedEntry[] | null>(null);
  useEffect(() => {
    let alive = true;
    const load = () =>
      api<FeedEntry[]>(`/game/feed?limit=${limit}`)
        .then((f) => alive && setFeed(f))
        .catch(() => {});
    load();
    const t = setInterval(load, 30000);
    return () => {
      alive = false;
      clearInterval(t);
    };
  }, [limit]);
  return feed;
}

export function timeAgo(at: number) {
  const s = Math.floor((Date.now() - at) / 1000);
  if (s < 60) return "à l'instant";
  if (s < 3600) return `il y a ${Math.floor(s / 60)} min`;
  if (s < 86400) return `il y a ${Math.floor(s / 3600)} h`;
  return new Date(at).toLocaleDateString("fr-FR", { day: "numeric", month: "short" });
}

export function feedText(e: FeedEntry) {
  if (e.type === "fusion") return `a fusionné ${e.count}× ${e.from} en`;
  if (e.type === "event") return `a ouvert un pack ${eventName(e.card.eventId)} :`;
  return e.card.origin === "pity" ? "a déclenché le pity :" : e.card.origin === "recycle" ? "a eu dans un pack bonus :" : "a tiré";
}

function label(c: CardT) {
  if (c.kind === "event") return { text: "Événement", color: "#ff7ad9" };
  const m = RARITY_META[c.rarity ?? "C"];
  return { text: c.rarity ?? "", color: m.color };
}

export default function Feed() {
  const feed = useFeed(150);
  const [open, setOpen] = useState<CardT | null>(null);

  // Regroupement par jour
  const groups: { day: string; items: FeedEntry[] }[] = [];
  for (const e of feed ?? []) {
    const day = new Date(e.at).toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" });
    const g = groups.at(-1);
    if (g && g.day === day) g.items.push(e);
    else groups.push({ day, items: [e] });
  }

  return (
    <div className="page feed">
      <h1 className="title">Le fil</h1>
      <p className="subtitle">Les SSR, UR, MYTH, les fusions et les gros persos d'événement tirés par chacun.</p>
      {!feed ? (
        <div className="spinner" style={{ marginTop: 40 }} />
      ) : feed.length === 0 ? (
        <p className="muted" style={{ marginTop: 40 }}>
          Rien pour l'instant. Le premier qui tire une SSR ouvre le bal.
        </p>
      ) : (
        groups.map((g) => (
          <section key={g.day} className="feed-day">
            <h3 className="feed-day-title">{g.day}</h3>
            <div className="feed-list">
              {g.items.map((e) => {
                const l = label(e.card);
                return (
                  <article key={e.id} className={`feed-item t-${e.card.rarity ?? e.card.kind}`} style={{ "--fc": l.color } as React.CSSProperties}>
                    <div className="feed-card">
                      <Card card={e.card} width={120} lite onClick={() => setOpen(e.card)} />
                    </div>
                    <div className="feed-body">
                      <div className="feed-who">
                        <span className="feed-avatar">{e.userName[0]}</span>
                        <b>{e.userName}</b> <span className="muted">{feedText(e)}</span>
                      </div>
                      <div className="feed-name">{e.card.name}</div>
                      <div className="feed-anime muted">{e.card.anime}</div>
                      <div className="feed-meta">
                        <span className="feed-tag">{l.text}</span>
                        {e.card.rank && <span className="mono">#{e.card.rank}</span>}
                        <span className="muted">{timeAgo(e.at)}</span>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          </section>
        ))
      )}
      {open && <CardModal card={open} readOnly onClose={() => setOpen(null)} />}
    </div>
  );
}
