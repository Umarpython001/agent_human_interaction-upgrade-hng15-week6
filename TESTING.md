# TESTING.md — Independent QA verification results

> Author: QA agent · Last run: 2026-10-29 · Build under test: current `dist/` (green)
> Method: automated headless-browser harness (`qa/`) + manual visual/contrast review.
> Honesty rule: every result below was produced by a real run. SKIP = not applicable /
> not supplied by data — never counted as a pass.

## How to reproduce

```bash
npm install && npm run build          # produce dist/
cd qa && npm install                  # playwright + axe (browsers cached)
npm run smoke                         # end-to-end journey (36 checks)
npm run a11y                          # axe WCAG 2.1 A/AA scan
# NOTE (WSL/Windows split): the harness serves dist/ on a Linux-side port and drives
# Linux chromium. If chromium fails to launch with "libnspr4.so not found", export
# LD_LIBRARY_PATH pointing at extracted libnspr4/libnss3/libasound2t64 (no sudo needed).
```

## Summary

| Area | Result |
|---|---|
| Build (`npm run build`) | ✅ GREEN — tsc + vite, 24 modules, ~90ms |
| End-to-end journey (smoke) | ✅ **36 / 36 pass**, 0 fail, 0 skip |
| State machine (data-status) | ✅ all 5 transitions correct |
| Accessibility (axe, WCAG 2.1 A/AA) | ❌ **1 violation type — color-contrast, 8 nodes, SERIOUS** |
| Responsive (375px) | ❌ **horizontal overflow — top nav, 70px** |
| Keyboard-only path | ✅ answer input reachable, focus visible |
| Runtime console | ✅ clean, no errors |

## Verified working (evidence: `qa/scripts/smoke.mjs`, 36 PASS)

- **Brief comprehension (J2):** intention, plan steps, evidence, risks, uncertainties,
  estimate, agent identity/level, issue #129 context all render. Confidence chip (·65)
  and SLA chip ("Answer within 4h") present — research refinements #1 and #2 landed.
- **Clarification (J3/J4):** question visible; 3 suggested answers + free-text input;
  Post answer disabled when empty; submitted answer appends to thread and the newest
  message is the agent's reply (order preserved, `data-author` verified).
- **Revision (J5):** plan v1→v2; "Revised" badge; "What changed" summary; changed steps
  labelled in text ("changed in v2"), not colour-only; superseded v1 still reachable.
- **Decisions (J6–J9):** controls appear at `revised_awaiting_review`; request-changes
  requires feedback (submit disabled when empty) and bumps v2→v3; decline requires a
  reason (confirm disabled when empty); approve/decline each set the correct terminal
  status and remove the controls (no repeat clicks).
- **Prove-before-done (J9):** approved banner explicitly says *"Approval authorizes the
  work; it is not completion. The issue stays open…"*; declined copy keeps the issue open.
  No done/merged/deployed claim anywhere.
