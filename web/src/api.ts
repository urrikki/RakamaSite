export const API_URL = (import.meta.env.VITE_API_URL as string | undefined)?.replace(/\/$/, "") ?? "http://localhost:8787";

const TOKEN_KEY = "rakama.token";

export function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}
export function setToken(t: string | null) {
  if (t) localStorage.setItem(TOKEN_KEY, t);
  else localStorage.removeItem(TOKEN_KEY);
}

export class ApiError extends Error {
  status: number;
  data: Record<string, unknown>;
  constructor(message: string, status: number, data: Record<string, unknown>) {
    super(message);
    this.status = status;
    this.data = data;
  }
}

export async function api<T>(path: string, init: { method?: string; body?: unknown } = {}): Promise<T> {
  const headers: Record<string, string> = {};
  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;
  if (init.body !== undefined) headers["Content-Type"] = "application/json";
  const res = await fetch(`${API_URL}/api${path}`, {
    method: init.method ?? (init.body !== undefined ? "POST" : "GET"),
    headers,
    body: init.body !== undefined ? JSON.stringify(init.body) : undefined,
  });
  const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  if (!res.ok) {
    if (res.status === 401 && path !== "/login") setToken(null);
    throw new ApiError((data.error as string) ?? `Erreur ${res.status}`, res.status, data);
  }
  return data as T;
}

// ── Recherche d'animes (autocompletion du quiz) directement sur AniList
export interface AnimeSuggestion {
  id: number;
  title: { romaji: string; english: string | null };
  synonyms: string[];
  coverImage: { medium: string };
  seasonYear: number | null;
  format: string | null;
}

export async function searchAnime(search: string, signal?: AbortSignal): Promise<AnimeSuggestion[]> {
  const query = `query ($search: String) {
    Page(perPage: 8) {
      media(search: $search, type: ANIME, isAdult: false, sort: SEARCH_MATCH) {
        id title { romaji english } synonyms coverImage { medium } seasonYear format
      }
    }
  }`;
  const res = await fetch("https://graphql.anilist.co", {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({ query, variables: { search } }),
    signal,
  });
  const json = await res.json();
  return json?.data?.Page?.media ?? [];
}
