// On-page instructions guide — the "click here to do this" overlay shown when
// someone visits the demo. Mounts via TopNav (presentational shell) and reads
// the shared request state so the checklist tracks real progress — no
// duplicated state, no invented data.
//
// Three modes so the tour never dead-ends:
//   full  — the card (hops around the screen, pops in from each edge)
//   mini  — a folded one-line coach that FOLLOWS the user after they start
//           interacting (the tour continues instead of disappearing)
//   hidden— dismissed explicitly via the mini ✕ only
//
// Clicking a step jumps to its card (scroll + flash) and REPOSITIONS the
// guide to the opposite side so the jump result stays visible next to it —
// then stays open so the user can continue to the next step.
//
// QA/UX safety: full/mini both dock in the safe top-left band (never over
// composer/decision targets); interactions INSIDE the guide never minimize it.
import { useEffect, useRef, useState } from "react";
import { useRequestState } from "../../store/RequestProvider";
import "./guidePanel.css";

type GuideMode = "full" | "mini" | "hidden";

interface GuideStep {
  id: string;
  text: string;
  short: string;
}

const STEPS: GuideStep[] = [
  {
    id: "brief",
    short: "Read the agent's brief",
    text: "Scan the Action Brief — what the agent wants to do, with its evidence, risks and unknowns.",
  },
  {
    id: "answer",
    short: "Answer the question",
    text: 'Answer the question — click an option under "What should happen next?", then click Send answer (or type your own).',
  },
  {
    id: "review",
    short: "Review the update",
    text: 'Review the update — the revised plan lands in the brief with a "What changed" summary.',
  },
  {
    id: "decide",
    short: "Make your call",
    text: "Make your call — click Approve, Request changes, or Decline (Decline needs a short reason).",
  },
];

/** Where each step takes you when clicked (document order, not status order). */
const STEP_TARGETS = [".zk-brief", ".clarify", '[data-testid="brief-version"]', ".decide"];

/** Hop order: park left → right → top → bottom → corner, entering from that edge. */
const HOP_POSITIONS = [
  "pos-from-left",
  "pos-from-right",
  "pos-from-top",
  "pos-from-bottom",
  "pos-corner",
];
/** Seconds per spot — long enough to read a step before it moves. */
const HOP_MS = 4000;

