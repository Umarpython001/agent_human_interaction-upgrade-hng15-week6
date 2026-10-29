# QA Test Plan — Ziki Clarification Loop prototype

> Author: QA agent · Date: 2026-10-29 · Status: **PENDING integrated build**
> Audience: LEAD, UI, WORKFLOW — use this as a self-checklist during development.
> Results will be recorded in `TESTING.md` once a runnable build exists.

## 0. Sources of truth (test against these only)

1. `end_goal.md` §2–§8 (feature scenario, functional requirements, DoD).
2. `docs/research/04_implementation_spec.md` §8 (acceptance criteria) + §9 (edge/a11y).
3. `agents_communicate.md` §4 (LEAD contract: stack, data model, status machine).
   Canonical statuses: `awaiting_review → in_clarification → revised_awaiting_review →
   approved | changes_requested | declined` (+ `superseded`).
4. `screenshots/*.png` — visual baseline (nav, cards, pills, tokens, empty states).

Anything not in these documents is out of scope. No invented production behaviour is tested.

## 1. Build & environment

| ID | Check |
|---|---|
| B1 | `npm install && npm run build` completes with no TypeScript errors |
| B2 | `npm run dev` serves the app; no runtime errors in the browser console on load |
| B3 | Only agreed runtime deps: `react`, `react-dom`, `react-router-dom` — no extras |
| B4 | Routes `/inbox` and `/inbox/:requestId` resolve (deep-link + refresh works) |

## 2. End-to-end journey (happy path)

| ID | Check | Spec ref |
|---|---|---|
| J1 | Inbox "Need your input" lists the pending request(s); tab count matches; "YOUR AGENTS" panel shows agent with amber **Waiting on you** pill | spec S1 |
| J2 | Opening the request shows agent identity, issue (#129), kind chip, and full brief: intention, evidence, plan, risks, uncertainties, estimate | spec S2, DoD |
| J3 | Clarification question is clearly visible and the human can respond (suggested options and/or typed answer) | end_goal §3 |
| J4 | Submitted answer appears in the conversation; messages stay in chronological order (oldest first) | spec AC3 |
| J5 | Agent acknowledgement + revised plan appear; revision is visually distinguishable (version marker e.g. "v2 · revised", what-changed summary) | end_goal §2.6, spec AC4 |
| J6 | Approve updates visible decision status to `approved`; controls become inert afterwards | spec AC5 |
| J7 | Request changes requires feedback (≥1 char); on submit the proposal version increments and the loop returns for decision | spec AC4 |
| J8 | Decline requires a reason and produces a clear declined state | spec AC5 |
| J9 | Every decision shows correct visible state; approval copy never implies the issue is done/merged (prove-before-done) | spec AC6 |
| J10 | Repeated clicks / second decision are no-ops (idempotent); invalid transitions impossible | spec §9 |
| J11 | Moving between inbox ↔ detail keeps state consistent (counts, pill, status) | DoD |
| J12 | Mock nature is honest: no copy claims messages are sent to a real agent or stored server-side | end_goal §4 |

## 3. Edge cases & robustness

| ID | Check | Spec ref |
|---|---|---|
| E1 | Typed answer below/above length limits handled (spec: questions 3–2000 chars) | research §3 |
| E2 | Very long descriptions/answers: clamped or scrollable, layout intact | spec §9 |
| E3 | Zero clarification messages → thread hidden, not broken | spec §9 |
| E4 | Empty states render (no pending requests; no issues match filters) | spec AC1 |
| E5 | Injected decision error (if implemented): inline error, input preserved, retry works | spec AC7 |
| E6 | Expired/deadline-passed state (if implemented): decision disabled with honest copy | spec §5 |

## 4. Visual comparison vs screenshots

| ID | Check |
|---|---|
| V1 | Persistent top nav matches: ziki logo, Zedu switcher, Product/Marketing/Security, Agents button, user chip, amber pts pill, bell badge |
| V2 | Tokens: page bg (~#F4F5FA/#F5F7FC), white cards ~16px radius + faint border, primary blue ~#1F5FD9/#2563EB, amber pill, pale-blue table headers |
| V3 | Status/risk pills = dot + text label, fully rounded — never colour-only |
| V4 | Typography hierarchy (bold headings/big numbers, regular body) consistent with refs |
| V5 | Spacing/alignment of cards, buttons, chips comparable to refs; new feature cards feel native, not bolted on |
| V6 | Responsive: desktop (~1440px), tablet (~768px), mobile (~375px) — no overflow, no clipped controls, decisions reachable |

## 5. Accessibility

| ID | Check |
|---|---|
| A1 | Keyboard-only: complete ask → clarify → all three decisions without a mouse |
| A2 | Visible focus indicator on every interactive element |
| A3 | Inputs/textarea have labels; buttons have accessible names; icon-only buttons labelled |
| A4 | Status changes announced (`aria-live="polite"`) for version bump + decision |
| A5 | Thread is an ordered list; decision controls are a labelled group |
| A6 | Contrast meets WCAG AA (amber pill, blue buttons, muted text); automated scan used as a filter only, not proof |
| A7 | Reduced-motion respected; long content usable on narrow screens |

## 6. Code & integration review

| ID | Check |
|---|---|
| C1 | One shared data model in `src/types/` — UI's local `BriefStatus` etc. mapped 1:1, no duplicate/competing enums (⚠ conflict flagged on board 2026-10-29) |
| C2 | Mock data isolated in `src/data/`; components receive state via the one Context store — no duplicated state |
| C3 | Status transitions enforced in the reducer, not just visually hidden in UI |
| C4 | No broken imports, dead props, or unused components left from parallel work |
| C5 | CSS: file-scoped classes (`.zk-*`), no global selector leaks beyond agreed global.css |
| C6 | Error handling on every interaction path that can fail |
| C7 | No unrelated changes outside each agent's owned folders; no misleading backend claims in code comments or UI copy |

## 7. Severity rubric

- **Blocker** — journey cannot complete, or approval implies work done, or build fails.
- **Major** — a DoD item or acceptance criterion fails; a11y blocks a user group.
- **Minor** — visual deviation from refs, polish, copy issues.
- **Nit** — cosmetic, no user impact.

## 8. Results log (fill after integration — see `TESTING.md`)

For every confirmed defect: severity · steps to reproduce · expected · actual · file/component · fix recommendation. Unverified concerns listed separately. No fabricated results.
