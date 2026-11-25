import { useEffect, useState } from "react";
import { api, ApiError } from "../api";
import { useStore } from "../store";
import { Card } from "../components/Card";
import type { Card as CardT } from "../types";
import "./login.css";

interface Account {
  id: string;
  name: string;
  hasPassword: boolean;
}

// Cartes de demo pour la page de connexion
const DEMO: CardT[] = [
  { uid: "d1", charId: 1, name: "Rakama", anime: "Bienvenue", image: "https://s4.anilist.co/file/anilistcdn/character/large/b423-AmVFCaJJOBsc.png", kind: "normal", rarity: "SSR", rank: 12, rankSource: "drop", eventId: null, origin: "pack", obtainedAt: null, favorite: false },
  { uid: "d2", charId: 2, name: "Collection", anime: "Ouvre des packs", image: "https://s4.anilist.co/file/anilistcdn/character/large/b63845-43rWjycWhYFF.png", kind: "normal", rarity: "UR", rank: 3, rankSource: "drop", eventId: null, origin: "pack", obtainedAt: null, favorite: false },
  { uid: "d3", charId: 3, name: "Légende", anime: "Fusionne tes cartes", image: "https://s4.anilist.co/file/anilistcdn/character/large/b75216-KDU8333eIcqf.jpg", kind: "normal", rarity: "MYTH", rank: 1, rankSource: "drop", eventId: null, origin: "pack", obtainedAt: null, favorite: false },
];

export default function Login() {
  const { login } = useStore();
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [user, setUser] = useState<string | null>(null);
  const [password, setPassword] = useState("");
  const [setupCode, setSetupCode] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api<Account[]>("/accounts")
      .then(setAccounts)
      .catch(() => setErr("Le serveur ne répond pas."));
  }, []);

  const acc = accounts.find((a) => a.id === user);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setBusy(true);
    setErr("");
    try {
      const { token } = await api<{ token: string }>("/login", { body: { user, password, setupCode } });
      await login(token);
    } catch (e) {
      setErr(e instanceof ApiError ? e.message : "Erreur réseau");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="login">
      <div className="login-cards">
        {DEMO.map((c, i) => (
          <div key={c.uid} className={`login-card lc${i}`}>
            <Card card={c} width={230} />
          </div>
        ))}
      </div>
      <form className="login-box panel" onSubmit={submit}>
        <div className="logo login-logo">
          <span className="logo-seal">ラ</span>
          <span className="logo-word">RAKAMA</span>
        </div>
        <p className="muted">Gacha · Guess anime</p>
        <div className="login-accounts">
          {accounts.map((a) => (
            <button type="button" key={a.id} className={`login-acc ${user === a.id ? "on" : ""}`} onClick={() => setUser(a.id)}>
              <span className="login-avatar">{a.name[0]}</span>
              {a.name}
            </button>
          ))}
        </div>
        {user && (
          <>
            {!acc?.hasPassword && <p className="login-hint">Première connexion : choisis ton mot de passe.</p>}
            <input className="input" type="password" placeholder="Mot de passe" value={password} onChange={(e) => setPassword(e.target.value)} autoFocus />
            {!acc?.hasPassword && (
              <input className="input" placeholder="Code d'installation" value={setupCode} onChange={(e) => setSetupCode(e.target.value)} />
            )}
            <button className="btn" disabled={busy || !password}>
              {busy ? "…" : "Entrer"}
            </button>
          </>
        )}
        {err && <p className="login-err">{err}</p>}
      </form>
    </div>
  );
}
