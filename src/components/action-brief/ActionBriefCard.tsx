// Agent Action Brief — presentation of the agent's proposal (UI agent).
//
// Presentational only: consumes the frozen props App.tsx already passes plus
// `src/types.ts` / `src/lib/statusMeta.ts`. It mutates nothing, decides nothing,
// and renders no fake data — optional fields (confidence, SLA deadline) appear
// only when the caller supplies them.
//
// Styling: scoped `.zk-brief` rules in `actionBriefCard.css`, mapped 1:1 onto
// LEAD's `src/styles/tokens.css` variables (no forked token set).
import { useEffect, useId, useRef, useState } from "react";
import type { CSSProperties } from "react";
import type { PlanVersion, RequestStatus } from "../../types";
import { statusMeta } from "../../lib/statusMeta";
import "./actionBriefCard.css";

/* ------------------------------------------------------------------ *
 * Props contract (App.tsx passes the first block; the rest optional)  *
 * ------------------------------------------------------------------ */

export interface BriefIssue {
  number: number;
  title: string;
  votes: number;
  type: string;
  priority: string;
  status: string;
  reported: string;
  comments: number;
}

/**
 * Evidence accepts the plain strings currently in `src/data/scenario.ts`, or
 * structured items carrying a trust level so fact / reported claim / assumption
 * can be distinguished (the format LEAD needs to adopt in scenario data).
 */
export type EvidenceInput =
  | string
  | { text: string; kind?: "fact" | "reported" | "assumption"; sourceLabel?: string };

export type RiskInput =
  | string
  | { title: string; severity?: "low" | "medium" | "high"; detail?: string; mitigation?: string };

export interface ActionBriefCardProps {
  status: RequestStatus;
  /** True while the agent is actively revising (transient phase). */
  working?: boolean;
  agentName: string;
  agentLevel: string;
  agentEmoji: string;
  issue: BriefIssue;
  intention: string;
  evidence: EvidenceInput[];
  risks: RiskInput[];
  uncertainties: string[];
  estimate: string;
  plans: PlanVersion[];
  /** Honest-confidence chip (0–100) + plain-language reason, when known. */
  confidence?: number;
  confidenceReason?: string;
  /** SLA chip copy; defaults to Ziki's verified 4h owner-unresponsive rule. */
  deadlineLabel?: string;
  deadlineNote?: string;
  className?: string;
}

/* ------------------------------------------------------------------ *
 * Helpers (pure presentation)                                        *
 * ------------------------------------------------------------------ */

function cx(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(" ");
}

type Tone = "amber" | "blue" | "green" | "red" | "neutral";

function priorityTone(value: string): Tone {
  const v = value.toLowerCase();
  if (["critical", "high", "blocker", "urgent"].some((k) => v.includes(k))) return "red";
  if (v.includes("medium")) return "amber";
  return "neutral";
}

function issueStatusTone(value: string): Tone {
  const v = value.toLowerCase();
  if (["done", "live", "ready", "resolved", "merged"].some((k) => v.includes(k))) return "green";
  if (["in progress", "open", "review"].some((k) => v.includes(k))) return "blue";
  if (["blocked", "failed"].some((k) => v.includes(k))) return "red";
  return "neutral";
}

const KIND_LABEL: Record<string, string> = {
  fact: "Fact",
  reported: "Reported",
  assumption: "Assumption",
};

function normEvidence(item: EvidenceInput): { text: string; kind?: "fact" | "reported" | "assumption"; sourceLabel?: string } {
  return typeof item === "string" ? { text: item } : item;
}

function normRisk(item: RiskInput): {
  title: string;
  severity?: "low" | "medium" | "high";
  detail?: string;
  mitigation?: string;
} {
  return typeof item === "string" ? { title: item } : item;
}

/**
 * Long body text: clamped with a keyboard-accessible Show more/less toggle,
 * left fully visible when it does not overflow.
 */
function ClampedText({ text, id, maxLines = 6 }: { text: string; id: string; maxLines?: number }) {
  const boxRef = useRef<HTMLParagraphElement | null>(null);
  const [overflowing, setOverflowing] = useState(false);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    const el = boxRef.current;
    if (!el || expanded) return;
    const measure = () => setOverflowing(el.scrollHeight > el.clientHeight + 4);
    measure();
    window.addEventListener("resize", measure);
    let cancelled = false;
    if (typeof document !== "undefined" && "fonts" in document) {
      document.fonts.ready
        .then(() => {
          if (!cancelled) requestAnimationFrame(measure);
        })
        .catch(() => undefined);
    }
    return () => {
      cancelled = true;
      window.removeEventListener("resize", measure);
    };
  }, [expanded, text]);

  return (
    <>
      <p
        ref={boxRef}
        id={id}
        className={cx("zk-brief__clamp", expanded && "is-open")}
        style={{ "--zk-brief-clamp-lines": maxLines } as CSSProperties}
      >
        {text}
      </p>
      {overflowing && (
        <button
          type="button"
          className="zk-brief__clamp-toggle"
          aria-expanded={expanded}
          aria-controls={id}
          onClick={() => setExpanded((value) => !value)}
        >
          {expanded ? "Show less" : "Show more"}
        </button>
      )}
    </>
  );
}

