// Clarification panel — the agent's question, suggested answers, the human's
// composer, and the message thread. Workflow-owned: it emits answers upward
// and never mutates the store itself.
import { useEffect, useRef, useState } from "react";
import type { ThreadMessage } from "../../types";

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
  const threadRef = useRef<HTMLOListElement>(null);

  useEffect(() => {
    const el = threadRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [props.messages.length]);

  const submitTyped = () => {
    const trimmed = text.trim();
    if (!trimmed) return;
    props.onSubmitAnswer(null, trimmed);
    setText("");
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
    <section className="card clarify" aria-label="Clarification">
      <div className="card-head">
        <div>
          <p className="card-kicker">Clarification</p>
          <h2 className="card-title">Question from {props.agentName}</h2>
        </div>
        {pill}
      </div>

      <div className="question-box">
        <div className="question-label">
          <span aria-hidden="true">?</span> Clarification question
        </div>
        <p className="question-body">{props.questionBody}</p>
        <p className="question-context">{props.questionContext}</p>
        <p className="question-context" style={{ marginTop: 8, fontSize: 12.5 }}>
          <strong>Real Ziki behaviour:</strong> while this question is open, the agent’s
          claim clock is paused — if unanswered for 4h, the claim is released
          (“owner_unresponsive”).
        </p>
      </div>

      {props.awaitingAnswer ? (
        <>
          <p className="suggested-label">Suggested answers — or write your own:</p>
          <div className="suggested">
            {props.suggestedAnswers.map((answer) => (
              <button
                key={answer.id}
                type="button"
                className="suggested-btn"
                onClick={() => props.onSubmitAnswer(answer.id, answer.label)}
              >
                <span className="s-title">{answer.label}</span>
                <span className="s-blurb">{answer.blurb}</span>
              </button>
            ))}
          </div>

          <label className="composer-label" htmlFor="clarification-input">
            Your answer (free text)
          </label>
          <textarea
            id="clarification-input"
            data-testid="clarification-input"
            className="answer-input"
            placeholder="Type your answer for the agent…"
            value={text}
            onChange={(e) => setText(e.target.value)}
          />
          <div className="composer-actions">
            <button
              type="button"
              data-testid="clarification-submit"
              className="btn btn-primary btn-sm"
              disabled={!text.trim()}
              onClick={submitTyped}
            >
              Post answer
            </button>
          </div>
        </>
      ) : (
        <p className="answered-note">
          <span aria-hidden="true">✓</span>
          {props.working
            ? "Answer sent — the agent is preparing an updated plan."
            : "Your answer was incorporated into the plan."}
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
