import { useEffect, useState } from "react";

type Toast = { id: number; text: string; err?: boolean };
let push: (t: Toast) => void = () => {};
let seq = 0;

export function toast(text: string, err = false) {
  push({ id: ++seq, text, err });
}

export function Toaster() {
  const [t, setT] = useState<Toast | null>(null);
  useEffect(() => {
    push = (x) => setT(x);
  }, []);
  useEffect(() => {
    if (!t) return;
    const id = setTimeout(() => setT(null), 3200);
    return () => clearTimeout(id);
  }, [t]);
  return t ? (
    <div key={t.id} className={`toast ${t.err ? "err" : ""}`}>
      {t.text}
    </div>
  ) : null;
}