/* ------------------------------------------------------------------ *
 * Card                                                                *
 * ------------------------------------------------------------------ */

export default function ActionBriefCard(props: ActionBriefCardProps) {
  const {
    status,
    working,
    agentName,
    agentLevel,
    agentEmoji,
    issue,
    intention,
    uncertainties,
    estimate,
    plans,
    confidence,
    confidenceReason,
    deadlineLabel,
    deadlineNote,
    className,
  } = props;

  const uid = useId();
  const at = (suffix: string) => `${uid}${suffix}`;

  const meta = statusMeta(status, working ?? false);
  const current = plans[plans.length - 1];
  const previous = plans.slice(0, -1);
  const version = current?.version ?? 1;
  const isRevised = version > 1;

  const evidence = props.evidence.map(normEvidence);
  const risks = props.risks.map(normRisk);

  const waiting = status !== "approved" && status !== "declined";
  const deadline = waiting ? deadlineLabel ?? "Answer within 4h" : undefined;
  const deadlineFinePrint = waiting
    ? deadlineNote ?? "The claim is released if it goes unanswered — waiting never approves anything."
    : undefined;

  const hasFacts = Boolean(deadline || confidence !== undefined);

  return (
    <section
      className={cx("zk-brief", className)}
      aria-labelledby={at("title")}
      data-testid="brief"
      data-version={version}
      data-status={status}
    >
      {/* ---- header: what + state ---- */}
      <div className="zk-brief__head">
        <div className="zk-brief__headings">
          <p className="zk-brief__kicker">Agent action brief</p>
          <h2 className="zk-brief__title" id={at("title")}>
            Proposed fix for issue #{issue.number}
          </h2>
        </div>
        <div className="zk-brief__statusline" role="status">
          <span className={cx("zk-brief__status", `is-${meta.tone}`)}>
            <span className="zk-brief__dot" aria-hidden="true">
              ●
            </span>
            {meta.label}
          </span>
          <span className="zk-brief__version" data-testid="brief-version" data-version={version}>
            v{version}
            {isRevised && (
              <span className="zk-brief__revised" data-testid="brief-revised-badge">
                {" "}
                · revised
              </span>
            )}
          </span>
        </div>
      </div>

      {/* ---- SLA + confidence (only when known / still waiting) ---- */}
      {hasFacts && (
        <div className="zk-brief__facts-wrap">
          <div className="zk-brief__facts">
            {deadline && (
              <span className="zk-brief__fact is-deadline" data-testid="brief-deadline">
                <svg viewBox="0 0 16 16" aria-hidden="true" focusable="false">
                  <circle cx="8" cy="8" r="6.25" fill="none" stroke="currentColor" strokeWidth="1.5" />
                  <path d="M8 4.5V8l2.4 1.6" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                </svg>
                {deadline}
              </span>
            )}
            {confidence !== undefined && (
              <span className="zk-brief__fact" data-testid="brief-confidence">
                Confidence · {confidence}
              </span>
            )}
          </div>
          {deadlineFinePrint && <p className="zk-brief__fineprint">{deadlineFinePrint}</p>}
          {confidenceReason && (
            <p className="zk-brief__fineprint">Confidence reason: {confidenceReason}</p>
          )}
        </div>
      )}

      {/* ---- agent identity ---- */}
      <div className="zk-brief__agent-row">
        <span className="zk-brief__avatar" aria-hidden="true">
          {agentEmoji}
        </span>
        <div className="zk-brief__identity">
          <p className="zk-brief__agent-name">{agentName}</p>
          <p className="zk-brief__agent-sub">AI agent · {agentLevel} level</p>
        </div>
        {estimate && (
          <span className="zk-brief__estimate" data-testid="brief-estimate">
            {estimate} estimate
          </span>
        )}
      </div>

      {/* ---- linked issue ---- */}
      <div className="zk-brief__issue-block">
        <p className="zk-brief__issue-num">
          #{issue.number} · {issue.type} · {issue.votes} votes
        </p>
        <p className="zk-brief__issue-title">{issue.title}</p>
        <div className="zk-brief__issue-meta">
          <span className={cx("zk-brief__pill", `is-${priorityTone(issue.priority)}`)}>
            <span className="zk-brief__dot" aria-hidden="true">
              ●
            </span>
            {issue.priority}
          </span>
          <span className={cx("zk-brief__pill", `is-${issueStatusTone(issue.status)}`)}>
            <span className="zk-brief__dot" aria-hidden="true">
              ●
            </span>
            {issue.status}
          </span>
          <span className="zk-brief__chip">{issue.comments} comments</span>
          <span className="zk-brief__chip">Reported {issue.reported}</span>
        </div>
      </div>

      {/* ---- intention ---- */}
      <div className="zk-brief__section" aria-labelledby={at("intention")}>
        <h3 className="zk-brief__section-title" id={at("intention")}>
          What I intend to do
        </h3>
        <ClampedText text={intention} id={at("intention-body")} />
      </div>

      {/* ---- evidence (+ trust levels when the data carries them) ---- */}
      {evidence.length > 0 && (
        <div className="zk-brief__section" aria-labelledby={at("evidence")}>
          <h3 className="zk-brief__section-title" id={at("evidence")}>
            Evidence
          </h3>
          {evidence.some((item) => item.kind) && (
            <p className="zk-brief__section-hint">
              Facts are verified by the agent; reported claims are unverified statements from
              others; assumptions are the agent’s working guesses.
            </p>
          )}
          <ul className="zk-brief__evidence" data-testid="brief-evidence">
            {evidence.map((item, index) => (
              <li
                className={cx("zk-brief__evidence-item", item.kind && `is-${item.kind}`)}
                key={`${index}-${item.text.slice(0, 24)}`}
              >
                {item.kind && <span className="zk-brief__badge">{KIND_LABEL[item.kind]}</span>}
                <div className="zk-brief__evidence-body">
                  <p className={item.kind === "assumption" ? "is-italic" : undefined}>{item.text}</p>
                  {item.sourceLabel && <p className="zk-brief__source">{item.sourceLabel}</p>}
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* ---- plan: current version + what changed + superseded history ---- */}
      <div className="zk-brief__section" aria-labelledby={at("plan")}>
        <h3 className="zk-brief__section-title" id={at("plan")}>
          Proposed plan
        </h3>

        {isRevised && (
          <div className="zk-brief__changes" data-testid="brief-changes">
            <p className="zk-brief__changes-title">What changed in v{version}</p>
            <p className="zk-brief__changes-summary">{current.summary}</p>
            <p className="zk-brief__changes-meta">
              Supersedes v{version - 1}
              {current.time ? ` · revised ${current.time}` : ""}
            </p>
          </div>
        )}

        <ol className="zk-brief__plan" data-testid="brief-plan">
          {current.steps.map((step, index) => (
            <li className={cx("zk-brief__step", step.changed && isRevised && "is-changed")} key={step.id}>
              <span className="zk-brief__step-num" aria-hidden="true">
                {index + 1}
              </span>
              <div className="zk-brief__step-body">
                <p className="zk-brief__step-text">{step.text}</p>
                {step.changed && isRevised && (
                  <span className="zk-brief__badge is-changed">changed in v{version}</span>
                )}
              </div>
            </li>
          ))}
        </ol>

        {previous.length > 0 && (
          <details className="zk-brief__details">
            <summary className="zk-brief__summary">
              <span>
                Previous plan version{previous.length > 1 ? "s" : ""} ({previous.length}{" "}
                superseded)
              </span>
              <span className="zk-brief__chevron" aria-hidden="true" />
            </summary>
            <div className="zk-brief__old-versions">
              {previous.map((plan) => (
                <div className="zk-brief__old-version" key={plan.version}>
                  <p className="zk-brief__old-head">
                    Plan v{plan.version} · superseded{plan.time ? ` · ${plan.time}` : ""}
                  </p>
                  <ol className="zk-brief__old-steps">
                    {plan.steps.map((step) => (
                      <li key={step.id}>{step.text}</li>
                    ))}
                  </ol>
                </div>
              ))}
            </div>
          </details>
        )}
      </div>

      {/* ---- risks ---- */}
      {risks.length > 0 && (
        <div className="zk-brief__section" aria-labelledby={at("risks")}>
          <h3 className="zk-brief__section-title" id={at("risks")}>
            Risks
          </h3>
          <ul className="zk-brief__risks" data-testid="brief-risks">
            {risks.map((risk, index) => (
              <li
                className={cx("zk-brief__risk", `is-${risk.severity ?? "neutral"}`)}
                key={`${index}-${risk.title.slice(0, 24)}`}
              >
                {risk.severity && (
                  <span className="zk-brief__severity">{risk.severity}</span>
                )}
                <div className="zk-brief__risk-body">
                  <p className="zk-brief__risk-title">{risk.title}</p>
                  {risk.detail && <p className="zk-brief__risk-detail">{risk.detail}</p>}
                  {risk.mitigation && (
                    <p className="zk-brief__mitigation">Mitigation: {risk.mitigation}</p>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* ---- uncertainties (why the agent is asking) ---- */}
      {uncertainties.length > 0 && (
        <div className="zk-brief__section" aria-labelledby={at("uncertainties")}>
          <h3 className="zk-brief__section-title" id={at("uncertainties")}>
            Uncertainties — why I’m asking
          </h3>
          <p className="zk-brief__section-hint">
            Stated by the agent as not yet settled — treat these as open questions, not as facts.
          </p>
          <ul className="zk-brief__uncertainties" data-testid="brief-uncertainties">
            {uncertainties.map((item, index) => (
              <li key={`${index}-${item.slice(0, 24)}`}>{item}</li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
