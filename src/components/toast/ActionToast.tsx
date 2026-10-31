// ActionToast — ephemeral snackbar confirming the human's last move and the
// agent's reply. Mounted via TopNav (like GuidePanel); reads the shared
// request state and diffs it against the previous render, so there is no
// duplicated state and no invented data — it only narrates real transitions.
//
// QA/UX safety: pointer-events: none (it can never intercept a page click),
// auto-dismisses, and role="status" announces politely to screen readers.
import { useEffect, useRef, useState } from "react";
import { useRequestState } from "../../store/RequestProvider";
import "./actionToast.css";

export default function ActionToast() {
  const state = useRequestState();
  const [toast, setToast] = useState<string | null>(null);
  const prev = useRef({
    status: state.status,
    messages: state.messages.length,
    plans: state.plans.length,
  });
  const timer = useRef<number | null>(null);

  useEffect(() => {
    const p = prev.current;
    const latestVersion = state.plans[state.plans.length - 1]?.version;
    let text: string | null = null;

    if (state.status !== p.status) {
      if (state.status === "approved") {
        text = "Approved — the agent may start work now (approval is not completion).";
      } else if (state.status === "declined") {
        text = "Request declined — your reason was recorded.";
      } else if (state.status === "revised_awaiting_review" && latestVersion) {
        text = `Plan v${latestVersion} ready — review what changed, then decide.`;
      } else if (state.status === "in_clarification" && state.messages.length > p.messages) {
        text = "Answer sent — the agent is revising the plan…";
      }
    } else if (state.plans.length > p.plans && latestVersion) {
      text = `Plan v${latestVersion} ready — review what changed.`;
    } else if (
      state.messages.length > p.messages &&
      state.messages[state.messages.length - 1]?.author === "human"
    ) {
      text = "Answer sent — the agent is revising the plan…";
    }

    prev.current = {
      status: state.status,
      messages: state.messages.length,
      plans: state.plans.length,
    };

    if (!text) return;
    setToast(text);
    if (timer.current) window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setToast(null), 3800);
    return () => {
      if (timer.current) window.clearTimeout(timer.current);
    };
  }, [state.status, state.messages, state.plans]);

  if (!toast) return null;

  return (
    <div className="zk-toast" role="status" data-testid="action-toast">
      <span className="zk-toast__dot" aria-hidden="true">
        ●
      </span>
      {toast}
    </div>
  );
}
