import type {
  DecisionRecord,
  PlanVersion,
  RequestStatus,
  ThreadMessage,
} from "../../types";

/**
 * INTEGRATION EXAMPLE ONLY — not the application store.
 *
 * A minimal, pure reducer showing how a LEAD-owned container (`src/store/`)
 * should drive `ClarificationThread` + `DecisionBar` with the shared model in
 * `src/types.ts`. Every transition is guarded here (invalid ones are no-ops),
 * so double submissions and stale version decisions cannot corrupt state.
 *
 * State machine (ratified §4 `RequestStatus` + `working` phase):
 *
 *   in_clarification ──human asks/answers──▶ (working: true)
 *        ──agent revises──▶ revised_awaiting_review
 *   revised_awaiting_review ──approve──────▶ approved        (terminal)
 *   revised_awaiting_review ──decline──────▶ declined        (terminal)
 *   revised_awaiting_review ──changes_requested (decision, v recorded)
 *        ──▶ changes_requested (working: true) ──agent revises──▶ revised_awaiting_review (v+1)
 *
 * `working` is the transient "the agent is revising right now" phase inside a
 * status (see `Phase` in `src/types.ts`).
 */
export interface WorkflowExampleState {
  status: RequestStatus;
  /** True while the agent is preparing the next plan version. */
  working: boolean;
  messages: ThreadMessage[];
  plan: PlanVersion;
  /** Every version that has been on the table, oldest first. */
  versions: PlanVersion[];
  /** Non-terminal decisions (change requests), oldest first. */
  history: DecisionRecord[];
  /** Terminal decision, when one exists. */
  decided: DecisionRecord | null;
}

export type WorkflowExampleAction =
  | { type: "human_message"; message: ThreadMessage }
  | { type: "agent_revision"; ack: string; plan: PlanVersion }
  | { type: "decide"; record: DecisionRecord; feedbackMessage?: ThreadMessage }
  | { type: "reset"; seed: WorkflowExampleState };

export function createInitialWorkflowState(
  plan: PlanVersion,
  messages: ThreadMessage[]
): WorkflowExampleState {
  return {
    status: "in_clarification",
    working: false,
    messages: [...messages],
    plan,
    versions: [plan],
    history: [],
    decided: null,
  };
}

export function workflowExampleReducer(
  state: WorkflowExampleState,
  action: WorkflowExampleAction
): WorkflowExampleState {
  switch (action.type) {
    case "reset":
      return action.seed;

    case "human_message": {
      // Clarifying is allowed until the agent starts revising, and never
      // after a terminal decision.
      if (state.decided) return state;
      if (state.working) return state;
      return {
        ...state,
        messages: [...state.messages, action.message],
        working: true,
      };
    }

    case "agent_revision": {
      // The agent only lands a revision while it is the one working.
      if (!state.working) return state;
      if (action.plan.version !== state.plan.version + 1) return state;
      const ack: ThreadMessage = {
        id: `ack-v${action.plan.version}`,
        author: "agent",
        body: action.ack,
        time: action.plan.time,
      };
      return {
        ...state,
        messages: [...state.messages, ack],
        plan: action.plan,
        versions: [...state.versions, action.plan],
        status: "revised_awaiting_review",
        working: false,
      };
    }

    case "decide": {
      const { record, feedbackMessage } = action;
      // Invalid transitions are no-ops: only a fresh decision on the version
      // actually on the table counts, and only once.
      if (state.status !== "revised_awaiting_review") return state;
      if (state.decided) return state;
      if (record.version !== state.plan.version) return state;

      if (record.decision === "changes_requested") {
        return {
          ...state,
          messages: feedbackMessage
            ? [...state.messages, feedbackMessage]
            : state.messages,
          history: [...state.history, record],
          status: "changes_requested",
          working: true,
        };
      }
      return {
        ...state,
        decided: record,
        working: false,
        status: record.decision === "approved" ? "approved" : "declined",
      };
    }

    default:
      return state;
  }
}
