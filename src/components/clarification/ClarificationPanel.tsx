// Clarification panel — the agent's question, the human's choice of what should
// happen next, the free-text fallback, and the message thread.
// Workflow-owned: it emits answers upward and never mutates the store itself.
//
// The answer area is deliberately segmented: a "pick one" radio group for the
// agent's suggested next steps (select, then send), separated from the
// write-your-own composer. Selection and typed text are mutually exclusive so
// there is never ambiguity about what will be sent.
//
// Interactivity: keyboard shortcuts — press 1–9 to pick a numbered option,
// Ctrl/⌘+Enter to send from anywhere (including the textarea); the digit path
// is guarded so it can never fire while someone is typing in a field.
//
// Magic: picking an option bursts sparkles, sets a breathing aura on the
// segment, and draws a glowing beam from the pick to the Send button (which
// arms with a spring pop + light sweep). All decorative layers are
// pointer-events:none/aria-hidden and are disabled under reduced motion.
import { useEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";
import type { ThreadMessage } from "../../types";
import "./clarification.css";

interface SuggestedAnswer {
  id: string;
  label: string;
  blurb: string;
}

export interface ClarificationPanelProps {
  /** True while the question is still open for the human to answer. */
  awaitingAnswer: boolean;
  /** True while the simulated agent is preparing the next plan version. */
  working: boolean;
  questionBody: string;
  questionContext: string;
  suggestedAnswers: SuggestedAnswer[];
  messages: ThreadMessage[];
  agentName: string;
  onSubmitAnswer: (answerId: string | null, text: string) => void;
}

/** Geometry of the pick→send beam, measured relative to the answer zone. */
interface Beam {
  x: number;
  y: number;
  len: number;
  ang: number;
}

export default function ClarificationPanel(props: ClarificationPanelProps) {
  const [text, setText] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [beam, setBeam] = useState<Beam | null>(null);
  const threadRef = useRef<HTMLOListElement>(null);
  const answerRef = useRef<HTMLDivElement | null>(null);
  const submitRef = useRef<HTMLButtonElement | null>(null);
  const optionRefs = useRef<Record<string, HTMLLabelElement | null>>({});

  useEffect(() => {
    const el = threadRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [props.messages.length]);

  // Magic link: a glowing streak draws from the picked option to the armed
  // Send button so cause → effect is literally connected. Measured in
  // viewport coords relative to the zone (page scroll cancels out); purely
  // decorative and transient; skipped entirely for reduced motion.
  useEffect(() => {
    if (!selectedId) {
      setBeam(null);
      return;
    }
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const zone = answerRef.current;
    const opt = optionRefs.current[selectedId];
    const btn = submitRef.current;
    if (!zone || !opt || !btn) return;
    const z = zone.getBoundingClientRect();
    const o = opt.getBoundingClientRect();
    const b = btn.getBoundingClientRect();
    const x1 = o.left - z.left + 18; // just under the radio dot
    const y1 = o.bottom - z.top - 6;
    const x2 = b.left - z.left + b.width / 2;
    const y2 = b.top - z.top;
    const dx = x2 - x1;
    const dy = y2 - y1;
    const len = Math.hypot(dx, dy);
    if (len < 40) {
      setBeam(null);
      return;
    }
    setBeam({ x: x1, y: y1, len, ang: (Math.atan2(dy, dx) * 180) / Math.PI });
    const t = window.setTimeout(() => setBeam(null), 1250);
    return () => window.clearTimeout(t);
  }, [selectedId]);

  const canSend = Boolean(selectedId) || text.trim().length > 0;

  // Picking a segment and writing your own answer are separate paths:
  // choosing one clears the other, so the send button always does exactly
  // what the screen says it will.
  const pickOption = (id: string) => {
    setSelectedId(id);
    setText("");
  };

  const onTextChange = (value: string) => {
    setText(value);
    if (value.trim()) setSelectedId(null);
  };

  const send = () => {
    const trimmed = text.trim();
    if (trimmed) {
      props.onSubmitAnswer(null, trimmed); // typed answer wins if both exist
    } else if (selectedId) {
      const option = props.suggestedAnswers.find((a) => a.id === selectedId);
      if (option) props.onSubmitAnswer(option.id, option.label);
    }
    setText("");
    setSelectedId(null);
  };

  // Latest-render ref so the window listener is registered once but always
  // calls the current closures (no stale state, no re-binding churn).
  const keyHandler = useRef<(e: KeyboardEvent) => void>(() => undefined);
  keyHandler.current = (e: KeyboardEvent) => {
    // Ctrl/⌘+Enter sends from anywhere — standard composer expectation.
    if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
      if (canSend && props.awaitingAnswer) {
        e.preventDefault();
        send();
      }
      return;
    }
    // Number keys pick an option — but never while a field has focus, so
    // typing digits into the textarea keeps meaning "type a digit".
    const t = e.target as HTMLElement | null;
    const inField =
      !!t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.isContentEditable);
    if (inField || !props.awaitingAnswer || props.suggestedAnswers.length === 0) return;
    const n = Number.parseInt(e.key, 10);
    if (Number.isNaN(n) || n < 1 || n > props.suggestedAnswers.length) return;
    const option = props.suggestedAnswers[n - 1];
    if (option) {
      e.preventDefault();
      pickOption(option.id);
    }
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => keyHandler.current(e);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const pill = props.awaitingAnswer ? (
    <span className="pill pill-amber">
      <span className="dot" aria-hidden="true">
        ●
      </span>
      Waiting on you
    </span>
  ) : (
    <span className="pill pill-green">
      <span className="dot" aria-hidden="true">
        ●
      </span>
      {props.working ? "Answered · agent revising" : "Answered · incorporated"}
    </span>
  );

  return (
    <section className="card clarify zk-cp" aria-label="Clarification">
      <div className="card-head">
        <div>
          <p className="card-kicker">Clarification</p>
          <h2 className="card-title">Question from {props.agentName}</h2>
        </div>
        {pill}
      </div>

      {/* The ask itself — made visually dominant so the idea is obvious. */}
      <div className="question-box">
        <div className="question-label">
          <span aria-hidden="true">?</span> Clarification question
        </div>
        <p className="question-body">{props.questionBody}</p>
        <p className="question-context">{props.questionContext}</p>
        <p className="question-context zk-cp__clock">
          <strong>Real Ziki behaviour:</strong> while this question is open, the agent’s
          claim clock is paused — if unanswered for 4h, the claim is released
          (“owner_unresponsive”).
        </p>
      </div>

      {props.awaitingAnswer ? (
        <div className="zk-cp__answer" ref={answerRef} data-testid="answer-zone">
          {props.suggestedAnswers.length > 0 ? (
            <fieldset className="zk-cp__choices">
              <legend className="zk-cp__legend">
                What should happen next?
                <span className="zk-cp__legend-hint">
                  Pick one — the agent rebuilds the plan around your choice.
                </span>
              </legend>
              <div className="zk-cp__segments">
                {props.suggestedAnswers.map((answer, index) => (
                  <label
                    key={answer.id}
                    ref={(el) => {
                      optionRefs.current[answer.id] = el;
                    }}
                    className="suggested-btn zk-cp__option"
                    data-testid={`suggested-option-${answer.id}`}
                    data-selected={selectedId === answer.id ? "true" : undefined}
                  >
                    <input
                      type="radio"
                      className="zk-cp__radio"
                      name="zk-cp-next-step"
                      value={answer.id}
                      checked={selectedId === answer.id}
                      onChange={() => pickOption(answer.id)}
                    />
                    <span className="zk-cp__radio-dot" aria-hidden="true" />
                    <span className="zk-cp__option-text">
                      <span className="s-title">
                        <kbd className="zk-cp__key" aria-hidden="true">
                          {index + 1}
                        </kbd>
                        {answer.label}
                      </span>
                      <span className="s-blurb">{answer.blurb}</span>
                    </span>
                    <span className="zk-cp__check" aria-hidden="true">
                      ✓
                    </span>
                    {/* Sparkle burst — mounts fresh per pick so it replays. */}
                    {selectedId === answer.id ? (
                      <span className="zk-cp__sparkles" aria-hidden="true">
                        {[0, 45, 90, 135, 180, 225, 270, 315].map((a) => (
                          <span
                            key={a}
                            className="zk-cp__spark"
                            style={{ "--a": `${a}deg` } as CSSProperties}
                          />
                        ))}
                      </span>
                    ) : null}
                  </label>
                ))}
              </div>
            </fieldset>
          ) : null}

          <p className="zk-cp__or">
            <span>or write your own answer</span>
          </p>

          <label className="composer-label" htmlFor="clarification-input">
            Your answer (free text)
          </label>
          <textarea
            id="clarification-input"
            data-testid="clarification-input"
            className="answer-input"
            placeholder="Type your answer for the agent…"
            value={text}
            onChange={(e) => onTextChange(e.target.value)}
            aria-describedby={
              canSend
                ? props.suggestedAnswers.length > 0
                  ? "zk-cp-kbd-tip"
                  : undefined
                : "zk-cp-send-hint"
            }
          />
          <div className="composer-actions">
            {/* key remounts the button per pick so the "armed" animation
                replays every time a different next step is chosen */}
            <button
              key={selectedId ?? (text.trim() ? "text" : "idle")}
              ref={submitRef}
              type="button"
              data-testid="clarification-submit"
              className={`btn btn-primary btn-sm zk-cp__submit${
                selectedId ? " is-armed" : text.trim() ? " is-ready" : ""
              }`}
              disabled={!canSend}
              aria-describedby={canSend ? undefined : "zk-cp-send-hint"}
              onClick={send}
            >
              {selectedId ? "Send this answer" : "Send answer"}
              {selectedId ? (
                <span className="zk-cp__send-arrow" aria-hidden="true">
                  →
                </span>
              ) : null}
            </button>
          </div>
          {/* A disabled Send with no explanation feels broken; say exactly
              what turns it on. Rendered only while disabled so the hint and
              its aria-describedby targets always stay in sync. */}
          {canSend ? null : (
            <p
              className="zk-cp__send-hint"
              id="zk-cp-send-hint"
              data-testid="clarification-send-hint"
            >
              {props.suggestedAnswers.length > 0
                ? "Choose an option above, or type your own answer — Send turns on as soon as you do."
                : "Type your answer — Send turns on as soon as you do."}
            </p>
          )}
          {/* Always-on shortcut legend so the keyboard path is discoverable. */}
          {props.suggestedAnswers.length > 0 ? (
            <p className="zk-cp__kbd-tip" id="zk-cp-kbd-tip" data-testid="clarification-kbd-tip">
              Shortcut: press <kbd>1</kbd>–<kbd>{props.suggestedAnswers.length}</kbd> to pick an
              option · <kbd>Ctrl</kbd>+<kbd>Enter</kbd> to send
            </p>
          ) : null}
          {/* The pick→send beam (position measured in the effect above). */}
          {beam ? (
            <span
              className="zk-cp__beam"
              aria-hidden="true"
              style={
                {
                  left: beam.x,
                  top: beam.y,
                  height: beam.len,
                  "--ang": `${beam.ang}deg`,
                  "--len": `${beam.len}px`,
                } as CSSProperties
              }
            />
          ) : null}
        </div>
      ) : (
        <p className="answered-note">
          <span aria-hidden="true">✓</span>
          {props.working ? "Answer sent — the agent is updating the plan (simulated, ~2 seconds)" : "Answer sent — your answer was incorporated into the plan."}
          {/* Three bouncing dots say "working" without a spinner dependency;
              hidden from AT (the sentence above already conveys it). */}
          {props.working ? (
            <span className="zk-cp__thinking" aria-hidden="true">
              <span />
              <span />
              <span />
            </span>
          ) : null}
        </p>
      )}

      <ol
        className="thread"
        ref={threadRef}
        data-testid="clarification-thread"
        aria-label="Clarification conversation"
      >
        {props.messages.map((msg) => (
          <li key={msg.id} className={`msg msg-${msg.author}`} data-testid="message" data-author={msg.author}>
            <span className="msg-author">
              {msg.author === "agent" ? props.agentName : "You"} · {msg.time}
            </span>
            <div className="msg-body">{msg.body}</div>
          </li>
        ))}
      </ol>
    </section>
  );
}