- **Honesty (J12):** footer disclaimer present ("simulated locally… nothing is sent to
  Ziki or any real agent").
- **State machine (S1–S5):** `in_clarification → revised_awaiting_review →
  changes_requested → revised_awaiting_review → approved` and `→ declined` all asserted
  via `data-status` on `[data-testid="request-detail"]`.

## Confirmed defects

### QA-001 · SERIOUS · Accessibility: muted text fails WCAG AA contrast (8 nodes)
- **Where:** `src/styles/tokens.css` → `--text-subtle: #8a90a8` (line 13), applied via
  `var(--text-muted)` in `src/styles/global.css`.
- **Measured:** `#8a90a8` on white = **3.16:1**; on page bg `#f4f5fa` = **2.91:1**.
  WCAG AA requires **4.5:1** for normal-size text. Fails on both surfaces.
- **Affected (axe, current build, 8 nodes):** `.breadcrumb`, `.card-kicker`
  (clarification/decision headers), `.s-blurb` (all 3 suggested-answer blurbs),
  `.msg-author` (thread author·time), and other subtle labels.
- **Impact:** low-vision users cannot read secondary but meaningful text (why the agent
  asks, who said what, suggested-answer consequences). Automated axe flags it as
  "serious"; it is a genuine barrier, not a false positive.
- **Recommended fix (one line, LEAD-owned token):** darken `--text-subtle` to a value
  that clears 4.5:1 on **both** `#fff` and `#f4f5fa`. Verified candidates:
  `#686e85` (5.05 / 4.64), `#636980` (5.44 / 4.99), or `#5f6577` (5.81 / 5.34).
  **`#5f6577` is the real ziki.dev `--zk-muted` value** the UI agent extracted earlier —
  so it keeps the prototype faithful to the source product while passing AA.
- **Component/file:** `src/styles/tokens.css:13`.
- **Not a defect:** the brief card (`.zk-brief__*`, UI-owned) already uses a darker,
  passing muted tone; this is isolated to the older `global.css` elements + the token.

### QA-002 · SERIOUS · Responsive: top nav overflows at 375px (70px horizontal scroll)
- **Where:** `src/components/TopNav.tsx` + its rules in `src/styles/global.css` (LEAD-owned).
- **Measured:** at a 375px viewport, `document.scrollWidth = 445px` (70px overflow).
  Widest elements: `.topnav-right` (right=441), `.bell` (right=441), `.bell-badge`
  (right=445), `.user-chip` (right=405).
- **Cause:** the nav keeps the full desktop row (logo · workspace · Product/Marketing/
  Security · Agents · user chip · points · bell) at mobile width; it neither wraps nor
  collapses, so it pushes past the viewport.
- **Impact:** violates the DoD "works on mobile"; users must scroll horizontally and
  the bell/points are off-screen.
- **Recommended fix:** below ~640px, hide non-essential nav items (Marketing/Security,
  points pill, user name) or collapse into a menu; allow `.topnav-right` to shrink/wrap.
  Re-test `scrollWidth <= clientWidth` at 375px.
- **Component/file:** `src/components/TopNav.tsx`, `src/styles/global.css`.

## Unverified / deferred (stated honestly)

- **Emoji glyphs render as empty boxes** (🤖 agent avatar, 🏆 trophy, 📶 signal) in the
  headless capture. Most likely a **headless-font artifact**, not an app defect — but on
  a machine without an emoji font the avatar would be blank. Worth a fallback (initials)
  if emoji can't be guaranteed. **Not confirmed as a real defect** (I cannot reproduce on
  a normal desktop browser from here).
- **Multiple requests / inbox list / expired state:** the current build is a **single
  request, single page** (no `/inbox` list, no second request, no `expired` status).
  The spec's S1 (inbox list, ≥2 requests, tab counts) and the `expired`/injected-error
  edge cases (E5/E6) are **not implemented**, so I could not test them. This is a scope
  gap vs `docs/research/04_implementation_spec.md` §8 AC1, not a bug in what exists —
  LEAD/RESEARCH to confirm the intended scope. end_goal.md permits a single focused
  interface, so this may be a deliberate, acceptable reduction.
- **Visual diff vs screenshots:** layout, nav, cards, pills, colours, and hierarchy are
  close to the reference screenshots (manual review of `docs/qa/screenshot-initial.png`).
  No material deviation found beyond QA-001/002. A pixel-level diff was not performed.

## Acceptance criteria (spec §8) — status

| # | Criterion | Status |
|---|---|---|
| 1 | Inbox lists requests + counts; empty state | ⚠️ not implemented (single page; see above) |
| 2 | Brief renders all fields, no fabricated data | ✅ |
| 3 | Clarify: immutable row + status flip | ✅ |
| 4 | Request-changes needs feedback; version bumps; "v2 revised" marker | ✅ |
| 5 | Decline needs reason; approve works | ✅ |
| 6 | Decision updates status; approval ≠ done | ✅ |
| 7 | Failed decision shows error, keeps input | ⚠️ not implemented (no failure path in demo) |
| 8 | Keyboard-only path; visible focus; Enter submits | ✅ (focus verified; Enter-submit not separately asserted) |
| 9 | No changes outside owned files | ✅ (per board + file review) |

**Release-blocking:** none of QA-001/QA-002 block a *demo*, but both should be fixed
before any review/demo: QA-001 is an accessibility barrier, QA-002 breaks the stated
mobile requirement. Both are one-file, low-risk fixes in LEAD-owned code.