export default function GuidePanel() {
  const state = useRequestState();
  const [mode, setMode] = useState<GuideMode>("full");
  const [hop, setHop] = useState(0);
  const flashTimer = useRef<number | null>(null);

  // Outside interactions fold full → mini (never → hidden): the guide keeps
  // following the user instead of dying at the first click. Interactions
  // inside the guide (Hide, steps, expand) are left alone.
  useEffect(() => {
    const fold = (e: Event) => {
      const el = e.target as HTMLElement | null;
      if (el?.closest?.(".zk-guide, .zk-guide__mini")) return;
      setMode((m) => (m === "full" ? "mini" : m));
    };
    window.addEventListener("pointerdown", fold);
    window.addEventListener("keydown", fold);
    return () => {
      window.removeEventListener("pointerdown", fold);
      window.removeEventListener("keydown", fold);
    };
  }, []);

  // Auto-tour: while full, hop to a new spot every few seconds. Skipped under
  // prefers-reduced-motion — position jumps without motion cues would only be
  // disorienting, and nothing depends on the tour completing.
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const id = window.setInterval(() => setHop((h) => h + 1), HOP_MS);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => () => {
    if (flashTimer.current) window.clearTimeout(flashTimer.current);
  }, []);

  const answered = state.messages.some((m) => m.author === "human");
  const revised = state.plans.length > 1;
  const decided =
    state.decisions.length > 0 || state.status === "approved" || state.status === "declined";

  // Step 1 "ticks" once the human has moved on to answering.
  const ticks = [answered, answered, revised, decided];
  const activeIndex = ticks.findIndex((done) => !done);
  const stepNumber = activeIndex === -1 ? 4 : activeIndex; // 4 = all done

  // Click a step: jump to the card (scroll + flash), park the guide on the
  // OPPOSITE side of the screen so the result is visible next to it, and stay
  // open — the tour continues from here rather than ending.
  const goToStep = (index: number) => {
    const target = document.querySelector<HTMLElement>(STEP_TARGETS[index] ?? "");
    if (target) {
      const rect = target.getBoundingClientRect();
      const targetOnLeft = rect.left + rect.width / 2 < window.innerWidth / 2;
      const parkAt = targetOnLeft ? 1 : 0; // index of pos-from-right / pos-from-left
      setHop((h) => (h % HOP_POSITIONS.length === parkAt ? h : parkAt + Math.floor(h / HOP_POSITIONS.length) * HOP_POSITIONS.length));
      const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      target.scrollIntoView({ behavior: reduced ? "auto" : "smooth", block: "center" });
      target.classList.remove("zk-guide-flash"); // reflow restarts a re-click
      void target.offsetWidth;
      target.classList.add("zk-guide-flash");
      if (flashTimer.current) window.clearTimeout(flashTimer.current);
      flashTimer.current = window.setTimeout(() => target.classList.remove("zk-guide-flash"), 2400);
    }
  };

  if (mode === "hidden") return null;

  // Mini coach — one line that follows the user from the safe top-left slot.
  if (mode === "mini") {
    return (
      <div className="zk-guide__mini" data-testid="guide-mini">
        <button
          type="button"
          className="zk-guide__mini-open"
          data-testid="guide-expand"
          onClick={() => setMode("full")}
        >
          <span className="zk-guide__mini-badge" aria-hidden="true">
            {stepNumber === 4 ? "✓" : stepNumber + 1}
          </span>
          <span className="zk-guide__mini-text">
            {stepNumber === 4
              ? "All steps done — nice work!"
              : `Step ${stepNumber + 1}: ${STEPS[stepNumber].short}`}
          </span>
          <span className="zk-guide__mini-hint" aria-hidden="true">
            show guide ▲
          </span>
        </button>
        <button
          type="button"
          className="zk-guide__mini-x"
          aria-label="Dismiss the how-to guide"
          data-testid="guide-dismiss"
          onClick={() => setMode("hidden")}
        >
          ✕
        </button>
      </div>
    );
  }

  const position = HOP_POSITIONS[hop % HOP_POSITIONS.length];

  return (
    <aside
      className={`zk-guide ${position}`}
      aria-label="How to use this demo"
      data-testid="guide-panel"
      data-position={position}
    >
      <div className="zk-guide__head">
        <p className="zk-guide__title">How to use this demo</p>
        <button
          type="button"
          className="zk-guide__hide"
          data-testid="guide-hide"
          onClick={() => setMode("mini")}
        >
          Hide <span aria-hidden="true">▾</span>
        </button>
      </div>
      <p className="zk-guide__intro">Four steps — click one to jump straight to it:</p>
      <ol className="zk-guide__list" data-testid="guide-list" data-active={activeIndex}>
        {STEPS.map((step, i) => (
          <li
            key={step.id}
            className="zk-guide__item"
            data-done={ticks[i] ? "true" : undefined}
            aria-current={i === activeIndex ? "step" : undefined}
          >
            <button
              type="button"
              className="zk-guide__go"
              data-testid={`guide-step-${i + 1}`}
              onClick={() => goToStep(i)}
            >
              <span className="zk-guide__mark" aria-hidden="true">
                {ticks[i] ? "✓" : i + 1}
              </span>
              <span className="zk-guide__text">
                {step.text}
                {ticks[i] ? (
                  <span className="zk-guide__sr"> (done)</span>
                ) : i === activeIndex ? (
                  <span className="zk-guide__now"> — do this now</span>
                ) : null}
              </span>
              <span className="zk-guide__arrow" aria-hidden="true">
                →
              </span>
            </button>
          </li>
        ))}
      </ol>
      <p className="zk-guide__foot">
        Click a step to jump there — the guide stays with you and follows your progress.
      </p>
    </aside>
  );
}
