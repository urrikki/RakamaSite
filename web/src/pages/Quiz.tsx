import { useEffect, useRef, useState } from "react";
import { api, searchAnime, type AnimeSuggestion } from "../api";
import { useStore } from "../store";
import { toast } from "../toast";
import { Bursts, type BurstsHandle } from "../components/Bursts";
import { PageHead } from "../components/PageHead";
import "./quiz.css";

interface QuizState {
  day: string;
  status: "playing" | "won" | "lost";
  stage: number;
  wrong: number;
  triesPerStage: number;
  points: number;
  pointsTable: number[];
  potential: number;
  guesses: { text: string; stage: number; ok: boolean }[];
  hints: {
    info: {
      genres: string[];
      tags: string[];
      format: string | null;
      episodes: number | null;
      duration: number | null;
      season: string | null;
      year: number | null;
      studios: string[];
      popularity: number;
      score: number | null;
    };
    synopsis: string | null;
    coverBlurred: string | null;
    cover: string | null;
    firstLetter: string | null;
    color: string | null;
  };
  answer: null | {
    id: number;
    romaji: string;
    english: string | null;
    native: string | null;
    banner: string | null;
    cover: string;
    url: string;
    trailer: string | null;
  };
}

const STAGE_NAMES = ["Infos", "Synopsis", "Image floutée", "Image"];
const SEASONS: Record<string, string> = { WINTER: "Hiver", SPRING: "Printemps", SUMMER: "Été", FALL: "Automne" };

