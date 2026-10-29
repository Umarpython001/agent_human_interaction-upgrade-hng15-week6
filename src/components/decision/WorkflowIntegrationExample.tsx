import { useMemo, useReducer, useRef, useState } from "react";
import type { DecisionRecord, PlanVersion } from "../../types";
import {
  agent,
  buildAnswerRevision,
  buildFeedbackRevision,
  human,
  issue,
  planV1,
  question,
  seedMessages,
} from "../../data/scenario";
import { ClarificationThread } from "../clarification";
import type { ClarificationComposerSubmit } from "../clarification";
import { DecisionBar } from "./DecisionBar";
import type { DecisionSubmission } from "./decision.types";
import {
  createInitialWorkflowState,
  workflowExampleReducer,
} from "./workflowExampleReducer";
import "./workflowExample.css";

/**
 * WorkflowIntegrationExample — INTEGRATION EXAMPLE, not the app shell.
 *
 * Shows exactly how a LEAD-owned container wires `ClarificationThread` and
 * `DecisionBar` to the shared model (`src/types.ts`) and the mock scenario
 * (`src/data/scenario.ts`). All state is local; agent replies are the
 * preset recipes from the scenario file — nothing is sent anywhere.
 *
 * At integration this component is replaced by the LEAD's page/store; the
 * two children and their prop contracts stay unchanged.
 */
export interface WorkflowIntegrationExampleProps {
  /** Simulated agent latency for a revision round (tests pass a small value). */
  revisionDelayMs?: number;
  /** Clock used for message/decision timestamps (tests pass a fixed one). */
  clock?: () => string;
  /** Hide the harness-only extras (failure toggle). */
  harnessTools?: boolean;
}

function formatTime(d: Date = new Date()): string {
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  return `${hh}:${mm}`;
}

interface Banner {
  tone: "ok" | "bad" | "warn" | "info";
  text: string;
}

