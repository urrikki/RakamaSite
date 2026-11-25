import { useCallback, useEffect, useState } from "react";
import { api } from "./api";
import { rememberEvents } from "./eventNames";
import type { GameEventInfo } from "./types";

export interface EventsData {
  today: string;
  current: string | null;
  events: GameEventInfo[];
}

let cache: EventsData | null = null;
const subs = new Set<(d: EventsData) => void>();

export async function reloadEvents() {
  const d = await api<EventsData>("/game/events");
  rememberEvents(d.events);
  cache = d;
  subs.forEach((s) => s(d));
  return d;
}

export function useEvents() {
  const [data, setData] = useState<EventsData | null>(cache);
  useEffect(() => {
    subs.add(setData);
    if (!cache) reloadEvents().catch(() => {});
    return () => {
      subs.delete(setData);
    };
  }, []);
  const reload = useCallback(() => reloadEvents(), []);
  return { data, reload };
}
