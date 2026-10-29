# WORKFLOW integration guide — ClarificationThread + DecisionBar

> Author: WORKFLOW agent · Date: 2026-10-29
> Audience: LEAD (integration), UI (composition), QA (verification).
> Components: `src/components/clarification/**`, `src/components/decision/**`.
> All types come from the LEAD-owned `src/types.ts`. Nothing here forks the model.

## 1. What you get

| Component | File | Purpose |
|---|---|---|
| `ClarificationThread` | `src/components/clarification/ClarificationThread.tsx` | Chronological Q→A thread + composer (3–2000 chars, suggestion chips, async submit, double-click guard, retryable error that keeps the draft) |
| `DecisionBar` | `src/components/decision/DecisionBar.tsx` | Approve / Request changes / Decline with inline forms, required feedback, version-bound submissions, terminal outcome, decision history, live announcements |
| `WorkflowIntegrationExample` | `src/components/decision/WorkflowIntegrationExample.tsx` | **Integration example only** — a full working page wiring both components to `src/types.ts` + `src/data/scenario.ts`. Replace with the real page/store at integration. |
| `workflowExampleReducer` | `src/components/decision/workflowExampleReducer.ts` | Pure, guarded state machine for the example — copy its transition rules into the LEAD's `src/store/` reducer. |

Each folder has a barrel `index.ts` and file-scoped CSS (`.zk-ct*`, `.zk-dc*`, `.zk-wfx*`;
`var(--zk-*)` tokens with verified ziki.dev fallbacks — inherits LEAD tokens automatically).

## 2. Required container wiring (the contract)

```
ClarificationThread
  messages        ThreadMessage[]        chronological, oldest first
  onAsk           (input: { body, suggestionId? }) => void | Promise<void>
  suggestions?    SuggestedAnswer[]
  names?          { human?, agent? }
  disabled?       boolean                e.g. agent revising / request decided
  disabledReason? string                 honest copy, shown when disabled
  busy?           boolean
  minChars/maxChars? number              default 3 / 2000 (Ziki's real limits)

DecisionBar
  proposalVersion number                 the version currently on the table
  onDecide        (sub: { decision, feedback?, version }) => void | Promise<void>
  decided?        DecisionRecord | null  terminal record → outcome view
  history?        DecisionRecord[]       change requests etc., oldest first
  disabled?/disabledReason?/busy?        as above
  names?          { human?, agent? }
```

**Container rules (all enforced in `workflowExampleReducer` — mirror them in `src/store/`):**

1. **Ask guard** — ignore `human_message` while `agent_revising` or after a terminal decision.
2. **Revision guard** — an agent revision only lands while `agent_revising`, and only as `current + 1`.
3. **Decision guard** — accept a decision only when status is `awaiting_decision`,
   no decision exists yet, and `record.version === plan.version` (stale versions are rejected
   — an old approval must never cover a revised plan; the human decides again on the new version).
4. **Idempotency** — a second decision after a terminal one is a no-op.
5. **Async handlers must either update state or throw.** On throw, the components keep the
   user's text and show a retryable inline error. On success they clear their forms.
6. **`changes_requested` is a DecisionKind, not a status** (LEAD's `src/types.ts`):
   `awaiting_decision --changes_requested--> agent_revising --> awaiting_decision (v+1)`.
   The visible "changes-requested state" = recorded decision in `history` + revising banner.

## 3. Example wiring (from the integration example)

```tsx
const [state, dispatch] = useReducer(workflowExampleReducer, seed);

<ClarificationThread
  messages={state.messages}
  onAsk={async ({ body, suggestionId }) => {
    dispatch({ type: "human_message", message: { id, author: "human", body, time } });
    await agentThinkTime;                       // mock latency
    const r = buildAnswerRevision(suggestionId ?? null, body, state.plan.version + 1, time);
    dispatch({ type: "agent_revision", ack: r.ack, plan: r.plan });
  }}
  suggestions={question.suggestedAnswers}
  disabled={state.status !== "awaiting_answer" && state.status !== "awaiting_decision"}
  disabledReason="…"
/>

<DecisionBar
  proposalVersion={state.plan.version}
  decided={state.decided}
  history={state.history}
  disabled={state.status !== "awaiting_decision"}
  disabledReason="Answer the agent's question before deciding."
  onDecide={async ({ decision, feedback, version }) => {
    if (version !== state.plan.version) throw new Error("the plan changed — review it again");
    /* dispatch decide (+ feedbackMessage); for changes_requested: buildFeedbackRevision … */
  }}
/>
```

## 4. Integration checklist for LEAD

- [ ] Render `ClarificationThread` + `DecisionBar` inside the Agent Action Brief's `footer`
      slot (UI agent's component) or on the request page — both are layout-agnostic.
- [ ] Move the example reducer's guards into `src/store/`; keep the status enum from
      `src/types.ts` (open question on the board about §4's alternative names).
- [ ] Pass real names/labels; keep the honest mock wording until a real backend exists.
- [ ] Delete `src/components/clarification/css.d.ts` if you add `src/vite-env.d.ts`
      (vite/client declares `*.css` too; mine is a stopgap for `tsc`).
- [ ] Suggested answers are optional — the composer works alone.
- [ ] Nothing in these components claims messages are sent anywhere; the only side effects
      are the `onAsk` / `onDecide` callbacks you provide.
