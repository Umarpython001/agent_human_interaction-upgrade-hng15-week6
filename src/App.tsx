// App shell — composes the Clarification Loop demo page.
// Owns the simulated-agent timing; all state lives in the RequestProvider store.
import { useEffect, useRef, useState } from "react";
import TopNav from "./components/TopNav";
import ActionBriefCard from "./components/action-brief/ActionBriefCard";
import ClarificationPanel from "./components/clarification/ClarificationPanel";
import DecisionPanel from "./components/decision/DecisionPanel";
import LoopProgress from "./components/progress/LoopProgress";
import { useRequestDispatch, useRequestState } from "./store/RequestProvider";
import { agent, brief, issue, question } from "./data/scenario";
import { isWorking, statusMeta } from "./lib/statusMeta";

/** Simulated agent latency (ms) between the human's input and the agent's reply. */
const AGENT_DELAY = 1400;

/** How long the attention ring stays up after the target scrolls into view. */
const ATTENTION_MS = 2200;

/** Which panel should carry the attention ring (and whether it pulses). */
type Attention = { target: "side" | "brief"; pulse: boolean } | null;

export default function App() {
  const state = useRequestState();
  const dispatch = useRequestDispatch();
  const timers = useRef<number[]>([]);
  const sideRef = useRef<HTMLDivElement | null>(null);
  const attentionTimer = useRef<number | null>(null);
  const [attention, setAttention] = useState<Attention>(null);
  // Transition bookkeeping for the attention effect (skip-first-render).
  const prevFocus = useRef({ status: state.status, phase: state.phase });

  useEffect(
    () => () => {
      timers.current.forEach((t) => window.clearTimeout(t));
      if (attentionTimer.current !== null) window.clearTimeout(attentionTimer.current);
    },
    []
  );

  // Attention navigation: when the ball changes hands, scroll the human to
  // where it landed and flash a ring there. Runs only on status/phase
  // transitions (the ref above makes the first render a no-op). Reduced-motion
  // users get an instant scroll and no pulse (see loopProgress.css).
  useEffect(() => {
    const before = prevFocus.current;
    if (before.status === state.status && before.phase === state.phase) return;
    prevFocus.current = { status: state.status, phase: state.phase };

    if (attentionTimer.current !== null) {
      window.clearTimeout(attentionTimer.current);
      attentionTimer.current = null;
    }

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const behavior: ScrollBehavior = reduced ? "auto" : "smooth";
    const side = sideRef.current;
    const briefAnchor = document.querySelector('[data-testid="brief-version"]');

    const agentTookBall = before.phase === "human" && state.phase === "agent";
    const revisedReady =
      state.status === "revised_awaiting_review" && before.status !== state.status;
    const closed =
      (state.status === "approved" || state.status === "declined") &&
      before.status !== state.status;

    let next: Attention = null;
    if (agentTookBall && side) {
      // (a) Answer submitted / changes requested: watch the agent work.
      next = { target: "side", pulse: true };
      side.scrollIntoView({ behavior, block: "start" });
    } else if (revisedReady && briefAnchor) {
      // (b) Fresh plan version: look at the plan, not the chat.
      next = { target: "brief", pulse: true };
      briefAnchor.scrollIntoView({ behavior, block: "start" });
    } else if (closed && side) {
      // (c) Terminal states: land on the panels that show the outcome.
      next = { target: "side", pulse: false };
      side.scrollIntoView({ behavior, block: "start" });
    }

    if (next) {
      setAttention(next);
      // Retire the ring so it never becomes permanent decoration.
      attentionTimer.current = window.setTimeout(() => {
        setAttention(null);
        attentionTimer.current = null;
      }, ATTENTION_MS);
    }
  }, [state.status, state.phase]);

  const schedule = (fn: () => void) => {
    timers.current.push(window.setTimeout(fn, AGENT_DELAY));
  };

  const handleSubmitAnswer = (answerId: string | null, text: string) => {
    dispatch({ type: "answer_submitted", answerId, text });
    schedule(() => dispatch({ type: "plan_revised", answerId, text }));
  };

  const handleRequestChanges = (feedbackText: string) => {
    dispatch({ type: "changes_requested", feedback: feedbackText });
    schedule(() => dispatch({ type: "plan_revised_with_feedback", feedback: feedbackText }));
  };

  const handleApprove = () => dispatch({ type: "decision_made", decision: "approved" });
  const handleDecline = (reason: string) =>
    dispatch({ type: "decision_made", decision: "declined", feedback: reason });

  const currentPlan = state.plans[state.plans.length - 1];
  const working = isWorking(state.status, state.phase);
  const meta = statusMeta(state.status, working);

  // Ring classes for the attention effect; undefined when nothing is highlighted.
  const ring = (target: "side" | "brief"): string | undefined =>
    attention && attention.target === target
      ? `zk-loop-attention${attention.pulse ? " zk-loop-attention--pulse" : ""}`
      : undefined;
  const sideRing = ring("side");

  return (
    <div className="app">
      <TopNav />

      <main
        className="page"
        data-testid="request-detail"
        data-status={state.status}
        data-version={currentPlan.version}
      >
        <nav className="breadcrumb" aria-label="Breadcrumb">
          Zedu <span aria-hidden="true">›</span> Inbox{" "}
          <span aria-hidden="true">›</span> Issue #{issue.number}
        </nav>

        <header className="page-head">
          <div>
            <h1 className="page-title">Agent request on issue #{issue.number}</h1>
            <p className="page-sub">
              {agent.name} prepared a fix plan and needs your decision before it touches the
              code.
            </p>
          </div>
          <span className={`pill pill-${meta.tone}`} data-testid="status-pill">
            <span className="dot" aria-hidden="true">
              ●
            </span>
            {meta.label}
          </span>
        </header>

        {/* Progress stepper: App owns the derivation, component stays presentational. */}
        <LoopProgress
          status={state.status}
          working={working}
          currentVersion={currentPlan.version}
          agentName={agent.name}
        />

        <div className="layout">
          <ActionBriefCard
            className={ring("brief")}
            status={state.status}
            working={working}
            agentName={agent.name}
            agentLevel={agent.level}
            agentEmoji={agent.emoji}
            issue={issue}
            intention={brief.intention}
            evidence={[...brief.evidence]}
            risks={[...brief.risks]}
            uncertainties={[...brief.uncertainties]}
            estimate={brief.estimate}
            confidence={brief.confidence}
            confidenceReason={brief.confidenceReason}
            plans={state.plans}
          />

          {/* ref: attention effect scrolls this panel into view on hand-offs.
              The kicker marks this column as the HUMAN's zone, visually
              separated from the agent's brief on the left. */}
          <div ref={sideRef} className={sideRing ? `side ${sideRing}` : "side"}>
            <p
              className={`side-kicker${working || state.status === "approved" || state.status === "declined" ? " is-idle" : ""}`}
              data-testid="side-head"
            >
              {working
                ? `${agent.name} is working — one moment`
                : state.status === "approved"
                  ? "Closed — approved"
                  : state.status === "declined"
                    ? "Closed — declined"
                    : state.status === "revised_awaiting_review"
                      ? "Your move — review the plan & decide"
                      : "Your move — respond to the question"}
            </p>
            <ClarificationPanel
              awaitingAnswer={state.status === "in_clarification" && state.phase === "human"}
              working={working}
              questionBody={question.body}
              questionContext={question.context}
              suggestedAnswers={[...question.suggestedAnswers]}
              messages={state.messages}
              agentName={agent.name}
              onSubmitAnswer={handleSubmitAnswer}
            />

            <DecisionPanel
              status={state.status}
              working={working}
              currentVersion={currentPlan.version}
              decisions={state.decisions}
              agentName={agent.name}
              issueNumber={issue.number}
              onApprove={handleApprove}
              onDecline={handleDecline}
              onRequestChanges={handleRequestChanges}
            />
          </div>
        </div>

        <footer className="demo-note">
          Demo prototype — every agent response here is simulated locally in your browser.
          Nothing is sent to Ziki or any real agent.
        </footer>
      </main>
    </div>
  );
}
