// Clarification panel — the agent's question, the human's choice of what should
// happen next, the free-text fallback, and the message thread.
// Workflow-owned: it emits answers upward and never mutates the store itself.
//
// The answer area is deliberately segmented: a "pick one" radio group for the
// agent's suggested next steps (select, then send), separated from the
// write-your-own composer. Selection and typed text are mutually exclusive so
// there is never ambiguity about what will be sent.
import { useEffect, useRef, useState } from "react";
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

export default function ClarificationPanel(props: ClarificationPanelProps) {
  const [text, setText] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const threadRef = useRef<HTMLOListElement>(null);

  useEffect(() => {
    const el = threadRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [props.messages.length]);

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
        <div className="zk-cp__answer" data-testid="answer-zone">
          {props.suggestedAnswers.length > 0 ? (
            <fieldset className="zk-cp__choices">
              <legend className="zk-cp__legend">
                What should happen next?
                <span className="zk-cp__legend-hint">
                  Pick one — the agent rebuilds the plan around your choice.
                </span>
              </legend>
              <div className="zk-cp__segments">
                {props.suggestedAnswers.map((answer) => (
                  <label
                    key={answer.id}
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
                      <span className="s-title">{answer.label}</span>
                      <span className="s-blurb">{answer.blurb}</span>
                    </span>
                    <span className="zk-cp__check" aria-hidden="true">
                      ✓
                    </span>
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
            aria-describedby={canSend ? undefined : "zk-cp-send-hint"}
          />
          <div className="composer-actions">
            <button
              type="button"
              data-testid="clarification-submit"
              className="btn btn-primary btn-sm"
              disabled={!canSend}
              aria-describedby={canSend ? undefined : "zk-cp-send-hint"}
              onClick={send}
            >
              {selectedId ? "Send this answer" : "Send answer"}
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
        </div>
      ) : (
        <p className="answered-note">
          <span aria-hidden="true">✓</span>
          {props.working
            ? "Answer sent — the agent is updating the plan (simulated, ~2 seconds)."
            : "Answer sent — your answer was incorporated into the plan."}
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
