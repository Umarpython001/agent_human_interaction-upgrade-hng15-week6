// App shell — composes the Clarification Loop demo page.
// Owns the simulated-agent timing; all state lives in the RequestProvider store.
import { useEffect, useRef } from "react";
import TopNav from "./components/TopNav";
import ActionBriefCard from "./components/action-brief/ActionBriefCard";
import ClarificationPanel from "./components/clarification/ClarificationPanel";
import DecisionPanel from "./components/decision/DecisionPanel";
import { useRequestDispatch, useRequestState } from "./store/RequestProvider";
import { agent, brief, issue, question } from "./data/scenario";
import { isWorking, statusMeta } from "./lib/statusMeta";

/** Simulated agent latency (ms) between the human's input and the agent's reply. */
const AGENT_DELAY = 1400;

export default function App() {
  const state = useRequestState();
  const dispatch = useRequestDispatch();
  const timers = useRef<number[]>([]);

  useEffect(() => () => timers.current.forEach((t) => window.clearTimeout(t)), []);

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

        <div className="layout">
          <ActionBriefCard
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

          <div className="side">
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
