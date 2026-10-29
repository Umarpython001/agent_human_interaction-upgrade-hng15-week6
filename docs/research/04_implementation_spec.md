# Implementation Specification — Agent Action Brief + Structured Clarification & Decision Loop

> Author: RESEARCH agent · Date: 2026-10-29
> Audience: LEAD, UI agent, WORKFLOW agent.
> This spec conforms to the LEAD's §4 shared contract in `agents_communicate.md`
> (Vite + React 18 + TS, tokens.css, one `useReducer` store, mock data in `src/data/`).
> It does **not** redefine the data model; it specifies behaviour, states, and the small
> refinements the external research says matter. Deviations from the LEAD contract are
> flagged `>>> DELTA <<<` and require the LEAD's sign-off.

## 1. Problem statement

When a Ziki agent needs a human, it stops and files a question or escalation. Today that
channel is **unstructured free text**: the human sees a sentence, must reconstruct the
context, and types prose back — under a claim-clock SLA (30-min reminder, 4-h cap that
releases the claim with `owner_unresponsive`). Answers are immutable and there is no
revision loop. The result is slow, low-confidence decisions and avoidable claim churn.

## 2. Target user & triggering situation

- **User:** the agent's human owner (e.g. Umar), in the Inbox → "Need your input" tab.
- **Trigger:** an agent files an AgentRequest of kind
  `question | work_authorization | scope_change | blocker | human_approval` (real Ziki
  escalation types) and needs the owner to decide before it can proceed. In the prototype
  this is a seeded mock request in `status: awaiting_answer`.

> **CANONICAL STATUS ENUM (LEAD ruling — matches `src/types.ts` + `src/lib/statusMeta.ts`):**
> `awaiting_answer → agent_revising → awaiting_decision → approved | declined`.
> `changes_requested` is a **decision record + transition**, NOT a status. Use exactly these
> five everywhere (code, tests, copy), superseding the earlier draft names
> (`awaiting_review` / `in_clarification` / `revised_awaiting_review`).

## 3. End-to-end interaction flow

1. **Arrival.** Inbox shows the pending request as a card in "Need your input" (count in
   the tab matches). "YOUR AGENTS" panel shows the agent with the amber "Waiting on you"
   pill (mirrors screenshot `011229`).
2. **Open.** The request opens at `/inbox/:requestId`. It shows: issue (number + title),
   agent identity (name/level/avatar), the **ActionBrief** (intention, evidence links,
   plan steps, risks, uncertainties, estimate), a **confidence** chip, and a **deadline**
   chip explaining the SLA in human terms.
3. **Clarify (optional).** The human asks a question in the clarification thread; the agent
   answers. Each exchange is an immutable row (`ClarificationMessage`), newest-last.
   Asking pauses the simulated deadline clock (matches real claim-clock-pause behaviour).
4. **Decide.** The human picks one of exactly three outcomes:
   - **Approve** → `approved`. Brief is accepted; agent proceeds. `Decision.feedback`
     optional.
   - **Request changes** → `changes_requested`. Human must add feedback (≥1 char). This
     returns the brief to the agent, which posts a **revised** brief; `proposalVersion`
     increments and the card is visually marked "v2 · revised".
   - **Decline** → `declined`. Requires a reason. Work does not start.
5. **Aftermath.** The request leaves "Need your input" and lands in a "Decided" filter.
   The agent card's pill flips from "Waiting on you" to its next real state. Approval
   **never** implies the issue is done — merge/live status is only ever set by proof
   (Ziki rule).

## 4. Screen-by-screen description (textual wireframe)

**S1 · Inbox list ("Need your input" tab)**
- Row/card: agent avatar + name · issue `#129 · Invitation pages hang…` · kind chip
  (`question`/`work_authorization`/…) · one-line brief summary · relative time ("12m ago")
  · deadline chip ("Answer within 4h" / "3h 48m left") · right-aligned "Review" button.
- Empty state: reuse existing "Nothing here right now. No agent is waiting on an answer."
- Counts: tab badge = number of `awaiting_answer` + `awaiting_decision` requests.

**S2 · Request detail (`/inbox/:requestId`)**
```
[← Back to inbox]
AGENT  Umar-Reporter (contributor)      KIND  work_authorization      ● Waiting on you
ISSUE  #129 · Invitation pages hang on an infinite spinner…

── AGENT'S PROPOSAL  (v2 · revised 12m ago) ────────────
 Intention   "Patch the invite URL parser to stop the spinner."
 Evidence    [Issue #129] [Repro log] [PR #1847 (draft)]
 Plan        1. Reproduce at 375px  2. Patch parser guard  3. Add regression test
 Risks       • Touches shared URL util used by 3 screens
 Uncertainties • Unsure if the hang is client- or network-side
 Estimate    ~30 min
 Confidence  72 — "Reproduced locally; not yet on staging."
 Deadline    ⏱ Owner reminded at 30m; claim released after 4h if unanswered
───────────────────────────────────────────────────────
 CLARIFICATION  (thread, oldest first)
   [human] Does this affect the login page too?
   [agent] No — login uses a separate parser. Only invitations are affected.
 [ Type a question…                                    ] [Ask]

 YOUR DECISION
 [ Approve ]  [ Request changes ]  [ Decline ]
```
**S3 · Decision feedback inline** — "Request changes" reveals a required textarea
("What should the agent change?"); "Decline" reveals a required reason. "Approve" may
carry an optional note.

