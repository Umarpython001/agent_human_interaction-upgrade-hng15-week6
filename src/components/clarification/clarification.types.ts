import type { ThreadMessage } from "../../types";

/**
 * Clarification loop — public data contract (WORKFLOW agent).
 *
 * Consumes the LEAD-owned shared model (`src/types.ts`) directly: the thread is
 * a list of `ThreadMessage` rows, appended in chronological order. Nothing in
 * this folder defines a competing message type — a follow-up question is just a
 * new row, mirroring Ziki's immutable Q→A question rows.
 */

/** A quick-reply option offered alongside the free-text composer. */
export interface SuggestedAnswer {
  /** Stable id — lets the container pick its canned agent reply. */
  id: string;
  /** Human-readable label; also the message body when the chip is used. */
  label: string;
  /** One-line explanation of what choosing this means. */
  blurb?: string;
}

/** Payload emitted when the human submits a reply. */
export interface ClarificationComposerSubmit {
  /** The message body (already trimmed). */
  body: string;
  /** Id of the suggestion chip, when a chip was used instead of typing. */
  suggestionId?: string;
}

export interface ClarificationThreadProps {
  /** Messages, oldest first. An empty list renders just the composer. */
  messages: ThreadMessage[];
  /**
   * Submit handler. May be sync or async; when it returns a promise the
   * composer stays locked (and shows a retryable inline error on rejection)
   * until it settles. The typed draft is preserved on failure.
   */
  onAsk: (input: ClarificationComposerSubmit) => void | Promise<void>;
  /** Quick-reply chips rendered above the composer. */
  suggestions?: SuggestedAnswer[];
  /** Display names for the message authors (falls back to role labels). */
  names?: { human?: string; agent?: string };
  /** Composer placeholder. */
  placeholder?: string;
  /** Disable the composer, e.g. while the agent is revising its plan. */
  disabled?: boolean;
  /** Honest explanation shown when `disabled` — never leave the user guessing. */
  disabledReason?: string;
  /** Container-driven busy flag (agent revising, decision in flight, …). */
  busy?: boolean;
  /** Submit button label. */
  submitLabel?: string;
  /** Minimum body length — defaults to 3, Ziki's real question-length floor. */
  minChars?: number;
  /** Maximum body length — defaults to 2000, Ziki's real question ceiling. */
  maxChars?: number;
  /** Optional section heading. Pass `null` to render without one. */
  heading?: string | null;
  /** Extra class names for the section root (container-scoped styling). */
  className?: string;
}
