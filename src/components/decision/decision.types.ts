import type { DecisionKind, DecisionRecord } from "../../types";

/**
 * Decision workflow — public data contract (WORKFLOW agent).
 *
 * Built directly on the LEAD-owned shared model (`src/types.ts`):
 * `DecisionKind` / `DecisionRecord` are consumed, never redefined.
 */

/** What the human submits. Always bound to the proposal version reviewed. */
export interface DecisionSubmission {
  decision: DecisionKind;
  /** Trimmed feedback. Required for changes/declined, optional note for approve. */
  feedback?: string;
  /**
   * The proposal version this decision applies to. Containers MUST reject
   * submissions whose `version` no longer matches the current plan — an
   * approval for an earlier version never silently covers a revised one.
   */
  version: number;
}

export interface DecisionBarProps {
  /** The proposal version currently displayed (the one being decided on). */
  proposalVersion: number;
  /**
   * Submit handler. May be sync or async; on rejection an inline error is
   * shown and the typed feedback is kept for retry.
   */
  onDecide: (submission: DecisionSubmission) => void | Promise<void>;
  /** Terminal decision record — when set, the outcome summary replaces controls. */
  decided?: DecisionRecord | null;
  /** Prior decisions (e.g. change requests), oldest first — shown as a trace. */
  history?: DecisionRecord[];
  /** Disable the controls, e.g. while the agent still owes an answer/revision. */
  disabled?: boolean;
  /** Honest explanation shown when `disabled`. */
  disabledReason?: string;
  /** Container-driven busy flag (agent revising the plan, decision in flight…). */
  busy?: boolean;
  /** Display names for copy. */
  names?: { human?: string; agent?: string };
  /** Extra class names for the section root. */
  className?: string;
}
