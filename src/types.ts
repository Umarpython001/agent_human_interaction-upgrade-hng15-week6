// Shared data model for the Clarification Loop demo.
// Canonical status enum = the §4 vocabulary, ratified by RESEARCH + QA:
//   awaiting_review | in_clarification | revised_awaiting_review
//   | changes_requested | approved | declined (| superseded | expired for display)
// `working` distinguishes the transient "agent is revising" phase inside a status.

export type MessageAuthor = "human" | "agent";

export interface ThreadMessage {
  id: string;
  author: MessageAuthor;
  body: string;
  time: string;
}

export interface PlanStep {
  id: string;
  text: string;
  /** Steps the agent changed in this version — highlighted in the UI. */
  changed?: boolean;
}

export interface PlanVersion {
  version: number;
  steps: PlanStep[];
  /** One-line "what changed" summary for this version. */
  summary: string;
  time: string;
}

export type DecisionKind = "approved" | "changes_requested" | "declined";

export interface DecisionRecord {
  version: number;
  decision: DecisionKind;
  /** Required for changes_requested and declined (anti-rubber-stamp paths). */
  feedback?: string;
  time: string;
}

export type RequestStatus =
  | "awaiting_review" // brief on the table, no open question
  | "in_clarification" // question open (human's move) or answered, agent revising
  | "revised_awaiting_review" // revised plan ready for a decision
  | "changes_requested" // recorded decision; agent folding feedback into next version
  | "approved"
  | "declined";

/** Who holds the ball while in a given status. */
export type Phase = "human" | "agent";
