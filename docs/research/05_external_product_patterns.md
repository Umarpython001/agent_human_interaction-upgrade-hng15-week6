# External Product & Research Evidence — VERIFIED

> Author: RESEARCH agent · Date: 2026-10-29 (updated: external research completed)
> Status: **sources fetched and verified** (vendor docs, Wayback captures, OpenAlex).
> This replaces the earlier pattern-level draft. Every claim is attributed; gaps are explicit.
> Purpose: give UI / WORKFLOW / QA citable patterns to copy, and back the 5 refinements.

## A. The 5 refinements — now backed by named products

| Refinement | Verified precedent (source) |
|---|---|
| **1. Confidence + reason, in plain language** | PagerDuty SRE Workbench ("Paige") deliberately shows **no raw confidence scores** — it uses plain-language labels ("Probable cause") + evidence links back to the originating query. *Pair Ziki's 0–100 `confidence` with a plain-language `confidenceReason`, don't show a naked number.* |
| **2. Deadline in human terms** | Temporal's documented **Approval Pattern** defaults a timed-out approval to **auto-REJECT** ("REJECTED" after 5 days), never auto-approve — mirroring Ziki's real `owner_unresponsive` → claim *released*. Make the clock visible. |
| **3. Request-changes/Decline first-class, reasons required** | VS Code / Copilot Planning: **"Pending feedback disables approval until you submit or clear it"** — feedback blocks the decision. Claude Code plan mode offers three paths incl. "No, keep planning." smolagents: **Approve / Modify / Cancel**. |
| **4. Consequence per outcome; prefer outcome-choices** | LaunchDarkly: shows a **visual/JSON diff + a "Test run" blast-radius %** before approving, and separates **"Approve and apply" from "Approve (without applying)"**. CrewAI's resume payload = `human_feedback` (free text) + `is_approve` (boolean) in one object. |
| **5. Version on revision, never silent overwrite** | VS Code: the plan is an **editable file** with version history; Copilot Workspace reviewers **batch comments**. Cursor: "starting over from a plan" is an explicit, visible recovery path. |

## B. Structured questions + free-text fallback (validates Candidate A)
**Convergent vendor evidence — every serious framework uses structured options WITH a
free-text escape hatch; none ship free-text-only:**
- **Claude Code `AskUserQuestion`** (code.claude.com/docs/en/tools-reference.md):
  "each call supports **1–4 questions with 2–4 options each**" → questions are **batched**;
  per-question `multiSelect`; free text via an **"Other" row + notes**; auto-continue
  timeout (60s/5m/10m) for low-stakes questions — **but plan-approval prompts never
  auto-resolve.**
- **LangGraph interrupts** (docs.langchain.com/.../interrupts): `interrupt()` +
  `Command(resume=…)`; a typed `response_schema` lets clients "render **typed input
  forms**"; `resume_map` resumes **multiple interrupts together** (batched, heterogeneous).
- **OpenAI Agents SDK** (openai.github.io/.../human_in_the_loop): tools declare
  `needs_approval`; "you do **not** need to resolve every pending approval in the same
  pass"; decisions can be **sticky** (`always_approve`/`always_reject`); a custom
  `rejection_message` feeds back into the run.
- **n8n** (docs.n8n.io/.../human-in-the-loop-for-tools): reviewer sees **which tool the AI
  wants to use and with what parameters** before Approve/Deny; the approval channel can
  differ from the chat channel. n8n Slack node names the three input modes explicitly:
  **Approval / Free Text / Custom Form.**

**Honest gap (confirmed):** there is **no peer-reviewed study directly comparing structured
multiple-choice vs free-text agent questions, or measuring question batching.** That
evidence is entirely vendor/design-ecosystem. Present it that way — do not claim a research
consensus that does not exist.

## C. Context-rich approval outside coding (strongest precedents)
- **LaunchDarkly Approvals**: visual/JSON diff + Test-run blast-radius % + 5 verbs that
  separate approve from apply; required approvals per environment.
- **PagerDuty "Paige"**: **inline card, never an interrupting pop-up**; **risk-tiered** —
  low-risk = one-click, high-risk = "confirm you have reviewed the evidence first before the
  approval unlocks"; lists **alternatives ruled out AND what wasn't checked**.
- **Cursor PR Routing & Approval**: **risk score + Maximum Risk Threshold**; withholds
  approval if Bugbot/Security agents flag findings; per-directory **`APPROVAL_POLICY.md`**
  (most-specific-wins, **stricter wins if ambiguous**); **anti-self-dealing** — a PR that
  changes the approval policy file can't use its own version.
- **GitHub rulesets**: required-review counts; most-restrictive-wins; **transparent** ("anyone
  with read access can view active rulesets"). Copilot coding agent: assignee **cannot
  self-approve** their own PR; **"Approve and run workflows"** gates secret-holding runs.
- **OpenAI Operator**: "takeover mode" for secrets takes **no screenshots**; high-impact
  actions get **proactive refusals**, not prompts.

## D. Anti-rubber-stamp / fatigue literature (peer-reviewed, verified via OpenAlex)
- **Bansal et al., CHI 2021** (arXiv:2006.14779; DOI 10.1145/3411764.3445717): explanations
  "increased the chance that humans will accept the AI's recommendation, **regardless of its
  correctness**." → context alone is not enough; pair it with verification affordances.
- **Amershi et al., CHI 2019** "Guidelines for Human-AI Interaction" (DOI
  10.1145/3290605.3300233; 18 guidelines, 49 practitioners, Honorable Mention).
- **Parasuraman & Riley 1997** "Use, Misuse, Disuse, Abuse" (DOI 10.1518/001872097778543886,
  Human Factors 39(2), 230–253; volume/pages verified via OpenAlex W2063052894):
  operators both over- and under-trust poorly designed automation.
- **Goddard, Roudsari & Wyatt, JAMIA 2011** (DOI 10.1136/amiajnl-2011-000089): **automation
  bias** — over-reliance on automated output.
- **Ancker et al., 2017** (DOI 10.1186/s12911-017-0430-8): **alert fatigue** has two failure
  modes — cognitive overload **and** desensitization from repeated exposure.
- **Habituation line** (Anderson/Vance/Jenkins MISQ 2018 DOI 10.25300/misq/2018/14124; CHI
  2015 DOI 10.1145/2702123.2702322; Reeder et al. CHI 2018 DOI 10.1145/3173574.3174086).
  **Correction:** the habituation literature is the Anderson/Vance/Jenkins/Reeder line — it
  is **not** Egelman. Do not attribute habituation to Egelman.

## E. Security note for UI (from OpenAI Agents SDK docs)
Agent-supplied text (intention, evidence, risks, thread bodies) must be treated as
**untrusted display content** — escape it / render as text, never inject HTML. If this
prototype is ever wired to a real backend, do not use `dangerouslySetInnerHTML` for brief
or thread content.

## F. Explicitly NOT verified (do not cite specifics)
Copilot Workspace's dedicated plan-review UI; Taskmaster's old `ask` command (**rebranded to
Hamster** — treat as removed); Salesforce Agentforce handoffs; Intercom Fin escalation;
Palantir AIP approvals; Zapier/Make approval steps. Live vendor pages for some were
JS-heavy/unreachable; those cited above were confirmed via direct doc fetch or Wayback.
**No novelty claim and no invented statistics anywhere.**
