# Ziki — Existing Human–Agent Interaction: Verified Product Analysis

> Author: RESEARCH agent · Date: 2026-10-29
> Sources: `https://ziki.dev/` (homepage), `https://ziki.dev/llms.txt` (machine-readable
> agent API reference, "Generated from the Zedu-Endor/issue-tracker codebase", last
> updated 2026-10-21), `https://ziki.dev/docs` (sign-in wall only), and the 5 reference
> screenshots in `screenshots/`.
> Rule applied: every claim below is marked **[VERIFIED]** (directly from spec/screenshots)
> or **[HYPOTHESIS]** (my inference). No capability is declared missing merely because a
> screenshot does not show it.

## 1. What Ziki is

**[VERIFIED]** Ziki is a collaborative issue-tracking and bounty platform where humans and
AI agents work together to report, triage, solve, test, and merge fixes. Agents operate
**on behalf of an owner** (they are not beneficiaries), operate within agent levels
(`observer`, `contributor`, `triager`, `reviewer`, `dispatcher`, `merger`, `admin_merger`),
and everything they do is audited. The homepage promise: *"Agents ask before they act.
People make the call."*

## 2. The six-step lifecycle (context for where humans get involved)

**[VERIFIED]** Report (`POST /issues`) → Confirm (2 independent reviewer accepts + a
triager's not-a-duplicate clearance) → Authorize/claim (offer 30-min window → accept, or a
human awards a bid) → Deliver (heartbeat ≥15 min, link PR) → Prove (2 independent
`goodToMerge` verdicts) → Merge (merger agent; sensitive changes behind a human gate;
`admin-merge` verifies via the GitHub App). Points are paid from an append-only ledger for
validated work only.

## 3. Existing human–agent interaction surfaces (the key inventory)

| # | Surface | Mechanism | Verified facts |
|---|---------|-----------|----------------|
| 1 | **Questions** | `POST /api/v1/questions`, `GET /api/v1/questions/{id}` | Body 3–2000 chars, optional `bugId`. Only the owner answers, in the web app. **Answer is immutable**; a follow-up is a new row. `question.asked` / `question.answered` events. **Unstructured free text — no options, no structure.** |
| 2 | **Escalations** | `POST /api/v1/escalations`, `GET /api/v1/escalations/{id}` | Typed: `question`, `work_authorization`, `blocker`, `scope_change`, `human_approval`. Type can be keyword-inferred, defaulting to `question`. Status `open` → `resolved` with free-text `resolution`. |
| 3 | **Claim-clock pause** | tied to Questions (#606) | A question on an issue the agent holds a claim on **pauses the claim's silence and deadline clocks** until answered. Owner reminded after **30 min**. No answer within the project cap (**4 h default**) → claim released `releaseReason: "owner_unresponsive"` (does not count against the agent). |
| 4 | **Redesign proposals** | `POST /api/v1/redesigns`, `POST /api/v1/redesigns/{id}/decision` | Structured: title, body, previewUrl (Figma etc.), ≤5 image attachments. A person reviews; a tenant admin picks the winner (`approved`/`rejected`/`chosen`); losers become `superseded`. **Closest existing thing to a structured proposal — but only for redesigns, and there is no revise-in-place loop.** |
| 5 | **Bids** | `POST /api/v1/issues/{id}/bid` + human award | Agent bids with an optional **280-char note**; a **person awards the bid**. This is today's authorize-before-work gate. Offers auto-expire in 30 min. |
| 6 | **Comments w/ confidence** | `POST /api/v1/issues/{id}/comments` | Optional `metadata.confidence` (0–100) + `confidenceReason` (1–500 chars), displayed on agent comments. **Confidence exists on comments only — not on questions or escalations.** |
| 7 | **Standing instructions** | `GET /api/v1/agents/me` → `instructions` | Owner-editable brief, ≤4000 chars, approved/edited at pairing. **The only durable human-authored guidance an agent receives.** |
| 8 | **Inbox (web UI)** | screenshots `011229`/`011300`/`011314` | Buckets: **"Need your input" / "Design feedback needed" / "New ideas" / "Drafted ideas"**. Page copy: *"Agents work through issues on their own and stop here when they need a person: to answer a question, give feedback on a design, or weigh in on a new idea."* "YOUR AGENTS" panel shows an agent card with an amber **"Waiting on you"** pill and "Waiting for your answer". Empty state: "Nothing here right now. No agent is waiting on an answer." |
| 9 | **Human merge gate** | `admin-merge` + homepage | Architectural/strategic issues route to a Human Reviewer (HITL) gate; sensitive changes remain behind human approval. |
| 10 | **Mistake registry** | `POST /api/v1/projects/{id}/mistakes` | Merger agents log anti-patterns with remediation + code snippets; other agents read them to avoid repeats. **Agent→agent memory; human rationale is not captured here.** |

## 4. Verified friction points (problem evidence)

1. **Unstructured Q&A under a hard SLA.** Questions and escalations are free-text blobs.
   The human must reconstruct context, and cannot see the deadline attached to the answer
   (the 4h cap / 30-min reminder live server-side only). Under a clock that releases
   claims, a slow, unstructured round-trip is expensive. **[VERIFIED + HYPOTHESIS on cost]**
2. **Immutable answers / no revision loop.** A mistyped or misread answer requires a whole
   new question row; redesigns are superseded rather than revised. **[VERIFIED]**
3. **No structured action proposal outside redesigns.** Nothing shows the human an agent's
   plan, evidence, scope, and risk in one object before work proceeds; the 280-char bid
   note is the only pre-work context, and consultation is discretionary (agents act within
   standing level approvals, not per-action consent). **[VERIFIED]**
4. **No decision memory.** Human answers/approvals are one-shot. Durable guidance is the
   static 4000-char instructions field plus manual project notes. Mistakes registry covers
   agent errors, not human decision rationale. **[VERIFIED that no such object exists in
   the API; HYPOTHESIS that this causes repeated questions]**.
5. **Confidence is inconsistent.** Comments can carry confidence; the decisions that matter
   most (questions/escalations) cannot. **[VERIFIED]**

## 5. Design constraints any feature must respect

- **Clocks are tight:** delivery 15 min (≥60 for high/critical), heartbeat 15 min, offer
  30 min, owner reminder 30 min, owner-silence cap 4 h. The interaction must be
  **completable in seconds**. **[VERIFIED]**
- **Autonomy-by-default:** agents do not wait for permission before bidding/accepting;
  they act within approved levels and escalate only when a human must decide. A feature
  that gates everything fights the product's core model. **[VERIFIED from persona §3]**
- **Owner-independence:** an owner's own agents cannot review that owner's work; the same
  rules would apply to any self-approval loophole. **[VERIFIED]**
- **Everything is audited;** any decision surface must leave an attributable trail.
  **[VERIFIED]**
- **The Inbox already owns the moment.** The improvement belongs in the existing
  "Need your input" surface, not a parallel flow. **[VERIFIED from screenshots]**
