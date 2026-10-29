# Candidate Features — Human–Agent Interaction Improvement

> Author: RESEARCH agent · Date: 2026-10-29
> Companions: `01_product_analysis.md` (verified facts), `03_comparison_and_recommendation.md`,
> `04_implementation_spec.md`.
> External human-in-the-loop evidence is cited in `03_...`. Facts from Ziki's spec are
> marked **[VERIFIED]**; anything else is my **[HYPOTHESIS]**.

Three genuinely different candidates, plus a deliberate non-candidate. Each addresses a
friction point from `01_product_analysis.md` §4.

---

## Candidate A — Structured Clarification Loop ("Answer Card")

**One-line:** Turn the agent's free-text question into a decision instrument: a card with
the agent's understanding, 2–4 concrete options (each with its consequence), the deadline,
and a one-tap answer.

**Problem it addresses:** Friction #1 and #2 — unstructured Q&A under a hard SLA, with
immutable answers and no revision loop. This is the *response* half of collaboration.

**How Ziki handles it today [VERIFIED]:** `POST /api/v1/questions` free text (3–2000 chars);
owner answers in the app; answer immutable; `question.answered` event; claim clock pauses
(reminder 30 min, release at 4 h default). Inbox bucket "Need your input".

**End-to-end flow (proposed):**
1. Agent, on a claimed issue, needs a decision. Instead of a bare sentence, it emits a
   card: what it understood, the question, N options, each option's consequence, its
   confidence, and the deadline it is waiting against.
2. Human opens Inbox → "Need your input" → sees the card inline (no page switch).
3. Human taps an option (or types "Something else"), optionally ticks "apply to similar
   situations this project".
4. Card flips to an answered state: "Agent will now X". The choice + note are delivered as
   the answer; the agent proceeds.
5. If the human steers, the agent may post a **revised** card (v2) rather than a new row —
   closing the no-revision gap.

**Why not a generic approval UI:** an approval button asks "may I?"; this asks "**which
outcome do you want?**" with pre-computed consequences, a visible deadline, and a
deterministic action per option. Approving a blob makes the human reconstruct context;
here the agent has already done that.

**Benefits:** humans answer in seconds (fits the 4h SLA); agents get a deterministic,
machine-readable choice instead of parsing prose; fewer round-trips; the "apply as rule"
tick seeds standing guidance so the same question is not asked twice.

**Complexity / dependencies:** Low–medium. Pure frontend with mock state. Reuses the
existing question object and `question.answered` event; a production version needs the
question body to carry a small structured extension (options/consequence/deadline/confidence)
— a modest backend change, no new concept.

**Risks / edge cases:** option lists can be wrong or incomplete (must keep free-text
fallback); over-use could turn into micro-management; "apply as rule" needs owner review
so it does not silently mutate `instructions`; expiry (agent already released) must be
shown honestly; multiple questions on one issue must not collide.

**Success measures [HYPOTHESIS]:** median time-to-answer; % answered before the 4h cap
(fewer `owner_unresponsive` releases); % answers needing the free-text fallback (option
coverage); repeat-question rate (with "apply as rule"); question→resumed-work latency.

---

## Candidate B — Agent Action Briefs (context-rich pre-work proposal)

**One-line:** Before an agent takes or re-scopes work, it files a structured brief — goal,
plan steps, files/areas in scope, estimate, risks, confidence + evidence — and the human
Approves / Steers / Declines, with revision-in-place.

**Problem it addresses:** Friction #3 — no structured action proposal outside redesigns;
humans authorize work (bid award, scope change) with almost no context.

**How Ziki handles it today [VERIFIED]:** a bid carries a 280-char note and a person awards
it; escalations (`work_authorization`, `scope_change`, `human_approval`) are free text;
redesigns are the only structured proposal and exist only for redesigns; the merger gate is
late in the cycle.

**End-to-end flow (proposed):**
1. Agent is about to claim/re-scope. It files a Brief: goal, steps, in/out of scope,
   estimate, risks, confidence, evidence links.
2. Human sees it in the Inbox with Approve / Adjust / Decline. "Adjust" adds inline notes
   that revise the brief → **v2**, not a new object.
3. Approved brief is auditable and later compared to the delivered PR ("delivered vs
   approved").

**Why not generic approval:** shows plan + evidence + scope + risk in one object; supports
revision without restart; versioned; compares plan to outcome.

**Benefits:** informed authorization; fewer mis-scoped deliveries; an audit trail that
links consent to outcome.

**Complexity / dependencies:** Medium–high. A new proposal object (redesign-like but
general), a revision loop, and a comparison view. Larger than a focused prototype.

**Risks / edge cases:** **approval fatigue** — gating every action fights Ziki's verified
autonomy-by-default model and risks blowing the 30-min offer window; agents can game briefs;
humans may rubber-stamp. Highest risk of adding friction rather than removing it.

**Success measures [HYPOTHESIS]:** % work started from an approved brief; rework rate;
steer-before-start vs reject-after-delivery ratio; human time per brief; offer-window
miss rate.

---

## Candidate C — Decision Memory ("Why we decided" ledger)

**One-line:** Every human answer/approval/rejection becomes a durable, scoped, revocable
decision record that agents read before acting.

**Problem it addresses:** Friction #4 — decisions are one-shot; the only durable guidance
is a static 4000-char `instructions` field and manual notes; each new session re-learns
preferences.

**How Ziki handles it today [VERIFIED]:** `instructions` (owner-editable standing brief),
project notes + comments, and the mistake registry (agent errors only). No object stores
human decision rationale with scope and expiry.

**End-to-end flow (proposed):**
1. A human decision (answer, approval, decline) optionally becomes a Decision Record:
   context, decision, rationale, scope (this issue / this project / always), expiry.
2. Agents read relevant records before acting (like they must read project notes).
3. Owner sees a "Decisions" ledger, can edit or revoke. Records can be promoted into
   `instructions`.

**Why not generic approval:** it is memory infrastructure, not a one-shot click; it makes
collaboration *consistent over time* and compounds trust.

**Benefits:** owners stop repeating themselves; new agents inherit context; consistency
across many agents; auditable "why".

**Complexity / dependencies:** Medium–high backend; a ledger page. Critically, it needs
Candidate A or B to *produce* decisions worth remembering — it is a force-multiplier, not
a standalone first feature.

**Risks / edge cases:** staleness; over-rigid rules that block legitimate exceptions;
conflicts between records; maintenance burden/clutter; scope creep ("yet another knowledge
system" next to notes + mistakes + instructions).

**Success measures [HYPOTHESIS]:** repeat-question rate; time-to-context for a new agent;
% decisions reused vs overridden; owner edits/revocations (health of the ledger).

---

## Deliberate non-candidate: "Shared understanding check" (pre-work summary)

A lightweight variant of B (agent posts a 3-bullet "what I understood" and the human
confirms/corrects). It is cheap and useful, but it is a **subset of A's card** — the
summary is exactly the "agent's understanding" field. I fold it into A rather than tracking
it separately. **[HYPOTHESIS]**
