import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { api } from "../api";
import { useStore } from "../store";
import { toast } from "../toast";
import { Card } from "../components/Card";
import CardModal from "../components/CardModal";
import { RARITY_META, type Card as CardT, type Rarity } from "../types";
import "./profile.css";

// Ordre de l'histogramme : de la plus commune à la plus rare
const HISTO: Rarity[] = ["C", "R", "SR", "SSR", "UR", "MYTH"];
// Deux tirages à moins de 10 s d'écart appartiennent à la même ouverture
const SAME_OPENING_MS = 10_000;

function ago(ts: number) {
  const s = Math.max(1, Math.round((Date.now() - ts) / 1000));
  if (s < 60) return "à l'instant";
  const m = Math.round(s / 60);
  if (m < 60) return `il y a ${m} min`;
  const h = Math.round(m / 60);
  if (h < 24) return `il y a ${h} h`;
  const d = Math.round(h / 24);
  return d === 1 ? "hier" : `il y a ${d} jours`;
}

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

  const cards = isMine ? myCards : (other?.cards ?? []);
  const showcaseIds = isMine ? (me?.showcase ?? []) : (other?.showcase ?? []);
  const top4 = showcaseIds.map((u) => cards.find((c) => c.uid === u)).filter(Boolean).slice(0, 4) as CardT[];
  const displayName = isMine ? me?.name : other?.name;
  const packsOpened = isMine ? me?.packsOpened : other?.packsOpened;

  const stats = useMemo(() => {
    const by: Record<string, number> = {};
    for (const c of cards) {
      const k = c.kind === "normal" ? (c.rarity ?? "C") : c.kind;
      by[k] = (by[k] ?? 0) + 1;
    }
    const best = cards.filter((c) => c.rank).sort((a, b) => (a.rank ?? 1e9) - (b.rank ?? 1e9))[0];
    return { by, best, unique: new Set(cards.map((c) => c.charId)).size, favs: cards.filter((c) => c.favorite).length };
  }, [cards]);

  // Dernière ouverture : les cartes tirées dans les 10 s qui précèdent le tirage le plus récent
  const last = useMemo(() => {
    const pulled = cards.filter((c) => c.obtainedAt && c.origin !== "discord");
    if (!pulled.length) return null;
    const newest = Math.max(...pulled.map((c) => c.obtainedAt!));
    const group = pulled
      .filter((c) => newest - c.obtainedAt! <= SAME_OPENING_MS)
      .sort((a, b) => a.obtainedAt! - b.obtainedAt! || a.uid.localeCompare(b.uid));
    const fromPacks = group.filter((c) => c.origin === "pack" || c.origin === "pity").length;
    return { at: newest, cards: group, packs: Math.ceil(fromPacks / 5) };
  }, [cards]);

  const histoMax = Math.max(1, ...HISTO.map((r) => stats.by[r] ?? 0));

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
      {/* ── Identité + chiffres ── */}
      <header className="pf-head">
        <div className="pf-avatar">{displayName?.[0] ?? "?"}</div>
        <div className="pf-id">
          {isMine && editName ? (
            <form
              className="pf-edit"
              onSubmit={(e) => {
                e.preventDefault();
                saveName();
              }}
            >
              <input className="input" value={name} onChange={(e) => setName(e.target.value)} maxLength={24} autoFocus />
              <button className="btn sm">Enregistrer</button>
              <button type="button" className="btn ghost sm" onClick={() => setEditName(false)}>
                Annuler
              </button>
            </form>
          ) : (
            <h1 className="pf-name">{displayName}</h1>
          )}
          <nav className="pf-switch">
            {players.map((p) => {
              const active = p.id === me?.id ? isMine : p.id === playerId;
              return (
                <Link key={p.id} to={p.id === me?.id ? "/profil" : `/profil/${p.id}`} className={active ? "on" : ""}>
                  {p.name}
                </Link>
              );
            })}
            {isMine && !editName && (
              <button className="pf-rename" onClick={() => (setName(me?.name ?? ""), setEditName(true))}>
                Changer de pseudo
              </button>
            )}
          </nav>
        </div>
        <dl className="pf-counts">
          <div>
            <dd>{cards.length}</dd>
            <dt>cartes</dt>
          </div>
          <div>
            <dd>{stats.unique}</dd>
            <dt>persos</dt>
          </div>
          <div>
            <dd>{packsOpened ?? 0}</dd>
            <dt>packs ouverts</dt>
          </div>
        </dl>
      </header>

      {/* ── Top 4 ── */}
      <section className="pf-section">
        <div className="pf-section-head">
          <h2>Top 4</h2>
          {isMine && <span className="muted">Ouvre une carte de ta collection et choisis « Mettre dans le top 4 »</span>}
        </div>
        <div className="pf-top4">
          {Array.from({ length: 4 }, (_, i) => {
            const c = top4[i];
            return c ? (
              <div key={c.uid} className="pf-top-slot">
                <Card card={c} width={262} onClick={() => setOpen(c.uid)} />
              </div>
            ) : (
              <div key={i} className="pf-top-slot empty">
                {isMine ? (
                  <Link to="/collection" className="pf-empty">
                    Emplacement libre
                  </Link>
                ) : (
                  <div className="pf-empty">Emplacement libre</div>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* ── Dernière ouverture ── */}
      <section className="pf-section">
        <div className="pf-section-head">
          <h2>Dernière ouverture</h2>
          {last && (
            <span className="muted">
              {ago(last.at)}
              {last.packs > 0 && `, ${last.packs} pack${last.packs > 1 ? "s" : ""}`}
            </span>
          )}
        </div>
        {last ? (
          <div className="pf-recent">
            {last.cards.map((c) => (
              <Card key={c.uid} card={c} width={150} lite onClick={() => setOpen(c.uid)} />
            ))}
          </div>
        ) : (
          <p className="pf-none">
            Aucun pack ouvert pour l'instant.{" "}
            {isMine && (
              <Link to="/" className="pf-inline-link">
                Ouvrir un pack
              </Link>
            )}
          </p>
        )}
      </section>

      {/* ── Répartition ── */}
      <section className="pf-section">
        <div className="pf-section-head">
          <h2>Répartition</h2>
          <Link to={isMine ? "/collection" : `/collection/${playerId}`} className="pf-inline-link">
            Toute la collection
          </Link>
        </div>
        <div className="pf-dist">
          <div className="pf-histo" role="img" aria-label="Nombre de cartes par rareté">
            {HISTO.map((r) => {
              const n = stats.by[r] ?? 0;
              return (
                <div key={r} className="pf-bar" style={{ "--c": RARITY_META[r].color } as React.CSSProperties}>
                  <span className="pf-bar-n">{n}</span>
                  <span className="pf-bar-fill" style={{ height: `${n ? Math.max(4, (n / histoMax) * 100) : 0}%` }} />
                  <span className="pf-bar-r">{r}</span>
                </div>
              );
            })}
          </div>
          <dl className="pf-side">
            <div>
              <dt>Cartes d'événement</dt>
              <dd>{stats.by.event ?? 0}</dd>
            </div>
            <div>
              <dt>Archives Discord</dt>
              <dd>{stats.by.legacy ?? 0}</dd>
            </div>
            <div>
              <dt>Favoris</dt>
              <dd>{stats.favs}</dd>
            </div>
            <div>
              <dt>Perso le plus populaire</dt>
              <dd>{stats.best ? `#${stats.best.rank} ${stats.best.name}` : "—"}</dd>
            </div>
          </dl>
        </div>
      </section>

      {isMine && (
        <section className="pf-section pf-account">
          <div className="pf-section-head">
            <h2>Compte</h2>
          </div>
          <form
            className="pf-row"
            onSubmit={(e) => {
              e.preventDefault();
              if (pw.length >= 4) savePw();
            }}
          >
            <input className="input" type="password" placeholder="Nouveau mot de passe" value={pw} onChange={(e) => setPw(e.target.value)} />
            <button className="btn ghost" disabled={pw.length < 4}>
              Changer le mot de passe
            </button>
            <div style={{ flex: 1 }} />
            <button type="button" className="btn ghost" onClick={logout}>
              Se déconnecter
            </button>
          </form>
        </section>
      )}

      {open && <CardModal card={cards.find((c) => c.uid === open)!} readOnly={!isMine} onClose={() => setOpen(null)} />}
    </div>
  );
}
