// Decision panel — status banner + Approve / Request changes / Decline.
// All callbacks fire upward; the panel never touches the store directly.
// Request-changes and Decline both REQUIRE a reason (anti-rubber-stamp paths).
import { useState } from "react";
import type { DecisionRecord, RequestStatus } from "../../types";
import "./decision.css";

export interface DecisionPanelProps {
  status: RequestStatus;
  working: boolean;
  currentVersion: number;
  decisions: DecisionRecord[];
  agentName: string;
  issueNumber: number;
  onApprove: () => void;
  onDecline: (reason: string) => void;
  onRequestChanges: (feedback: string) => void;
}

type Mode = "idle" | "feedback" | "confirm";

interface BannerContent {
  tone: "amber" | "blue" | "green" | "red";
  icon: string;
  pulse?: boolean;
  title: string;
  body: string;
}

export default function DecisionPanel(props: DecisionPanelProps) {
  const [mode, setMode] = useState<Mode>("idle");
  const [feedback, setFeedback] = useState("");
  const [declineReason, setDeclineReason] = useState("");

  const { status, working, currentVersion, decisions, agentName, issueNumber } = props;
  const lastDecision = decisions[decisions.length - 1];

  const banner: BannerContent = (() => {
    switch (status) {
      case "awaiting_review":
        return {
          tone: "amber",
          icon: "●",
          title: "Waiting on you",
          body: `${agentName} is waiting for your review of the brief.`,
        };
      case "in_clarification":
        return working
          ? {
              tone: "blue",
              icon: "●",
              pulse: true,
              title: `${agentName} is revising the plan…`,
              body: "Incorporating your clarification into an updated plan version.",
            }
          : {
              tone: "amber",
              icon: "●",
              title: "Waiting on your answer",
              body: `${agentName} paused its plan instead of guessing. It won't touch the code until you answer.`,
            };
      case "revised_awaiting_review":
        return {
          tone: "blue",
          icon: "●",
          title: `Plan v${currentVersion} is ready for your decision`,
          body: "Review the highlighted changes in the brief, then approve, request more changes, or decline. Decisions apply to this version only.",
        };
      case "changes_requested":
        return {
          tone: "blue",
          icon: "●",
          pulse: true,
          title: `You requested changes on plan v${currentVersion}`,
          body: `Your feedback is being folded into the next plan version.`,
        };
      case "approved":
        return {
          tone: "green",
          icon: "✓",
          title: `Approved — plan v${currentVersion} authorized`,
          body: `${agentName} may now start work on issue #${issueNumber}. Approval authorizes the work; it is not completion. The issue stays open until the fix is delivered and independently verified.`,
        };
      case "declined":
        return {
          tone: "red",
          icon: "✕",
          title: `Declined — plan v${currentVersion} rejected`,
          body: `${agentName} will not act on issue #${issueNumber}. The issue stays open for a different approach${
            lastDecision?.feedback ? `. Your reason: “${lastDecision.feedback}”` : "."
          }`,
        };
    }
  })();

  const cancel = () => {
    setMode("idle");
    setFeedback("");
    setDeclineReason("");
  };

  const sendFeedback = () => {
    const trimmed = feedback.trim();
    if (!trimmed) return;
    props.onRequestChanges(trimmed);
    cancel();
  };

  return (
    <section className="card decide" aria-label="Your decision" data-testid="decision-group">
      <div className="card-head">
        <div>
          <p className="card-kicker">Decision</p>
          <h2 className="card-title">Your call</h2>
        </div>
      </div>

      <div aria-live="polite" data-testid="live-region">
        <div className={`banner banner-${banner.tone}`} data-testid="decision-status">
          <span className={`b-dot${banner.pulse ? " dot-pulse" : ""}`} aria-hidden="true">
            {banner.icon}
          </span>
          <div>
            <strong>{banner.title}</strong>
            {banner.body}
          </div>
        </div>

        {status === "revised_awaiting_review" && (
          <>
            {/* Each action carries its plain-language consequence right under
                the button, so the effect of the click is never a surprise.
                Also wired to screen readers via aria-describedby. */}
            <div className="decision-controls zk-dp__controls">
              <div className="zk-dp__action">
                <button
                  type="button"
                  className="btn btn-primary"
                  data-testid="decision-approve"
                  aria-describedby="zk-dp-approve-note"
                  onClick={props.onApprove}
                >
                  <span aria-hidden="true">✓</span> Approve plan
                </button>
                <p
                  className="zk-dp__consequence"
                  id="zk-dp-approve-note"
                  data-testid="decision-consequence-approve"
                >
                  Authorize the agent to start work on issue #{issueNumber} (approval is not
                  completion)
                </p>
              </div>
              <div className="zk-dp__action">
                <button
                  type="button"
                  className="btn btn-outline"
                  data-testid="decision-changes"
                  aria-describedby="zk-dp-changes-note"
                  onClick={() => setMode("feedback")}
                >
                  Request changes
                </button>
                <p
                  className="zk-dp__consequence"
                  id="zk-dp-changes-note"
                  data-testid="decision-consequence-changes"
                >
                  Tell the agent what to fix — it will revise again
                </p>
              </div>
              <div className="zk-dp__action">
                <button
                  type="button"
                  className="btn btn-danger"
                  data-testid="decision-decline"
                  aria-describedby="zk-dp-decline-note"
                  onClick={() => setMode("confirm")}
                >
                  Decline
                </button>
                <p
                  className="zk-dp__consequence"
                  id="zk-dp-decline-note"
                  data-testid="decision-consequence-decline"
                >
                  Stop this request — a short reason is required
                </p>
              </div>
            </div>
            <p className="decision-hint">
              You’re deciding on plan v{currentVersion}. Requesting changes sends it back to{" "}
              {agentName} for a new, versioned revision.
            </p>
          </>
        )}

        {status === "revised_awaiting_review" && mode === "feedback" && (
          <div className="feedback-form">
            <label className="composer-label" htmlFor="decision-feedback">
              What should change in plan v{currentVersion}? (required)
            </label>
            <textarea
              id="decision-feedback"
              data-testid="decision-feedback"
              className="answer-input"
              placeholder="e.g. Keep the retry link, but also log a metric when this fires."
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
              autoFocus
            />
            <div className="form-actions">
              <button
                type="button"
                className="btn btn-outline btn-sm"
                data-testid="decision-cancel"
                onClick={cancel}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-primary btn-sm"
                data-testid="decision-submit"
                disabled={!feedback.trim()}
                onClick={sendFeedback}
              >
                Send feedback
              </button>
            </div>
          </div>
        )}

        {status === "revised_awaiting_review" && mode === "confirm" && (
          <div className="confirm-box">
            <p>
              Decline plan v{currentVersion}? {agentName} stops here and issue #{issueNumber}{" "}
              stays open. A reason is required — the agent learns from it.
            </p>
            <label className="composer-label" htmlFor="decline-reason">
              Why are you declining? (required)
            </label>
            <textarea
              id="decline-reason"
              className="answer-input"
              placeholder="e.g. We’ll handle this one manually — the fix touches billing code."
              value={declineReason}
              onChange={(e) => setDeclineReason(e.target.value)}
              autoFocus
            />
            <div className="form-actions">
              <button
                type="button"
                className="btn btn-outline btn-sm"
                data-testid="decision-cancel"
                onClick={cancel}
              >
                Keep reviewing
              </button>
              <button
                type="button"
                className="btn btn-danger-solid btn-sm"
                data-testid="decision-submit"
                disabled={!declineReason.trim()}
                onClick={() => {
                  props.onDecline(declineReason.trim());
                  cancel();
                }}
              >
                Yes, decline plan
              </button>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
