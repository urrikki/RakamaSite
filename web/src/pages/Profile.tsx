import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { api } from "../api";
import { useStore } from "../store";
import { toast } from "../toast";
import { Card } from "../components/Card";
import CardModal from "../components/CardModal";
import { RARITY_META, RARITY_ORDER, type Card as CardT } from "../types";
import "./profile.css";

export default function Profile() {
  const { playerId } = useParams();
  const { me, cards: myCards, setMe, logout } = useStore();
  const isMine = !playerId || playerId === me?.id;
  const [other, setOther] = useState<{ name: string; showcase: string[]; packsOpened: number; cards: CardT[] } | null>(null);
  const [players, setPlayers] = useState<{ id: string; name: string }[]>([]);
  const [open, setOpen] = useState<string | null>(null);
  const [editName, setEditName] = useState(false);
  const [name, setName] = useState(me?.name ?? "");
  const [pw, setPw] = useState("");

  useEffect(() => {
    api<{ id: string; name: string }[]>("/game/players").then(setPlayers).catch(() => {});
  }, []);
  useEffect(() => {
    if (isMine) return setOther(null);
    api<{ user: { name: string; showcase: string[]; packsOpened: number }; cards: CardT[] }>(`/game/players/${playerId}`)
      .then((d) => setOther({ ...d.user, cards: d.cards }))
      .catch(() => {});
  }, [playerId, isMine]);

  const cards = isMine ? myCards : other?.cards ?? [];
  const showcaseIds = isMine ? me?.showcase ?? [] : other?.showcase ?? [];
  const showcase = showcaseIds.map((u) => cards.find((c) => c.uid === u)).filter(Boolean) as CardT[];
  const displayName = isMine ? me?.name : other?.name;

  const stats = useMemo(() => {
    const by: Record<string, number> = {};
    for (const c of cards) {
      const k = c.kind === "normal" ? c.rarity ?? "C" : c.kind;
      by[k] = (by[k] ?? 0) + 1;
    }
    const best = cards.filter((c) => c.rank).sort((a, b) => (a.rank ?? 1e9) - (b.rank ?? 1e9))[0];
    return { by, best, unique: new Set(cards.map((c) => c.charId)).size, favs: cards.filter((c) => c.favorite).length };
  }, [cards]);

  const saveName = async () => {
    try {
      const r = await api<{ user: NonNullable<typeof me> }>("/me", { method: "PATCH", body: { name } });
      setMe(r.user);
      setEditName(false);
    } catch (e) {
      toast((e as Error).message, true);
    }
  };
  const savePw = async () => {
    try {
      await api("/me", { method: "PATCH", body: { password: pw } });
      setPw("");
      toast("Mot de passe changé");
    } catch (e) {
      toast((e as Error).message, true);
    }
  };

  return (
    <div className="page profile">
      <header className="page-head pf-head">
        <span className="page-head-jp" aria-hidden>
          プロフィール
        </span>
        <div className="pf-avatar">{displayName?.[0] ?? "?"}</div>
        <div className="pf-id">
          {isMine && editName ? (
            <div className="pf-edit">
              <input className="input" value={name} onChange={(e) => setName(e.target.value)} maxLength={24} autoFocus />
              <button className="btn sm" onClick={saveName}>
                OK
              </button>
            </div>
          ) : (
            <h1 className="title">
              {displayName}
              {isMine && (
                <button className="pf-pen" onClick={() => (setName(me?.name ?? ""), setEditName(true))} title="Changer de pseudo">
                  ✎
                </button>
              )}
            </h1>
          )}
          <div className="subtitle">
            {cards.length} cartes · {stats.unique} persos · {isMine ? me?.packsOpened : other?.packsOpened} packs ouverts sur le site
          </div>
        </div>
        <div className="pf-players">
          {players.map((p) => (
            <Link key={p.id} to={p.id === me?.id ? "/profil" : `/profil/${p.id}`} className={`chip ${(p.id === me?.id ? isMine : p.id === playerId) ? "on" : ""}`}>
              {p.id === me?.id ? "Moi" : p.name}
            </Link>
          ))}
        </div>
      </header>

      <section className="pf-showcase">
        <div className="pf-showcase-stage">
          {Array.from({ length: 6 }, (_, i) => {
            const c = showcase[i];
            return (
              <div key={i} className={`pf-slot s${i}`}>
                {c ? (
                  <Card card={c} width={200} onClick={() => setOpen(c.uid)} />
                ) : (
                  <div className="pf-empty">{isMine ? "Ajoute une carte depuis ta collection" : "Vide"}</div>
                )}
              </div>
            );
          })}
        </div>
        <div className="pf-showcase-label">Vitrine</div>
      </section>

      <section className="pf-stats">
        {RARITY_ORDER.map((r) => (
          <div key={r} className="pf-stat" style={{ "--c": RARITY_META[r].color } as React.CSSProperties}>
            <span className="pf-stat-n">{stats.by[r] ?? 0}</span>
            <span className="pf-stat-l">{r}</span>
          </div>
        ))}
        <div className="pf-stat" style={{ "--c": "#ff7ad9" } as React.CSSProperties}>
          <span className="pf-stat-n">{stats.by.event ?? 0}</span>
          <span className="pf-stat-l">Événements</span>
        </div>
        <div className="pf-stat" style={{ "--c": "#c9b89a" } as React.CSSProperties}>
          <span className="pf-stat-n">{stats.by.legacy ?? 0}</span>
          <span className="pf-stat-l">Archives</span>
        </div>
        <div className="pf-stat" style={{ "--c": "#ffd36b" } as React.CSSProperties}>
          <span className="pf-stat-n">{stats.favs}</span>
          <span className="pf-stat-l">Favoris</span>
        </div>
        {stats.best && (
          <div className="pf-stat wide" style={{ "--c": "#46e2ff" } as React.CSSProperties}>
            <span className="pf-stat-n">#{stats.best.rank}</span>
            <span className="pf-stat-l">Meilleur rang · {stats.best.name}</span>
          </div>
        )}
      </section>

      <div className="pf-links">
        <Link className="btn" to={isMine ? "/collection" : `/collection/${playerId}`}>
          Voir toute la collection →
        </Link>
      </div>

      {isMine && (
        <section className="pf-settings panel">
          <h3 className="section-title">Compte</h3>
          <div className="pf-row">
            <input className="input" type="password" placeholder="Nouveau mot de passe" value={pw} onChange={(e) => setPw(e.target.value)} />
            <button className="btn ghost" disabled={pw.length < 4} onClick={savePw}>
              Changer
            </button>
            <div style={{ flex: 1 }} />
            <button className="btn ghost" onClick={logout}>
              Se déconnecter
            </button>
          </div>
        </section>
      )}

      {open && (
        <CardModal
          card={cards.find((c) => c.uid === open)!}
          readOnly={!isMine}
          onClose={() => setOpen(null)}
        />
      )}
    </div>
  );
}
