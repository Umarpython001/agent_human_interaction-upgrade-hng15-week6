# Comparison & Recommendation — Human–Agent Interaction Feature

> Author: RESEARCH agent · Date: 2026-10-29
> Companions: `01_product_analysis.md`, `02_candidates.md`, `04_implementation_spec.md`.
> This document compares the three candidates and recommends one, and assesses the
> Agent Action Briefs work already in flight (per the LEAD's locked contract in
> `agents_communicate.md` §4).

## 1. External evidence (peer-reviewed, verified)

These are the load-bearing external findings. Every one was fetched and confirmed; no
statistics are invented. Product/vendor examples were gathered separately by a research
subagent and are cited in §1b.

**[E1] Amershi et al., "Guidelines for Human-AI Interaction", CHI 2019**
(DOI `10.1145/3290605.3300233`, Proc. CHI '19, 2 May 2019; 18 guidelines, validated with
49 practitioners against 20 AI-infused products; ACM "Honorable Mention").
*Relevant guidelines:* make clear **what** the system can do and **how well** (G1–G2);
**time services based on confidence** (G3); **make clear why** the system did what it did
(G12); **enable scrutiny and end-user correction** (G17).
*Use:* a decision surface must communicate the agent's capability, its confidence, its
reasoning, and give a real correction path — not just a button.

**[E2] Bansal et al., "Does the Whole Exceed its Parts? The Effect of AI Explanations on
Complementary Team Performance", CHI 2021** (DOI `10.1145/3411764.3445717`; arXiv `2006.14779`).
*Finding (verified abstract):* explanations **did not** increase complementary (human+AI)
accuracy; they "increased the chance that humans will accept the AI's recommendation,
**regardless of its correctness**."
*Use:* **the single most important caution for this feature.** Showing a human a
good-looking brief can *increase blind acceptance*. Therefore the design must (a) surface
uncertainty/confidence honestly, (b) make "Request changes" and "Decline" genuinely
first-class, and (c) attach consequences to options — so the human is choosing an outcome,
not rubber-stamping prose. This directly shapes the spec (`04_...` §4).

**[E3] Parasuraman & Riley, "Humans and Automation: Use, Misuse, Disuse, Abuse", Human
Factors 39(2), 230–253, 1997** (DOI `10.1518/001872097778543886`; volume/issue/pages
verified via OpenAlex record W2063052894; 4,537 citations). Verified from the indexed
abstract: "misuse refers to over-reliance on automation, which can result in failures of
monitoring and decision biases"; "disuse … is commonly caused by alarms that activate
falsely"; "automation abuse … tends to define the human operator's roles as by-products of
automation." This is the canonical citation for why an approval UI must not nudge toward
blind acceptance.
*Use:* over-reliance ("misuse") and reflexive distrust ("disuse") are the two failure modes
of any approval gate. Candidate B's risk of approval fatigue is exactly "misuse"; the fix
is calibrated, low-friction decisions with real information, not more gates.

**[E4] Horvitz, "Principles of Mixed-Initiative User Interfaces", CHI 1999**
(DOI `10.1145/302979.303030`).
*Use:* initiative should shift between human and machine based on the **costs** of delay and
error. Ziki's verified SLA (30-min reminder, 4-h release) makes the *cost of asking* real
and quantifiable. This argues for a fast, structured ask rather than free text — and against
gating every autonomous action (Candidate B taken to its extreme).

### 1b. Product / vendor examples
*(Gathered by research subagent — see `05_external_product_examples.md`.)*
The established pattern across agentic frameworks (LangGraph interrupts/`Command(resume)`,
AutoGen, CrewAI, OpenAI Agents SDK, Temporal signals/updates, Step Functions callbacks,
n8n/Zapier approval steps) is a **structured, resumable interrupt**: the agent suspends, the
human receives context plus a typed response, and the agent resumes with that value. Most
support multiple-choice/structured responses and batching; none rely on free-text-only.
Coding agents (Cursor plan mode, Claude plan mode, Copilot Workspace, Devin) present a
**reviewable plan with edit/approve/reject** before work. *(Full, verified list in `05_...`.)*

## 2. Scored comparison

Scale 1 (poor) – 5 (strong). Weights reflect this task: a focused frontend prototype that
must be demonstrable and must not fight Ziki's autonomy model.

