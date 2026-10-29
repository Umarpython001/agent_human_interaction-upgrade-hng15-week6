import { useEffect, useId, useRef, useState } from "react";
import type { DecisionKind } from "../../types";
import type { DecisionBarProps, DecisionSubmission } from "./decision.types";
import "./decision.css";

type Panel = "none" | "approve" | "changes" | "decline";

const DECISION_LABEL: Record<DecisionKind, string> = {
  approved: "Approved",
  changes_requested: "Changes requested",
  declined: "Declined",
};

/**
 * DecisionBar — the human's three-way decision on the proposal version that is
 * currently on the table.
 *
 * - Approve records authorization for the *displayed* version only; copy never
 *   implies the work is done (Ziki's prove-before-done rule).
 * - Request changes requires feedback; decline requires a reason (spec AC5).
 * - Every submission is version-bound (`DecisionSubmission.version`).
 * - Inline forms only — no modals — with double-submit guards, retryable
 *   errors that keep the typed text, focus management and polite live
 *   announcements.
 *
 * State machine ownership stays in the container: this component emits
 * submissions and renders what the container feeds back (`decided`, `history`,
 * `disabled`, `busy`).
 */
export function DecisionBar({
  proposalVersion,
  onDecide,
  decided = null,
  history = [],
  disabled = false,
  disabledReason,
  busy = false,
  names,
  className,
}: DecisionBarProps) {
  const [panel, setPanel] = useState<Panel>("none");
  const [note, setNote] = useState(""); // approve: optional note
  const [changesText, setChangesText] = useState(""); // request changes: required
  const [declineText, setDeclineText] = useState(""); // decline: required
  const [validationError, setValidationError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const inFlightRef = useRef(false);
  const changesRef = useRef<HTMLTextAreaElement | null>(null);
  const declineRef = useRef<HTMLTextAreaElement | null>(null);
  const outcomeRef = useRef<HTMLDivElement | null>(null);

  const baseId = useId();
  const errId = `${baseId}-err`;
  const agentLabel = names?.agent ?? "The agent";
  const controlsLocked = disabled || busy || submitting;

  // A materially different proposal invalidates open forms: close them and
  // drop stale errors when the version changes. (Drafts survive errors, not
  // revisions — feedback written for v2 must not silently ride onto v3.)
  useEffect(() => {
    setPanel("none");
    setValidationError(null);
    setSubmitError(null);
  }, [proposalVersion]);

  // When a terminal decision lands, move focus to the outcome so keyboard and
  // screen-reader users land on the result, not on vanished buttons.
  useEffect(() => {
    if (decided) {
      setPanel("none");
      outcomeRef.current?.focus();
    }
  }, [decided]);

  function openPanel(next: Panel) {
    if (controlsLocked || decided) return;
    setValidationError(null);
    setSubmitError(null);
    setPanel(next);
    // Focus the field the user must act on.
    window.requestAnimationFrame(() => {
      if (next === "changes") changesRef.current?.focus();
      if (next === "decline") declineRef.current?.focus();
    });
  }

  function closePanel() {
    setPanel("none");
    setValidationError(null);
    setSubmitError(null);
  }

  async function submit(decision: DecisionKind, feedback?: string) {
    if (inFlightRef.current) return; // duplicate click in the same tick
    const trimmed = feedback?.trim();
    if ((decision === "changes_requested" || decision === "declined") && !trimmed) {
      setValidationError(
        decision === "changes_requested"
          ? "Tell the agent what to change — a change request needs feedback."
          : "A decline needs a reason so the agent understands why."
      );
      (decision === "changes_requested" ? changesRef : declineRef).current?.focus();
      return;
    }
    inFlightRef.current = true;
    setSubmitting(true);
    setValidationError(null);
    setSubmitError(null);
    const submission: DecisionSubmission = {
      decision,
      version: proposalVersion,
      ...(trimmed ? { feedback: trimmed } : {}),
    };
    try {
      const result = onDecide(submission);
      if (result && typeof (result as Promise<void>).then === "function") {
        await result;
      }
      // Success: close the form. Container state (`decided`/`history`/`busy`)
      // now reflects the outcome.
      setPanel("none");
      if (decision === "approved") setNote("");
      if (decision === "changes_requested") setChangesText("");
      if (decision === "declined") setDeclineText("");
    } catch (err) {
      setSubmitError(
        err instanceof Error && err.message
          ? `Couldn’t record your decision: ${err.message}. Nothing was submitted — your text was kept, try again.`
          : "Couldn’t record your decision. Check your connection and try again — your text was kept."
      );
    } finally {
      inFlightRef.current = false;
      setSubmitting(false);
    }
  }

  const liveMessage = submitting
    ? "Submitting your decision…"
    : validationError ?? submitError ?? "";

  return (
    <section
      className={["zk-dc", className].filter(Boolean).join(" ")}
      aria-label="Your decision"
      aria-busy={submitting || busy || undefined}
    >
      <h3 className="zk-dc__heading">Your decision</h3>

      {decided ? (
        <div
          className={`zk-dc__outcome zk-dc__outcome--${decided.decision}`}
          ref={outcomeRef}
          tabIndex={-1}
        >
          <p className="zk-dc__outcome-title">
            <span
              className={`zk-dc__dot zk-dc__dot--${decided.decision}`}
              aria-hidden="true"
            />
            {DECISION_LABEL[decided.decision]} · version {decided.version}
          </p>
          <p className="zk-dc__outcome-line">
            {decided.decision === "approved"
              ? `You approved version ${decided.version} at ${decided.time}.`
              : decided.decision === "declined"
                ? `You declined version ${decided.version} at ${decided.time}.`
                : `You asked for changes to version ${decided.version} at ${decided.time}.`}
          </p>
          {decided.feedback ? (
            <p className="zk-dc__outcome-feedback">“{decided.feedback}”</p>
          ) : null}
          <p className="zk-dc__outcome-note">
            {decided.decision === "approved"
              ? "Authorization only — the agent has not started or completed the work. On Ziki, done is claimed with proof, never by approval."
              : "The agent will not act on this plan."}
          </p>
        </div>
      ) : (
        <>
          <div className="zk-dc__controls" role="group" aria-label="Decision controls">
            <button
              type="button"
              className="zk-dc__btn zk-dc__btn--approve"
              onClick={() => openPanel("approve")}
              disabled={controlsLocked}
              aria-expanded={panel === "approve"}
            >
              Approve
            </button>
            <button
              type="button"
              className="zk-dc__btn zk-dc__btn--changes"
              onClick={() => openPanel("changes")}
              disabled={controlsLocked}
              aria-expanded={panel === "changes"}
            >
              Request changes
            </button>
            <button
              type="button"
              className="zk-dc__btn zk-dc__btn--decline"
              onClick={() => openPanel("decline")}
              disabled={controlsLocked}
              aria-expanded={panel === "decline"}
            >
              Decline
            </button>
          </div>

          {panel === "approve" ? (
            <div className="zk-dc__panel">
              <p className="zk-dc__panel-title">Approve version {proposalVersion}</p>
              <label className="zk-dc__label" htmlFor={`${baseId}-note`}>
                Note for {agentLabel} (optional)
              </label>
              <textarea
                id={`${baseId}-note`}
                className="zk-dc__textarea"
                rows={2}
                value={note}
                disabled={submitting}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Anything the agent should know while it proceeds…"
              />
              <div className="zk-dc__panel-actions">
                <button
                  type="button"
                  className="zk-dc__btn zk-dc__btn--approve"
                  onClick={() => void submit("approved", note)}
                  disabled={submitting}
                  aria-busy={submitting || undefined}
                >
                  {submitting ? "Submitting…" : `Confirm approval of v${proposalVersion}`}
                </button>
                <button
                  type="button"
                  className="zk-dc__btn zk-dc__btn--ghost"
                  onClick={closePanel}
                  disabled={submitting}
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : null}

          {panel === "changes" ? (
            <div className="zk-dc__panel">
              <p className="zk-dc__panel-title">Request changes to version {proposalVersion}</p>
              <label className="zk-dc__label" htmlFor={`${baseId}-changes`}>
                What should the agent change? (required)
              </label>
              <textarea
                id={`${baseId}-changes`}
                ref={changesRef}
                className="zk-dc__textarea"
                rows={3}
                value={changesText}
                disabled={submitting}
                aria-invalid={validationError && !changesText.trim() ? true : undefined}
                aria-describedby={validationError ? errId : undefined}
                onChange={(e) => {
                  setChangesText(e.target.value);
                  if (validationError) setValidationError(null);
                }}
                placeholder="e.g. Keep the inline error instead of redirecting, and add a retry link."
              />
              <p className="zk-dc__panel-help">
                {agentLabel} revises the plan and you review the new version — nothing
                is approved by this.
              </p>
              <div className="zk-dc__panel-actions">
                <button
                  type="button"
                  className="zk-dc__btn zk-dc__btn--changes"
                  onClick={() => void submit("changes_requested", changesText)}
                  disabled={submitting}
                  aria-busy={submitting || undefined}
                >
                  {submitting ? "Submitting…" : "Send change request"}
                </button>
                <button
                  type="button"
                  className="zk-dc__btn zk-dc__btn--ghost"
                  onClick={closePanel}
                  disabled={submitting}
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : null}

          {panel === "decline" ? (
            <div className="zk-dc__panel">
              <p className="zk-dc__panel-title">Decline version {proposalVersion}</p>
              <label className="zk-dc__label" htmlFor={`${baseId}-decline`}>
                Why are you declining? (required)
              </label>
              <textarea
                id={`${baseId}-decline`}
                ref={declineRef}
                className="zk-dc__textarea"
                rows={3}
                value={declineText}
                disabled={submitting}
                aria-invalid={validationError && !declineText.trim() ? true : undefined}
                aria-describedby={validationError ? errId : undefined}
                onChange={(e) => {
                  setDeclineText(e.target.value);
                  if (validationError) setValidationError(null);
                }}
                placeholder="e.g. This duplicates the fix in PR #1851 — close in favour of that one."
              />
              <div className="zk-dc__panel-actions">
                <button
                  type="button"
                  className="zk-dc__btn zk-dc__btn--decline"
                  onClick={() => void submit("declined", declineText)}
                  disabled={submitting}
                  aria-busy={submitting || undefined}
                >
                  {submitting ? "Submitting…" : "Confirm decline"}
                </button>
                <button
                  type="button"
                  className="zk-dc__btn zk-dc__btn--ghost"
                  onClick={closePanel}
                  disabled={submitting}
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : null}

          {(busy || disabled) && disabledReason ? (
            <p className="zk-dc__disabled-reason">
              <span className="zk-dc__dot zk-dc__dot--pending" aria-hidden="true" />
              {disabledReason}
            </p>
          ) : null}
        </>
      )}

      {history.length > 0 ? (
        <div className="zk-dc__history">
          <p className="zk-dc__history-title">
            {decided ? "Decision history" : "Earlier decisions"}
          </p>
          <ol className="zk-dc__history-list">
            {history.map((d) => (
              <li key={`${d.version}-${d.decision}-${d.time}`} className="zk-dc__history-item">
                <span className={`zk-dc__tag zk-dc__tag--${d.decision}`}>
                  {DECISION_LABEL[d.decision]} · v{d.version}
                </span>
                {d.feedback ? <span className="zk-dc__history-fb">“{d.feedback}”</span> : null}
                <span className="zk-dc__history-time">{d.time}</span>
              </li>
            ))}
          </ol>
        </div>
      ) : null}

      {validationError || submitError ? (
        <p className="zk-dc__error" id={errId}>
          {validationError ?? submitError}
        </p>
      ) : null}

      <p className="zk-sr-only" aria-live="polite">
        {liveMessage}
      </p>
    </section>
  );
}