**S4 · Resolved state** — card shows decision chip (`Approved` / `Changes requested` /
`Declined`), decidedAt, and feedback; brief shows the version that was decided on.

## 5. Required UI states & transitions

Per request `status` (LEAD contract):
`awaiting_answer` (question open, plan v1) → `agent_revising` (human answered)
→ `awaiting_decision` → `approved` | `declined`.
`awaiting_decision` →(changes_requested, reason required)→ `agent_revising` →(plan
revised, version+1)→ `awaiting_decision`. `changes_requested` is a decision record, not a
status. Terminal: `approved`, `declined` (repeat transitions are illegal no-ops).
Component-level states to implement: `loading` (skeleton), `idle`, `submitting` (decision
in flight, buttons disabled), `error` (decision failed → keep selection + Retry), `expired`
(agent already released — decision disabled with honest copy).

## 6. Information exchanged (human ⇄ agent)

- **Agent → human:** ActionBrief (intention, evidence[], plan[], risks[], uncertainties[],
  estimate), confidence + reason, deadline/SLA, proposalVersion, clarification answers.
- **Human → agent:** clarification questions; decision (`approved|changes_requested|
  declined`) with feedback; the choice itself is the machine-readable outcome.

## 7. Data fields & component contract (aligned to LEAD §4)

No new top-level entities. Two `>>> DELTA <<<` additions proposed:
- `AgentRequest.deadlineAt: string` (ISO) and `AgentRequest.reminderAt?: string` — so the
  UI can render the SLA honestly. *(Mocked; no real clock.)*
- `ActionBrief.confidence?: number` and `brief.confidenceReason?: string` — reusing the
  exact convention Ziki already displays on agent comments. *(Optional field.)*

Component contracts (for UI/WORKFLOW):
- `ActionBriefCard({ brief, version, isRevised, deadlineAt, confidence })` — UI agent.
- `ClarificationThread({ messages, onAsk, disabled })` — WORKFLOW agent.
- `DecisionBar({ onDecide(decision, feedback?), busy, disabled, disabledReason })` —
  WORKFLOW agent. Emits `{ decision: 'approved'|'changes_requested'|'declined', feedback?: string }`.
- Container (page) owns fetch-from-store + reducer dispatch; children are presentational.

## 8. Acceptance criteria

1. Inbox "Need your input" lists ≥2 mock requests with correct tab count; empty state
   renders when none.
2. Opening a request renders the full brief (all six fields), agent identity, issue, kind
   chip, and SLA chip. No field is fabricated beyond mock data.
3. Clarification: asking a question appends an immutable row; agent reply appends another
   row (mock). Asking a question does **not** change `status` — `awaiting_answer` is already
   the initial state, so the invariant is that status *remains* `awaiting_answer` through
   any number of Q→A exchanges. Rows are immutable: an existing message is never edited or
   deleted; a follow-up is always a new row.
4. "Request changes" is blocked without feedback (≥1 char); on submit the brief version
   increments and a "v2 · revised" marker is visible; status → `agent_revising`
   then back to `awaiting_decision`.
5. "Decline" is blocked without a reason; "Approve" works with optional note.
6. Every decision moves the request to the "Decided" filter and updates the agent card
   pill. Approval does **not** mark the issue done/merged anywhere.
7. A failed decision (injected mock error) shows an inline error and preserves the user's
   input for retry.
8. Keyboard-only path can complete ask + all three decisions; visible focus; Enter submits.
9. No changes to app shell, routing, tokens, or store owned by LEAD.

## 9. Edge cases, accessibility, failure states

- **Edge:** no brief fields filled (show "—" not blanks); very long text (clamp + expand);
  0 clarification messages (hidden thread); deadline already passed (`expired`, decision
  disabled with "Agent already stopped waiting"); two agents on one issue (distinct cards,
  never merged); decide twice (idempotent — second attempt no-ops).
- **a11y:** decisions are a labelled group; SLA uses text + icon, never colour alone;
  `aria-live="polite"` announces version bump and status change; thread is an ordered list;
  44px minimum targets; contrast meets WCAG AA on the amber pill and blue buttons.
- **Failure:** submitting a decision fails → inline error + Retry, no data loss; store
  update is atomic (reducer), so a partial transition cannot persist.

## 10. Prototype scope & verification

**In scope (mock/local):** list, detail, clarification thread, three decisions, revision
versioning, SLA chip, error/empty/expired states, "Decided" filter, all a11y above.
**Out of scope for v1 (defer):** real backend/events, "apply as rule → instructions"
promotion, delivered-vs-approved comparison, multi-issue batching, notifications, and any
change to `instructions` or project notes. These need backend support and owner-review
flows and would grow the prototype without proving the core interaction.
**Mock vs real:** everything above is local `useReducer` state seeded from `src/data/`.
A real backend would replace the store with the live `AgentRequest`/question/escalation
objects and the `question.answered` event; no invented API is required to design against
this, because the shapes reuse Ziki's own vocabulary.
**Verification plan (QA agent):** (a) walk the happy path S1→S4; (b) walk clarify→revise→
approve; (c) walk decline-without-reason (blocked) and request-changes-without-feedback
(blocked); (d) injected decision-error retry; (e) expired request; (f) keyboard-only run;
(g) empty state. Record honest results, including anything that does not work.
