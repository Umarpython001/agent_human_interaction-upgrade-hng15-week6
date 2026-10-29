// Single source of truth for the demo's request/interaction state.
// Pure reducer — all simulated agent behaviour is deterministic and local.
import type {
  DecisionRecord,
  Phase,
  PlanVersion,
  RequestStatus,
  ThreadMessage,
} from "../types";
import {
  buildAnswerRevision,
  buildFeedbackRevision,
  planV1,
  question,
  seedMessages,
} from "../data/scenario";

export interface RequestState {
  messages: ThreadMessage[];
  plans: PlanVersion[];
  decisions: DecisionRecord[];
  status: RequestStatus;
  /** Transient phase: who holds the ball (human answers/decides, agent revises). */
  phase: Phase;
}

export const initialState: RequestState = {
  messages: seedMessages,
  plans: [planV1],
  decisions: [],
  status: "in_clarification",
  phase: "human",
};

export type Action =
  | { type: "answer_submitted"; answerId: string | null; text: string }
  | { type: "plan_revised"; answerId: string | null; text: string }
  | { type: "changes_requested"; feedback: string }
  | { type: "plan_revised_with_feedback"; feedback: string }
  | { type: "decision_made"; decision: "approved" | "declined"; feedback?: string };

let idCounter = 0;
const nextId = () => `msg-${++idCounter}`;

const nowTime = () =>
  new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

const withMessage = (
  messages: ThreadMessage[],
  author: ThreadMessage["author"],
  body: string
): ThreadMessage[] => [...messages, { id: nextId(), author, body, time: nowTime() }];

export function reducer(state: RequestState, action: Action): RequestState {
  switch (action.type) {
    case "answer_submitted": {
      const suggested = action.answerId
        ? question.suggestedAnswers.find((a) => a.id === action.answerId)
        : undefined;
      const body = suggested ? suggested.label : action.text;
      return {
        ...state,
        status: "in_clarification",
        phase: "agent",
        messages: withMessage(state.messages, "human", body),
      };
    }
    case "plan_revised": {
      const current = state.plans[state.plans.length - 1];
      const { ack, plan } = buildAnswerRevision(
        action.answerId,
        action.text,
        current.version + 1,
        nowTime()
      );
      return {
        ...state,
        status: "revised_awaiting_review",
        phase: "human",
        plans: [...state.plans, plan],
        messages: withMessage(state.messages, "agent", ack),
      };
    }
    case "changes_requested": {
      const current = state.plans[state.plans.length - 1];
      return {
        ...state,
        status: "changes_requested",
        phase: "agent",
        decisions: [
          ...state.decisions,
          {
            version: current.version,
            decision: "changes_requested",
            feedback: action.feedback,
            time: nowTime(),
          },
        ],
        messages: withMessage(
          state.messages,
          "human",
          `Changes requested on version ${current.version}: ${action.feedback}`
        ),
      };
    }
    case "plan_revised_with_feedback": {
      const current = state.plans[state.plans.length - 1];
      const { ack, plan } = buildFeedbackRevision(action.feedback, current, nowTime());
      return {
        ...state,
        status: "revised_awaiting_review",
        phase: "human",
        plans: [...state.plans, plan],
        messages: withMessage(state.messages, "agent", ack),
      };
    }
    case "decision_made": {
      const current = state.plans[state.plans.length - 1];
      const record: DecisionRecord = {
        version: current.version,
        decision: action.decision,
        feedback: action.feedback,
        time: nowTime(),
      };
      const messages =
        action.decision === "declined" && action.feedback
          ? withMessage(state.messages, "human", `Declined version ${current.version}: ${action.feedback}`)
          : state.messages;
      return {
        ...state,
        status: action.decision,
        phase: "human",
        decisions: [...state.decisions, record],
        messages,
      };
    }
    default:
      return state;
  }
}