| Criterion (weight) | A: Clarification Card | B: Action Briefs | C: Decision Memory |
|---|---|---|---|
| User impact on the verified friction (×3) | 4 | 5 | 3 |
| Differentiation vs generic approval (×2) | 4 | 5 | 4 |
| Feasibility / low complexity (×3) | 5 | 3 | 2 |
| Small implementation scope (×3) | 5 | 3 | 2 |
| Suits focused frontend prototype (×3) | 5 | 4 | 2 |
| Fits Ziki autonomy model (×2) | 5 | 3 | 4 |
| **Weighted total (/90)** | **71** | **64** | **49** |

**Reading:** standalone, **A (Clarification Card)** scores highest — it is the smallest,
most feasible, and squarely hits the sharpest verified friction (unstructured Q&A under an
SLA). **B (Action Briefs)** has the highest impact and differentiation but is heavier and
risks approval fatigue. **C (Decision Memory)** is valuable as a *multiplier* but is a poor
*first* feature: it needs A or B to produce decisions worth remembering, and it adds a
second knowledge system next to notes/mistakes/instructions.

## 3. Recommendation

**Recommendation: continue with the Agent Action Briefs work already in flight, enhanced
with the structured clarification loop — i.e. the LEAD's current contract (Brief +
ClarificationThread + Decision), which is a deliberate B+A hybrid — and sharpen it with the
five evidence-driven refinements below. Trim the scope of B to keep it prototype-sized.**

This is the honest read of the evidence:
- The three candidates are not really rivals at the interaction moment that matters. The
  **Agent Action Brief is the "what the agent wants to do"** half (B); the **Clarification
  + Decision bar is the "what the human chooses"** half (A). At the moment the human acts,
  they need *both*. The LEAD's contract already models exactly this.
- Recommendation in one line: **B as the container, A as the decision mechanism, C deferred.**

**Do NOT rebuild what exists.** The UI agent's `action-brief/` and WORKFLOW agent's
`clarification/` + `decision/` components are the right decomposition. My contribution is
to make the decision mechanism evidence-correct, not to re-platform it.

### The five refinements (evidence-linked) that the research says must not be dropped
1. **Show confidence + reason on the brief** (`ActionBrief.confidence`, `confidenceReason`).
   [E1 G2/G3, E2] Without an honest confidence signal, a polished brief *increases blind
   acceptance* [E2]. This is the difference between a brief and a sales pitch.
2. **Make the SLA/deadline visible in human terms** ("Answer within 4h · claim released if
   unanswered"). [E4, and Ziki's verified 4h/`owner_unresponsive` rule] The cost of asking
   must be legible so the human can triage.
3. **Treat "Request changes" and "Decline" as first-class, with required reasons.**
   [E1 G17, E2, E3] These are the anti-rubber-stamp paths; if they are second-class, the
   feature measurably *reduces* appropriate scrutiny [E2].
4. **Attach a per-option/per-outcome consequence and prefer outcome choices over bare
   yes/no** where the agent can compute them. [E2] This keeps the human choosing an
   outcome rather than approving prose.
5. **Version the brief on revision** (v2 · revised), never silently overwrite.
   [Ziki's verified `superseded` semantics; E1 G12 "make clear why"] A human must be able to
   see what changed between what they saw and what they approved.

### What to exclude from v1 (keep it prototype-sized)
- **No mutation of `instructions` / no "apply as rule"** — it needs an owner-review flow and
  touches settings owned elsewhere. Capture the feedback in the `Decision.feedback` field so
  it *can* seed Decision Memory later.
- **No separate Decision-Memory store** (Candidate C). The `Decision` record on each request
  is the seed; a ledger is a v2/v3.
- **No delivered-vs-approved diff view, no notifications, no batching across many issues.**
- **No real clock** for the SLA — a static, honest chip from mock timestamps.

## 4. Why this is worth building (impact argument)
The verified friction is that every human decision today funnels to "type prose" or "approve
a blob" under a clock that silently releases claims after 4 hours. This feature makes the
stop-and-ask moment **fast, structured, honest about uncertainty, and revisable** — which is
exactly the product's stated promise ("Agents ask before they act. People make the call.")
and exactly what the screenshots' empty Inbox is waiting to be filled with. It is
demonstrable end-to-end in a 2-minute walkthrough with pure mock state.

## 5. Success measures (hypotheses to test, not claims)
Median time-to-decide; % decisions made with ≥1 clarification exchange; % requests that
reach `approved` on v1 vs v2 (revision value); % using "Request changes"/"Decline" (if ~0,
we built a rubber-stamp [E2]); post-hoc "was the right decision made?" spot checks.
