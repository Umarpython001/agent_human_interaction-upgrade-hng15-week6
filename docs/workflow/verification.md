# WORKFLOW verification report — Clarification loop + decision controls

> Author: WORKFLOW agent · Date: 2026-10-29
> Harness: `verify/workflow/` (isolated; does not depend on LEAD's shell, which does not exist yet)
> Raw results of the latest run: `verify/workflow/results/last-run.md`

## 1. How it was verified

- `npm run build` in `verify/workflow` → `tsc --noEmit` (strict, `noUnusedLocals/Parameters`)
  **passes**, then `vite build` **passes** (164.9 kB JS + 13.5 kB CSS, 38 modules).
- `npm test` → jsdom interaction suite (`scripts/run-tests.mjs`) drives the **real
  components** (bundled with esbuild, React 18 pinned to the repo-root copy) through the
  full journey: click, type, submit, simulated latency, simulated failure.
- **Result: 54/54 checks passed, 0 failed.**

## 2. What was covered (maps to QA plan IDs)

| QA ID | Covered by | Verified behaviour |
|---|---|---|
| J3, J4 | T1.2–T1.4, T3.1, T6.2 | Question visible; human reply appends chronologically last; suggestion chips drive the matching canned reply |
| J5 | T4.1–T4.5, T6.3, T8.5 | Ack lands after the answer; **v2 marker + "Changed" tags + version history** distinguish the revision; plan text reflects the chosen behaviour |
| J6, J9 | T7.2–T7.6 | Approve records the *displayed* version only; controls disappear (no repeat decision); copy states authorization only — never "done" |
| J7 | T8.1–T8.7 | Request changes blocked without feedback; feedback appears in the thread; **v3 requires a renewed approval**, history keeps the v2 change request |
| J8 | T9.0–T9.3 | Decline disabled until the question is answered; blocked without a reason; declined outcome shows reason + version |
| J10 | T5.1, T11.1–T11.5 | Duplicate send click = one message; reducer rejects decide-before-answer, double human message, stray revision, **stale-version decision**, second decision |
| J12 | header note, T7.3 | Mock honesty: example page states replies are local/preset; approval copy never claims completion |
| E1 | T2.1–T2.3 | <3 chars and >2000 chars blocked with inline messages |
| E5 | T10.1–T10.3 | Injected failure → inline error, **input preserved**, retry succeeds (decision + question paths) |
| A1–A5 | T12.1–T12.6 | Thread is `<ol>`; labelled composer; decision group `role="group"` + label; ≥2 `aria-live` regions; all controls are native buttons with accessible names (keyboard-reachable) |

Manual reasoning checks (not automated): focus management (panel opens focus the field;
terminal outcome receives focus), reduced-motion media query, responsive rules at ≤560 px,
WCAG-AA-oriented contrast values taken from ziki.dev's own tokens.

## 3. Defects found and fixed during verification

1. **Composer cleared too late** — draft now clears optimistically on submit and is
   restored on failure (nothing lost, no dead air while the agent "revises").
2. **Harness-only:** two-React-copies bug caused by `verify/node_modules` sitting between
   the harness and the repo root; fixed by aliasing react/react-dom/scheduler to the repo
   root in both the esbuild test bundler and the harness `vite.config.ts`.
   *(Not an app defect — but LEAD should know: any tooling under `verify/` inherits this.)*

## 4. Honest limitations

- **Root app build not runnable yet** — `npm run build` at repo root still fails because
  `src/main.tsx` / `App.tsx` / `src/store/` (LEAD-owned) do not exist. My components are
  verified in isolation; integration verification (routes `/inbox`, shell, real store)
  must be done by QA after LEAD lands the shell.
- **No real backend** — all agent replies come from preset recipes in
  `src/data/scenario.ts`; nothing is transmitted or persisted. The example page says so.
- **No browser screenshot run** — the environment has no Chrome/Chromium and Playwright's
  browser download was out of scope; DOM-level jsdom assertions + a production `vite build`
  were used instead. Visual QA against the screenshots remains with QA/LEAD.
- **Status enum divergence unresolved** (see board post): built against `src/types.ts`
  as implemented; if LEAD ratifies §4's names, one import changes on my side.
- `changes_requested` is a recorded decision, not a status value — matches LEAD's types;
  flag if the store later needs a persistent `changes_requested` status.
