import { useId, useRef, useState } from "react";
import type { FormEvent } from "react";
import type { ClarificationThreadProps } from "./clarification.types";
import "./clarification.css";

const DEFAULT_MIN = 3;
const DEFAULT_MAX = 2000;

/**
 * ClarificationThread — the human⇄agent question/answer exchange.
 *
 * Presentational + interaction quality only: it validates against Ziki's real
 * question length rules (3–2000 chars), guards against double submissions, and
 * keeps the draft on failure — but it never owns workflow state. The container
 * decides *when* the composer is available (`disabled` + `disabledReason`) and
 * appends the resulting rows to the shared message list.
 *
 * Messages render oldest-first as an ordered list; nothing is reordered,
 * trimmed, or merged — a follow-up is a new row, like Ziki's immutable Q→A.
 */
export function ClarificationThread({
  messages,
  onAsk,
  suggestions,
  names,
  placeholder,
  disabled = false,
  disabledReason,
  busy = false,
  submitLabel = "Send",
  minChars = DEFAULT_MIN,
  maxChars = DEFAULT_MAX,
  heading = "Clarification",
  className,
}: ClarificationThreadProps) {
  const [draft, setDraft] = useState("");
  const [validationError, setValidationError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const composerRef = useRef<HTMLTextAreaElement | null>(null);
  // Synchronous double-submit guard: state updates are async, refs are not.
  const inFlightRef = useRef(false);

  const headingId = useId();
  const errorId = useId();
  const locked = disabled || busy || submitting;

  async function runSubmit(body: string, suggestionId?: string) {
    if (inFlightRef.current) return; // duplicate click / Enter in the same tick
    const trimmed = body.trim();
    if (trimmed.length < minChars) {
      setValidationError(
        `Please write at least ${minChars} characters — the agent needs enough context to act on.`
      );
      composerRef.current?.focus();
      return;
    }
    if (trimmed.length > maxChars) {
      setValidationError(`Please keep it under ${maxChars} characters.`);
      composerRef.current?.focus();
      return;
    }
    inFlightRef.current = true;
    setSubmitting(true);
    setValidationError(null);
    setSubmitError(null);
    // Optimistic clear: the message is already visible in the thread, so the
    // composer empties the moment the reply is accepted. On failure the draft
    // is restored so nothing is ever lost.
    const submitted = trimmed;
    setDraft("");
    try {
      const result = onAsk({ body: submitted, suggestionId });
      if (result && typeof (result as Promise<void>).then === "function") {
        await result;
      }
    } catch (err) {
      setDraft(submitted);
      setSubmitError(
        err instanceof Error && err.message
          ? `Couldn’t send your reply: ${err.message}. Your text was kept — try again.`
          : "Couldn’t send your reply. Check your connection and try again — your text was kept."
      );
    } finally {
      inFlightRef.current = false;
      setSubmitting(false);
    }
  }

  function handleComposerSubmit(e: FormEvent) {
    e.preventDefault();
    void runSubmit(draft);
  }

  function handleSuggestion(id: string, label: string) {
    if (locked) return;
    setDraft(label); // show what will be sent — no silent sends
    void runSubmit(label, id);
  }

  const liveError = validationError ?? submitError;

  return (
    <section
      className={["zk-ct", className].filter(Boolean).join(" ")}
      aria-labelledby={heading ? headingId : undefined}
    >
      {heading ? (
        <h3 className="zk-ct__heading" id={headingId}>
          {heading}
        </h3>
      ) : null}

      {messages.length > 0 ? (
        <ol className="zk-ct__list" aria-label="Clarification messages, oldest first">
          {messages.map((m) => (
            <li
              key={m.id}
              className={`zk-ct__msg zk-ct__msg--${m.author}`}
            >
              <div className="zk-ct__meta">
                <span
                  className={`zk-ct__dot zk-ct__dot--${m.author}`}
                  aria-hidden="true"
                />
                <span className="zk-ct__author">
                  {m.author === "human"
                    ? names?.human ?? "You"
                    : names?.agent ?? "Agent"}
                </span>
                <span className="zk-ct__time">{m.time}</span>
              </div>
              <p className="zk-ct__body">{m.body}</p>
            </li>
          ))}
        </ol>
      ) : null}

      {suggestions && suggestions.length > 0 && !locked ? (
        <div className="zk-ct__suggestions" role="group" aria-label="Suggested replies">
          {suggestions.map((s) => (
            <button
              key={s.id}
              type="button"
              className="zk-ct__chip"
              onClick={() => handleSuggestion(s.id, s.label)}
              title={s.blurb}
            >
              <span className="zk-ct__chip-label">{s.label}</span>
              {s.blurb ? <span className="zk-ct__chip-blurb">{s.blurb}</span> : null}
            </button>
          ))}
        </div>
      ) : null}

      <form className="zk-ct__composer" onSubmit={handleComposerSubmit}>
        <label className="zk-ct__label" htmlFor={`${headingId}-input`}>
          Your reply
        </label>
        <textarea
          id={`${headingId}-input`}
          ref={composerRef}
          className="zk-ct__input"
          value={draft}
          rows={2}
          maxLength={maxChars + 200}
          disabled={locked}
          aria-invalid={validationError ? true : undefined}
          aria-describedby={
            liveError ? errorId : draft.length > 0 ? `${headingId}-count` : undefined
          }
          placeholder={
            placeholder ?? "Type a question or answer for the agent…"
          }
          onChange={(e) => {
            setDraft(e.target.value);
            if (validationError) setValidationError(null);
            if (submitError) setSubmitError(null);
          }}
          onKeyDown={(e) => {
            if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
              e.preventDefault();
              void runSubmit(draft);
            }
          }}
        />
        <div className="zk-ct__composer-row">
          <span className="zk-ct__hint" id={`${headingId}-count`}>
            {draft.length > 0 ? `${draft.length} / ${maxChars}` : ""}
            <span className="zk-ct__hint-keys">Ctrl/⌘ + Enter to send</span>
          </span>
          <button
            type="submit"
            className="zk-ct__send"
            disabled={locked}
            aria-busy={submitting || undefined}
          >
            {submitting ? "Sending…" : submitLabel}
          </button>
        </div>
      </form>

      {/* Polite announcements: validation + submission outcomes. */}
      <p className="zk-sr-only" aria-live="polite">
        {liveError ?? ""}
      </p>

      {liveError ? (
        <p className="zk-ct__error" id={errorId}>
          {liveError}
        </p>
      ) : null}

      {disabled && disabledReason ? (
        <p className="zk-ct__disabled-reason">
          <span className="zk-ct__dot zk-ct__dot--agent" aria-hidden="true" />
          {disabledReason}
        </p>
      ) : null}
    </section>
  );
}