export function WorkflowIntegrationExample({
  revisionDelayMs = 900,
  clock = formatTime,
  harnessTools = true,
}: WorkflowIntegrationExampleProps) {
  const seed = useMemo(
    () => createInitialWorkflowState(planV1, seedMessages),
    []
  );
  const [state, dispatch] = useReducer(workflowExampleReducer, seed);
  const [failNext, setFailNext] = useState(false);

  // Mirror of the latest state for use inside async handlers (avoids stale
  // closures without re-creating the callbacks each render).
  const stateRef = useRef(state);
  stateRef.current = state;

  const idCounter = useRef(0);
  const nextId = () => `m${++idCounter.current}`;

  const delay = () =>
    new Promise<void>((resolve) => setTimeout(resolve, revisionDelayMs));

  async function handleAsk({ body, suggestionId }: ClarificationComposerSubmit) {
    if (failNext) {
      setFailNext(false);
      throw new Error("simulated network failure (harness)");
    }
    if (stateRef.current.decided) {
      throw new Error("this request is already decided");
    }
    dispatch({
      type: "human_message",
      message: { id: nextId(), author: "human", body, time: clock() },
    });
    await delay();
    const revision = buildAnswerRevision(
      suggestionId ?? null,
      body,
      stateRef.current.plan.version + 1,
      clock()
    );
    dispatch({ type: "agent_revision", ack: revision.ack, plan: revision.plan });
  }

  async function handleDecide(submission: DecisionSubmission) {
    if (failNext) {
      setFailNext(false);
      throw new Error("simulated network failure (harness)");
    }
    const current = stateRef.current;
    // Container-side guards (belt) — the reducer enforces them again (braces).
    if (current.status !== "revised_awaiting_review" || current.decided) {
      throw new Error("the proposal on the table has changed — review it again");
    }
    if (submission.version !== current.plan.version) {
      throw new Error(
        `that decision targets v${submission.version}, but v${current.plan.version} is on the table`
      );
    }
    const record: DecisionRecord = {
      version: submission.version,
      decision: submission.decision,
      ...(submission.feedback ? { feedback: submission.feedback } : {}),
      time: clock(),
    };

    if (submission.decision === "changes_requested") {
      dispatch({
        type: "decide",
        record,
        feedbackMessage: {
          id: nextId(),
          author: "human",
          body: submission.feedback ?? "",
          time: clock(),
        },
      });
      await delay();
      const revision = buildFeedbackRevision(
        submission.feedback ?? "",
        stateRef.current.plan,
        clock()
      );
      dispatch({ type: "agent_revision", ack: revision.ack, plan: revision.plan });
      return;
    }
    dispatch({ type: "decide", record });
  }

  function resetDemo() {
    setFailNext(false);
    dispatch({ type: "reset", seed });
  }

  const decided = state.decided;
  const revising = state.working;
  const nextVersion = state.plan.version + 1;

  const banner: Banner = decided
    ? decided.decision === "approved"
      ? {
          tone: "ok",
          text: `Approved — version ${decided.version} is authorized. The agent may now start; done is only claimed with proof.`,
        }
      : {
          tone: "bad",
          text: `Declined — version ${decided.version} will not be acted on.`,
        }
    : state.status === "in_clarification" && !state.working
      ? {
          tone: "warn",
          text: `Waiting on you — ${agent.name} is blocked on its question before it can continue.`,
        }
      : revising
        ? state.history.length > 0
          ? {
              tone: "info",
              text: `Changes requested — ${agent.name} is preparing version ${nextVersion}…`,
            }
          : { tone: "info", text: `${agent.name} is preparing version ${nextVersion}…` }
        : { tone: "info", text: `Version ${state.plan.version} is ready for your decision.` };

  const threadDisabled = revising || decided !== null;
  const threadDisabledReason = decided
    ? "This request is decided — the clarification loop is closed."
    : revising
      ? `${agent.name} is writing its answer…`
      : undefined;

  const decisionDisabled = state.status !== "revised_awaiting_review";
  const decisionDisabledReason =
    state.status === "in_clarification" && !state.working
      ? "Answer the agent's question before deciding."
      : revising
        ? `${agent.name} is revising the plan — deciding now would apply to the wrong version.`
        : undefined;

  return (
    <div className="zk-wfx">
      <header className="zk-wfx__header">
        <h2 className="zk-wfx__title">Clarification loop · demo request</h2>
        <p className="zk-wfx__mock-note">
          Mock prototype — replies are generated locally from preset data. Nothing is
          sent to a server or a real agent.
        </p>
        <p className="zk-wfx__request-line">
          <span className="zk-wfx__avatar" aria-hidden="true">{agent.emoji}</span>
          <span className="zk-wfx__agent-name">{agent.name}</span>
          <span className="zk-wfx__agent-level">{agent.level}</span>
          <span className="zk-wfx__issue">
            on issue #{issue.number} · {issue.title}
          </span>
        </p>
      </header>

      <p
        className={`zk-wfx__banner zk-wfx__banner--${banner.tone}`}
        aria-live="polite"
      >
        <span
          className={`zk-wfx__banner-dot zk-wfx__banner-dot--${banner.tone}`}
          aria-hidden="true"
        />
        {banner.text}
      </p>

      <section className="zk-wfx__plan" aria-label="Agent's plan">
        <h3 className="zk-wfx__plan-title">
          Agent’s plan
          <span className="zk-wfx__version">v{state.plan.version}</span>
          {state.plan.version > 1 ? (
            <span className="zk-wfx__revised">revised</span>
          ) : null}
        </h3>
        <p className="zk-wfx__plan-summary">{state.plan.summary}</p>
        <ol className="zk-wfx__steps">
          {state.plan.steps.map((step) => (
            <li
              key={step.id}
              className={`zk-wfx__step${step.changed ? " zk-wfx__step--changed" : ""}`}
            >
              <span className="zk-wfx__step-text">{step.text}</span>
              {step.changed ? <span className="zk-wfx__step-tag">Changed</span> : null}
            </li>
          ))}
        </ol>
        {state.versions.length > 1 ? (
          <details className="zk-wfx__versions">
            <summary>Version history ({state.versions.length})</summary>
            <ol>
              {state.versions.map((v: PlanVersion) => (
                <li key={v.version}>
                  <strong>v{v.version}</strong> · {v.summary} <em>({v.time})</em>
                </li>
              ))}
            </ol>
          </details>
        ) : null}
      </section>

      {state.status === "in_clarification" && !state.working ? (
        <section className="zk-wfx__question" aria-label="Open question from the agent">
          <h3 className="zk-wfx__question-title">
            Open question from {agent.name}
          </h3>
          <p className="zk-wfx__question-body">{question.body}</p>
          <p className="zk-wfx__question-context">{question.context}</p>
        </section>
      ) : null}

      <ClarificationThread
        messages={state.messages}
        onAsk={handleAsk}
        suggestions={question.suggestedAnswers}
        names={{ human: human.name, agent: agent.name }}
        disabled={threadDisabled}
        disabledReason={threadDisabledReason}
        busy={revising}
      />

      <DecisionBar
        proposalVersion={state.plan.version}
        onDecide={handleDecide}
        decided={decided}
        history={state.history}
        disabled={decisionDisabled}
        disabledReason={decisionDisabledReason}
        busy={revising}
        names={{ human: human.name, agent: agent.name }}
      />

      {harnessTools ? (
        <footer className="zk-wfx__tools">
          <label className="zk-wfx__tool">
            <input
              type="checkbox"
              checked={failNext}
              onChange={(e) => setFailNext(e.target.checked)}
            />
            Harness only: fail the next submission (then retry)
          </label>
          <button type="button" className="zk-wfx__reset" onClick={resetDemo}>
            Reset demo
          </button>
        </footer>
      ) : null}
    </div>
  );
}
