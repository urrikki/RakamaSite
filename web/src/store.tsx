import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { api, getToken, setToken } from "./api";
import type { Card, Me, Rules } from "./types";

interface Store {
  me: Me | null;
  cards: Card[];
  rules: Rules | null;
  loading: boolean;
  refresh: () => Promise<void>;
  setMe: (m: Me) => void;
  setCards: (fn: (c: Card[]) => Card[]) => void;
  logout: () => void;
  login: (token: string) => Promise<void>;
}

const Ctx = createContext<Store>(null as never);

export function StoreProvider({ children }: { children: ReactNode }) {
  const [me, setMeState] = useState<Me | null>(null);
  const [cards, setCardsState] = useState<Card[]>([]);
  const [rules, setRules] = useState<Rules | null>(null);
  const [loading, setLoading] = useState(!!getToken());
  const [syncedAt, setSyncedAt] = useState(Date.now());

  const refresh = useCallback(async () => {
    if (!getToken()) {
      setLoading(false);
      return;
    }
    try {
      const d = await api<{ user: Me; cards: Card[]; rules: Rules }>("/me");
      setMeState(d.user);
      setCardsState(d.cards);
      setRules(d.rules);
      setSyncedAt(Date.now());
    } catch {
      setMeState(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  // Les points passifs tombent en continu : on les recalcule localement chaque seconde
  const [, tick] = useState(0);
  useEffect(() => {
    const t = setInterval(() => tick((x) => x + 1), 1000);
    return () => clearInterval(t);
  }, []);

  let liveMe = me;
  if (me && rules) {
    const elapsed = Date.now() - syncedAt;
    const firstGap = me.nextPointInMs;
    let gained = 0;
    let nextIn = firstGap - elapsed;
    if (elapsed >= firstGap) {
      gained = 1 + Math.floor((elapsed - firstGap) / rules.msPerPoint);
      nextIn = rules.msPerPoint - ((elapsed - firstGap) % rules.msPerPoint);
    }
    liveMe = { ...me, points: me.points + gained, nextPointInMs: nextIn };
  }

  const value: Store = {
    me: liveMe,
    cards,
    rules,
    loading,
    refresh,
    setMe: (m) => {
      setMeState(m);
      setSyncedAt(Date.now());
    },
    setCards: (fn) => setCardsState(fn),
    logout: () => {
      setToken(null);
      setMeState(null);
      setCardsState([]);
    },
    login: async (token) => {
      setToken(token);
      setLoading(true);
      await refresh();
    },
  };
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export const useStore = () => useContext(Ctx);
