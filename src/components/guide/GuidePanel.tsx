// On-page instructions guide — the "click here to do this" overlay shown when
// someone visits the demo. Mounts via TopNav (presentational shell) and reads
// the shared request state so the checklist tracks real progress — no
// duplicated state, no invented data.
//
// The guide HOPS around the screen while open: each hop parks at a different
// spot (left → right → top → bottom → corner) and pops in from that edge, so
// it never covers one region for long and reads as a playful tour. The hop is
// a pure CSS-class swap on the same DOM node (different animation-name
// restarts the animation), so keyboard focus inside the card survives.
//
// QA/UX safety: it starts docked in safe bands (left rail / top band — never
// over the composer before the first interaction) and collapses itself at the
// first click/keypress, so it can never intercept a page click once the
// visitor starts following the instructions.
import { useEffect, useState } from "react";
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

  // Step aside at the first interaction of the session: instructions are seen
  // on arrival, then never sit under the cursor again. Non-toggle setters are
  // used everywhere so the collapse event and a Hide click can't fight.
  useEffect(() => {
    const collapse = () => setOpen(false);
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

  const answered = state.messages.length > 0;
  const revised = state.plans.length > 1;
  const decided =
    state.decisions.length > 0 || state.status === "approved" || state.status === "declined";

  // Step 1 "ticks" once the human has moved on to answering.
  const ticks = [answered, answered, revised, decided];
  const activeIndex = ticks.findIndex((done) => !done);

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
      <p className="zk-guide__intro">Four steps — follow them in order:</p>
      <ol className="zk-guide__list" data-testid="guide-list" data-active={activeIndex}>
        {STEPS.map((step, i) => (
          <li
            key={step.id}
            className="zk-guide__item"
            data-done={ticks[i] ? "true" : undefined}
            aria-current={i === activeIndex ? "step" : undefined}
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
          </li>
        ))}
      </ol>
      <p className="zk-guide__foot">
        This guide hides itself as soon as you start. Click ☰ to bring it back.
      </p>
    </aside>
  );
}
