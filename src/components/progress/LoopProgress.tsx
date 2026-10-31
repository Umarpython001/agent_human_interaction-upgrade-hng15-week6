// Clarification Loop progress stepper — Workstream A.
// Presentational only: every value it renders is derived from props that App
// already computes next to the status pill (status / working / currentVersion).
import type { RequestStatus } from "../../types";
import type { LoopProgressProps, LoopStepState } from "./progress.types";
import "./loopProgress.css";

// Plain-language labels for the three moves the human makes in the loop.
const STEP_TITLES = [
  "Answer the agent's question",
  "Review the updated plan",
  "Approve, request changes, or decline",
] as const;

/**
 * Maps (status, working) onto the linear 3-step model.
 * The loop only ever moves forward; approved/declined close every step.
 */
function stepStates(
  status: RequestStatus,
  working: boolean
): [LoopStepState, LoopStepState, LoopStepState] {
  if (status === "approved" || status === "declined") return ["done", "done", "done"];
  // The only state where the ball is still with the human on step 1.
  if (status === "in_clarification" && !working) return ["current", "upcoming", "upcoming"];
  // Every other state means the question is settled — the plan (or its next
  // revision) is what the human has to look at next, then decide.
  return ["done", "current", "upcoming"];
}

/** One "right now" line so the human always knows what the loop is waiting on. */
function nowSubtitle(
  status: RequestStatus,
  working: boolean,
  currentVersion: number,
  agentName: string
): string {
  switch (status) {
    case "in_clarification":
      return working
        ? `The agent is preparing plan v${currentVersion + 1} — this demo simulates ~2 seconds.`
        : `${agentName} needs one product decision before it can finalize the plan.`;
    case "awaiting_review":
      return `Plan v${currentVersion} is ready for your review — read it, then decide.`;
    case "revised_awaiting_review":
      return `Plan v${currentVersion} is ready — check what changed, then decide.`;
    case "changes_requested":
      return working
        ? `The agent is incorporating your feedback into plan v${currentVersion + 1}…`
        : "Your feedback was recorded — the agent will fold it into the next plan.";
    case "approved":
      return "Approved — the agent is authorized to start work. Approval is not completion; it never means the work is done.";
    case "declined":
      return "Declined — this request is closed.";
  }
}

export default function LoopProgress({
  status,
  working,
  currentVersion,
  agentName = "The agent",
}: LoopProgressProps) {
  const states = stepStates(status, working);
  const subtitle = nowSubtitle(status, working, currentVersion, agentName);

  return (
    <nav
      className="zk-loop"
      aria-label="Review progress"
      data-testid="loop-progress"
      data-status={status}
    >
      {/* Right-now summary: complements the status pill with the next action. */}
      <p className="zk-loop__now" data-testid="loop-now">
        {subtitle}
      </p>

      <ol className="zk-loop__steps">
        {STEP_TITLES.map((title, i) => {
          const stepState = states[i];
          return (
            <li
              key={title}
              className={`zk-loop__step zk-loop__step--${stepState}`}
              data-testid={`loop-step-${i + 1}`}
              data-state={stepState}
              // Screen readers announce the active step; sighted users get the
              // "You're here" chip — state is never conveyed by colour alone.
              aria-current={stepState === "current" ? "step" : undefined}
            >
              <span className="zk-loop__marker" aria-hidden="true">
                {stepState === "done" ? "✓" : i + 1}
              </span>
              <span className="zk-loop__body">
                <span className="zk-loop__label">{title}</span>
                {stepState === "current" && <span className="zk-loop__here">You're here</span>}
                {/* Visually hidden state words keep the stepper honest for SRs. */}
                {stepState === "done" && <span className="zk-loop__sr-only">Done</span>}
                {stepState === "upcoming" && (
                  <span className="zk-loop__sr-only">Not started yet</span>
                )}
              </span>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
