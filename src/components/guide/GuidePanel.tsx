// On-page instructions guide — the "click here to do this" overlay shown when
// someone visits the demo. Mounts via TopNav (presentational shell) and reads
// the shared request state so the checklist tracks real progress — no
// duplicated state, no invented data.
//
// Interactivity: every step is a real button — click it and the guide steps
// aside, scrolls to the card that step is about, and flashes it so the link
// between instruction and action is unmistakable.
//
// The guide also HOPS around the screen while open: each hop parks at a
// different spot (left → right → top → bottom → corner) and pops in from that
// edge, so it never covers one region for long and reads as a playful tour.
// The hop is a pure CSS-class swap on the same DOM node (different
// animation-name restarts the animation), so keyboard focus survives.
//
// QA/UX safety: it starts docked in safe bands (left rail / top band — never
// over the composer before the first interaction) and collapses itself at the
// first click/keypress OUTSIDE itself, so it can never intercept a page click
// once the visitor starts following the instructions.
import { useEffect, useRef, useState } from "react";
import { useRequestState } from "../../store/RequestProvider";
import "./guidePanel.css";

interface GuideStep {
  id: string;
  text: string;
}

const STEPS: GuideStep[] = [
  {
    id: "brief",
    text: "Scan the Action Brief — what the agent wants to do, with its evidence, risks and unknowns.",
  },
  {
    id: "answer",
    text: 'Answer the question — click an option under "What should happen next?", then click Send answer (or type your own).',
  },
  {
    id: "review",
    text: 'Review the update — the revised plan lands in the brief with a "What changed" summary.',
  },
  {
    id: "decide",
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
  const [open, setOpen] = useState(true);
  const [hop, setHop] = useState(0);
  const flashTimer = useRef<number | null>(null);

  // Step aside at the first interaction OUTSIDE the guide: instructions are
  // seen on arrival, then never sit under the cursor again — except while the
  // visitor is using the guide itself (its Hide button closes it explicitly).
  // Non-toggle setters keep the collapse event and a Hide click from fighting.
  useEffect(() => {
    const collapse = (e: Event) => {
      const el = e.target as HTMLElement | null;
      if (el?.closest?.(".zk-guide, .zk-guide__chip")) return;
      setOpen(false);
    };
    window.addEventListener("pointerdown", collapse, { once: true });
    window.addEventListener("keydown", collapse, { once: true });
    return () => {
      window.removeEventListener("pointerdown", collapse);
      window.removeEventListener("keydown", collapse);
    };
  }, []);

  // Auto-tour: while open, hop to a new spot every few seconds. Skipped under
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

  // Click a step: guide steps aside → target scrolls in → brief flash links
  // instruction to action. Reduced motion jumps instead of gliding.
  const goToStep = (index: number) => {
    const target = document.querySelector<HTMLElement>(STEP_TARGETS[index] ?? "");
    setOpen(false);
    if (!target) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    target.scrollIntoView({ behavior: reduced ? "auto" : "smooth", block: "center" });
    target.classList.remove("zk-guide-flash"); // reflow restarts a re-click
    void target.offsetWidth;
    target.classList.add("zk-guide-flash");
    if (flashTimer.current) window.clearTimeout(flashTimer.current);
    flashTimer.current = window.setTimeout(() => target.classList.remove("zk-guide-flash"), 2400);
  };

  if (!open) {
    return (
      <button
        type="button"
        className="zk-guide__chip"
        data-testid="guide-chip"
        onClick={() => setOpen(true)}
      >
        <span aria-hidden="true">☰</span> How to use this demo
      </button>
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
          onClick={() => setOpen(false)}
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
        Click a step to jump to it. This guide hides itself once you start — click ☰ to bring it
        back.
      </p>
    </aside>
  );
}