export default function Quiz() {
  const { setMe } = useStore();
  const [s, setS] = useState<QuizState | null>(null);
  const [err, setErr] = useState("");
  const [text, setText] = useState("");
  const [sugg, setSugg] = useState<AnimeSuggestion[]>([]);
  const [hl, setHl] = useState(0);
  const [picked, setPicked] = useState<AnimeSuggestion | null>(null);
  const [busy, setBusy] = useState(false);
  const [shake, setShake] = useState(false);
  const bursts = useRef<BurstsHandle>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    api<QuizState>("/game/quiz")
      .then(setS)
      .catch((e) => setErr((e as Error).message));
  }, []);

  // Autocompletion AniList
  useEffect(() => {
    if (picked && text === titleOf(picked)) return;
    setPicked(null);
    if (text.trim().length < 2) return setSugg([]);
    const ctrl = new AbortController();
    const t = setTimeout(() => {
      searchAnime(text.trim(), ctrl.signal)
        .then((r) => {
          setSugg(r);
          setHl(0);
        })
        .catch(() => {});
    }, 250);
    return () => {
      clearTimeout(t);
      ctrl.abort();
    };
  }, [text]); // eslint-disable-line react-hooks/exhaustive-deps

  const choose = (a: AnimeSuggestion) => {
    setPicked(a);
    setText(titleOf(a));
    setSugg([]);
    inputRef.current?.focus();
  };

  const submit = async () => {
    if (!s || s.status !== "playing" || busy || !text.trim()) return;
    setBusy(true);
    try {
      const body = picked
        ? { id: picked.id, titles: [picked.title.romaji, picked.title.english ?? "", ...picked.synonyms], text: titleOf(picked) }
        : { titles: [text], text };
      const r = await api<QuizState & { correct: boolean; user: Parameters<typeof setMe>[0] }>("/game/quiz/guess", { body });
      setS(r);
      setMe(r.user);
      setText("");
      setPicked(null);
      setSugg([]);
      if (r.correct) {
        const rect = inputRef.current?.getBoundingClientRect();
        bursts.current?.burst(rect ? rect.left + rect.width / 2 : innerWidth / 2, rect?.top ?? innerHeight / 2, ["#ffd36b", "#3ee08f", "#fff"], 220, 1.3);
        bursts.current?.rain(["#ffd36b", "#8b5cff", "#ff4fa3", "#3ee08f"], 160);
      } else {
        setShake(true);
        setTimeout(() => setShake(false), 500);
      }
    } catch (e) {
      toast((e as Error).message, true);
    } finally {
      setBusy(false);
    }
  };

  const skip = async () => {
    if (!s || busy) return;
    setBusy(true);
    try {
      setS(await api<QuizState>("/game/quiz/skip", { body: {} }));
    } catch (e) {
      toast((e as Error).message, true);
    } finally {
      setBusy(false);
    }
  };

  if (err) return <div className="page muted">{err}</div>;
  if (!s)
    return (
      <div className="page quiz-loading">
        <div className="spinner" />
        <p className="muted">Le quiz du jour se prépare…</p>
      </div>
    );

  const done = s.status !== "playing";
  const stage = done ? 4 : s.stage;
  const info = s.hints.info;
  const accent = s.hints.color ?? "#8b5cff";

  return (
    <div className="page quiz" style={{ "--qa": accent } as React.CSSProperties}>
      <PageHead
        kicker={`Quiz du ${new Date(s.day + "T12:00:00").toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" })}`}
        title="Devine l'anime"
        jp="クイズ"
      >
        <div className="quiz-steps">
          {s.pointsTable.map((p, i) => (
            <div key={i} className={`quiz-step ${i + 1 < stage ? "past" : i + 1 === stage && !done ? "now" : ""} ${done && s.status === "won" && i + 1 === s.guesses.at(-1)?.stage ? "won" : ""}`}>
              <span className="qs-n">{i + 1}</span>
              <span className="qs-name">{STAGE_NAMES[i]}</span>
              <span className="qs-pts">{p} pts</span>
            </div>
          ))}
        </div>
      </PageHead>

      {done && s.answer && (
        <section className={`quiz-result ${s.status}`}>
          {s.answer.banner && <div className="qr-banner" style={{ backgroundImage: `url(${s.answer.banner})` }} />}
          <img className="qr-cover" src={s.answer.cover} alt="" />
          <div className="qr-body">
            <div className="tile-kicker">{s.status === "won" ? `Trouvé ! +${s.points} points` : "Raté pour aujourd'hui"}</div>
            <h2 className="qr-title">{s.answer.english ?? s.answer.romaji}</h2>
            <div className="muted">
              {s.answer.romaji}
              {s.answer.native && ` · ${s.answer.native}`}
            </div>
            <div className="qr-links">
              <a className="btn sm" href={s.answer.url} target="_blank" rel="noreferrer">
                AniList ↗
              </a>
              {s.answer.trailer && (
                <a className="btn ghost sm" href={s.answer.trailer} target="_blank" rel="noreferrer">
                  Bande-annonce ↗
                </a>
              )}
            </div>
            <p className="muted small">Nouveau quiz demain à minuit.</p>
          </div>
        </section>
      )}

      <div className="quiz-grid">
        <section className="quiz-hints">
          <div className="hint-card revealed">
            <div className="hint-label">Indice 1 · Infos</div>
            <div className="hint-tags">
              {info.genres.map((g) => (
                <span key={g} className="htag genre">
                  {g}
                </span>
              ))}
              {info.tags.map((g) => (
                <span key={g} className="htag">
                  {g}
                </span>
              ))}
            </div>
            <dl className="hint-facts">
              {info.format && (
                <div>
                  <dt>Format</dt>
                  <dd>{info.format.replace("_", " ")}</dd>
                </div>
              )}
              {info.episodes && (
                <div>
                  <dt>Épisodes</dt>
                  <dd>
                    {info.episodes}
                    {info.duration ? ` × ${info.duration} min` : ""}
                  </dd>
                </div>
              )}
              {info.year && (
                <div>
                  <dt>Saison</dt>
                  <dd>
                    {info.season ? SEASONS[info.season] + " " : ""}
                    {info.year}
                  </dd>
                </div>
              )}
              {info.studios.length > 0 && (
                <div>
                  <dt>Studio</dt>
                  <dd>{info.studios.slice(0, 2).join(", ")}</dd>
                </div>
              )}
              <div>
                <dt>Popularité</dt>
                <dd>{info.popularity.toLocaleString("fr-FR")} membres</dd>
              </div>
              {info.score && (
                <div>
                  <dt>Note</dt>
                  <dd>{info.score} / 100</dd>
                </div>
              )}
            </dl>
          </div>

          <div className={`hint-card ${stage >= 2 ? "revealed" : "locked"}`}>
            <div className="hint-label">Indice 2 · Synopsis</div>
            {stage >= 2 ? <Synopsis text={s.hints.synopsis ?? ""} /> : <Locked />}
          </div>

          <div className={`hint-card hint-cover ${stage >= 3 ? "revealed" : "locked"}`}>
            <div className="hint-label">
              Indice {stage >= 4 ? "4 · Image" : "3 · Image floutée"}
              {s.hints.firstLetter && <span className="letter">Première lettre : {s.hints.firstLetter}</span>}
            </div>
            {stage >= 3 ? (
              <div className="cover-wrap">
                <img src={s.hints.cover ?? s.hints.coverBlurred ?? ""} alt="" className={stage >= 4 ? "clear" : "blur"} draggable={false} />
              </div>
            ) : (
              <Locked />
            )}
          </div>
        </section>

        <aside className="quiz-side">
          {!done && (
            <div className={`quiz-input panel ${shake ? "shake" : ""}`}>
              <div className="qi-head">
                <span>
                  Indice {s.stage} · <b className="mono">{s.potential} pts</b> en jeu
                </span>
                <span className="qi-tries">
                  {Array.from({ length: s.triesPerStage }, (_, i) => (
                    <i key={i} className={i < s.triesPerStage - s.wrong ? "on" : ""} />
                  ))}
                </span>
              </div>
              <div className="qi-field">
                <input
                  ref={inputRef}
                  className="input"
                  placeholder="Tape le nom de l'anime…"
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "ArrowDown") (e.preventDefault(), setHl((h) => Math.min(h + 1, sugg.length - 1)));
                    else if (e.key === "ArrowUp") (e.preventDefault(), setHl((h) => Math.max(h - 1, 0)));
                    else if (e.key === "Enter") {
                      e.preventDefault();
                      if (sugg.length && !picked) choose(sugg[hl]);
                      else submit();
                    } else if (e.key === "Escape") setSugg([]);
                  }}
                  autoFocus
                />
                {sugg.length > 0 && (
                  <ul className="qi-sugg">
                    {sugg.map((a, i) => (
                      <li key={a.id} className={i === hl ? "hl" : ""} onMouseDown={(e) => (e.preventDefault(), choose(a))} onMouseEnter={() => setHl(i)}>
                        <img src={a.coverImage.medium} alt="" />
                        <div>
                          <div className="qs-title">{titleOf(a)}</div>
                          <div className="qs-sub">
                            {a.title.english && a.title.english !== titleOf(a) ? a.title.english : a.title.romaji}
                            {a.seasonYear ? ` · ${a.seasonYear}` : ""}
                            {a.format ? ` · ${a.format}` : ""}
                          </div>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              <div className="qi-actions">
                <button className="btn" onClick={submit} disabled={busy || !text.trim()}>
                  Valider
                </button>
                <button className="btn ghost" onClick={skip} disabled={busy}>
                  {s.stage < 4 ? `Indice suivant (${s.pointsTable[s.stage]} pts)` : "Abandonner"}
                </button>
              </div>
            </div>
          )}

          <div className="quiz-guesses panel">
            <div className="hint-label">Tes réponses</div>
            {s.guesses.length === 0 ? (
              <p className="muted small">Aucune réponse pour l'instant.</p>
            ) : (
              <ul>
                {s.guesses.map((g, i) => (
                  <li key={i} className={g.ok ? "ok" : "ko"}>
                    <span>{g.ok ? "✓" : "✗"}</span> {g.text} <small className="muted">indice {g.stage}</small>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </aside>
      </div>
      <Bursts ref={bursts} />
    </div>
  );
}

function titleOf(a: AnimeSuggestion) {
  return a.title.english || a.title.romaji;
}

function Locked() {
  return (
    <div className="locked-body">
      <span>🔒</span>
      <span className="muted">Se débloque si tu passes à l'indice suivant ou après 3 erreurs</span>
    </div>
  );
}

/** Synopsis : les titres (▇▇▇▇) et les noms de persos (▒▒▒) sont masqués côté serveur. */
function Synopsis({ text }: { text: string }) {
  const parts = text.split(/(▇▇▇▇|▒▒▒)/);
  return (
    <p className="hint-synopsis">
      {parts.map((p, i) =>
        p === "▇▇▇▇" ? (
          <span key={i} className="mask mask-title" title="Titre masqué">titre</span>
        ) : p === "▒▒▒" ? (
          <span key={i} className="mask mask-name" title="Nom de personnage masqué">perso</span>
        ) : (
          p
        ),
      )}
    </p>
  );
}
