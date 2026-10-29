import type { ReactNode } from 'react';

/**
 * Agent Action Brief — data contract.
 *
 * Everything in this file is *presentation data*: the component renders it and
 * makes no decisions about workflow state. Submission behaviour, approval
 * decisions and state transitions belong to the workflow agent, which supplies
 * its own controls through {@link AgentActionBriefProps.footer}.
 *
 * Naming mirrors Ziki's public API vocabulary (issues, escalations, revisions)
 * so the lead agent can map its shared types onto these shapes 1:1.
 */

/** Escalation types from Ziki's agent API (`POST /api/v1/escalations`). */
export type BriefRequestKind =
  | 'question'
  | 'work_authorization'
  | 'blocker'
  | 'scope_change'
  | 'human_approval';

/**
 * Human-readable review state of the proposal. Display-only — the component
 * never changes it.
 */
export type BriefStatus =
  | 'pending' // proposed, awaiting the human's first decision
  | 'needs_input' // agent is blocked on an answer from the human
  | 'revised' // agent revised the proposal after clarification
  | 'approved' // human approved (shown after the workflow agent decides)
  | 'declined'
  | 'superseded' // replaced by a newer proposal
  | 'expired';

/**
 * How much a statement can be trusted. Rendered with a label, a colour and a
 * border treatment so the distinction never relies on colour alone.
 *  - `fact`      — verified by the agent (reproduced, read from code, logged)
 *  - `reported`  — stated by a person or another source, not verified
 *  - `assumption`— the agent's working hypothesis, explicitly unverified
 */
export type EvidenceKind = 'fact' | 'reported' | 'assumption';

export type BriefSeverity = 'low' | 'medium' | 'high';
export type BriefConfidence = 'low' | 'medium' | 'high';
export type BriefChangeKind = 'create' | 'modify' | 'delete' | 'rename' | 'unknown';

/** Who authored a proposal or a clarification message. */
export interface BriefAuthor {
  id?: string;
  name: string;
  /** 'agent' renders the agent treatment, 'human' the owner treatment. */
  role: 'agent' | 'human';
  /** Optional remote avatar. Falls back to {@link avatarEmoji}, then initials. */
  avatarUrl?: string;
  avatarEmoji?: string;
  /** Small chip shown next to the name, e.g. "Work", "Owner". */
  tag?: string;
}

/** The issue a proposal is attached to. Optional: blockers can be unlinked. */
export interface BriefIssue {
  id: string;
  /** Display key, e.g. "#129". */
  key?: string;
  title: string;
  href?: string;
  type?: string;
  priority?: string;
  status?: string;
  stage?: string;
  commentCount?: number;
}

/** A single piece of supporting context, tagged with its trust level. */
export interface BriefEvidenceItem {
  id: string;
  kind: EvidenceKind;
  text: string;
  /** Where it came from, e.g. "issue #129, comment 2". */
  sourceLabel?: string;
  sourceHref?: string;
  /** ISO timestamp of when the evidence was observed (optional). */
  observedAt?: string;
}

/** One step of the proposed implementation plan. */
export interface BriefPlanStep {
  id: string;
  title: string;
  detail?: string;
}

/** A file the agent expects to touch. Nothing has been changed yet. */
export interface BriefScopeFile {
  path: string;
  change: BriefChangeKind;
  note?: string;
}

export interface BriefScope {
  files: BriefScopeFile[];
  /** Extra caveat shown above the file list. */
  note?: string;
  /**
   * True only when the paths came from a verified source. When false or
   * omitted the component states plainly that this is a proposal, not a fact.
   */
  verified?: boolean;
}

export interface BriefRisk {
  id: string;
  severity: BriefSeverity;
  title: string;
  detail?: string;
  mitigation?: string;
}

export interface BriefQuestion {
  id: string;
  text: string;
  context?: string;
  status: 'open' | 'answered';
  answer?: string;
}

export interface BriefEstimate {
  text: string;
  confidence?: BriefConfidence;
}

/** Version information for the proposal. `current: 1` means no revisions yet. */
export interface BriefRevision {
  current: number;
  total?: number;
  /** One-line summary of what this revision changed. */
  summary?: string;
  /** Bulleted deltas against the previous revision. */
  changes?: string[];
  createdAt?: string;
}

/**
 * The proposal itself — everything the human needs to understand the action
 * at a glance. `summary`, `status`, `agent`, `revision` and `createdAt` are
 * required; every other section renders only when present and non-empty.
 */
export interface BriefProposal {
  id: string;
  /** Short action title, e.g. "Fix invitation pages hanging on a spinner". */
  title: string;
  status: BriefStatus;
  /** Overrides the default label for `status`, e.g. "Waiting on you". */
  statusLabel?: string;
  requestKind?: BriefRequestKind;
  agent: BriefAuthor;
  revision: BriefRevision;
  createdAt: string;
  /** Already-formatted timestamp; wins over `createdAt` when present. */
  createdAtLabel?: string;
  updatedAt?: string;
  issue?: BriefIssue;
  /** Concise explanation of the proposed action (1–3 sentences). */
  summary: string;
  /** Why the action is necessary. */
  rationale?: string;
  estimate?: BriefEstimate;
  evidence?: BriefEvidenceItem[];
  plan?: BriefPlanStep[];
  scope?: BriefScope;
  risks?: BriefRisk[];
  questions?: BriefQuestion[];
}

/**
 * One entry in the clarification conversation. This is the single conversation
 * model the component consumes — it maps directly onto the shared message data
 * the lead agent owns (no second model is introduced here).
 *
 *   proposal  → the original proposal as posted
 *   question  → the human's question or response
 *   answer    → the agent's answer
 *   revision  → the revised proposal (pair with `revision` numbers)
 *   note      → anything else (system events, context drops)
 */
export interface BriefMessage {
  id: string;
  author: BriefAuthor;
  kind: 'proposal' | 'question' | 'answer' | 'revision' | 'note';
  body: string;
  /** ISO timestamp. */
  createdAt: string;
  /** Already-formatted timestamp; wins over `createdAt` when present. */
  createdAtLabel?: string;
  /** Proposal revision this message introduced, when applicable. */
  revision?: number;
}

export interface AgentActionBriefProps {
  proposal: BriefProposal;
  /** Clarification-loop messages, oldest first. Hidden when empty. */
  messages?: BriefMessage[];
  /**
   * Decision controls supplied by the workflow agent (approve / ask / decline…).
   * The brief only lays them out; it never wires up submission behaviour.
   */
  footer?: ReactNode;
  /** Semantic level for the proposal title; sections use the next level down. */
  headingLevel?: 2 | 3 | 4 | 5;
  /** Default open state for collapsible detail sections (scope, plan detail). */
  defaultDetailsOpen?: boolean;
  className?: string;
}
