// ConfettiBurst — one-shot celebration the moment the human approves.
// Pure DOM particles (zero dependencies), fully aria-hidden and
// pointer-events: none so it can never block a click or confuse AT; skipped
// entirely under prefers-reduced-motion. Mounted via TopNav alongside the
// other chrome components; reads only real store transitions.
import { useEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";
import { useRequestState } from "../../store/RequestProvider";
import "./confettiBurst.css";

interface Piece {
  id: number;
  left: number;
  delay: number;
  dur: number;
  color: string;
  spin: number;
  w: number;
  h: number;
}

const COLORS = ["#1f5fd9", "#f59e0b", "#16a34a", "#e11d48", "#7c3aed", "#0891b2"];
const COUNT = 70;
const LIFETIME_MS = 3800;

export default function ConfettiBurst() {
  const state = useRequestState();
  const [pieces, setPieces] = useState<Piece[]>([]);
  const firstRender = useRef(true);
  const timer = useRef<number | null>(null);

  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false; // no celebration on page load
      return;
    }
    if (state.status !== "approved") return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    setPieces(
      Array.from({ length: COUNT }, (_, i) => ({
        id: i,
        left: Math.random() * 100,
        delay: Math.random() * 0.6,
        dur: 1.9 + Math.random() * 1.5,
        color: COLORS[i % COLORS.length],
        spin: Math.random() * 720 - 360,
        w: 7 + Math.random() * 6,
        h: 6 + Math.random() * 5,
      }))
    );
    if (timer.current) window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setPieces([]), LIFETIME_MS);
  }, [state.status]);

  useEffect(() => () => {
    if (timer.current) window.clearTimeout(timer.current);
  }, []);

  if (pieces.length === 0) return null;

  return (
    <div className="zk-confetti" aria-hidden="true" data-testid="confetti">
      {pieces.map((p) => (
        <span
          key={p.id}
          className="zk-confetti__bit"
          style={
            {
              left: `${p.left}%`,
              width: `${p.w}px`,
              height: `${p.h}px`,
              background: p.color,
              animationDelay: `${p.delay}s`,
              animationDuration: `${p.dur}s`,
              "--zk-spin": `${p.spin}deg`,
            } as CSSProperties
          }
        />
      ))}
    </div>
  );
}
