# ActionBriefCard (UI agent)

The agent's proposal card — the left column of the Clarification Loop demo.
Presentational only: it renders props, mutates nothing, decides nothing, and
never fabricates data.

## Files

| File | Purpose |
| --- | --- |
| `ActionBriefCard.tsx` | Component + exported `ActionBriefCardProps` contract |
| `actionBriefCard.css` | Scoped `.zk-brief` styles, mapped 1:1 onto `src/styles/tokens.css` |

Import directly (App.tsx pattern):

```tsx
import ActionBriefCard from "./components/action-brief/ActionBriefCard";
```

## Props (frozen by App.tsx)

Required (already wired by App):

- `status: RequestStatus` — from `src/types.ts`; pill label/tone from `src/lib/statusMeta.ts`
- `working?: boolean` — true while the agent is actively revising (transient phase)
- `agentName, agentLevel, agentEmoji`
- `issue` — `{ number, title, votes, type, priority, status, reported, comments }`
- `intention: string`
- `evidence: Array<string | { text; kind?: "fact"|"reported"|"assumption"; sourceLabel? }>`
- `risks: Array<string | { title; severity?: "low"|"medium"|"high"; detail?; mitigation? }>`
- `uncertainties: string[]`
- `estimate: string`
- `plans: PlanVersion[]` — last entry is the live version; earlier ones render as
  superseded history

Optional (supported, not yet wired — add to scenario/App when the data exists):

- `confidence?: number` + `confidenceReason?: string` → "Confidence · NN" chip + fineprint
- `deadlineLabel?: string` + `deadlineNote?: string` → SLA chip copy override. Without
  them the chip shows Ziki's verified standing rule: **"Answer within 4h"** with the
  note "The claim is released if it goes unanswered — waiting never approves anything."
  The chip renders only while the request is open (hidden for approved/declined).
- `className?: string`

### Evidence trust levels

Strings render plain (no badge, no false claim). Structured items render a
FACT / REPORTED / ASSUMPTION badge with distinct colour **and** border treatment
(never colour alone), plus a legend line. `src/data/scenario.ts` still supplies
plain strings, so the integrated app shows the plain form until LEAD adds `kind`.

## Behaviour notes

- Revision chrome (v2 chip, "What changed in vN" block, CHANGED IN V2 step badges,
  superseded `<details>` history) appears only when `plans.length > 1`.
- Long `intention` clamps to 6 lines with a keyboard-accessible Show more/less
  toggle (`aria-expanded`/`aria-controls`); no toggle renders when text fits.
- Status changes announce via `role="status"`; version is on the same live region.
- `prefers-reduced-motion: reduce` disables the chevron transition.
- Small text uses `--text-muted`, not `--text-subtle`, because subtle (#8a90a8)
  fails WCAG AA contrast at 11–13px.

## QA testid contract

`brief` (+ `data-version`, `data-status`), `brief-version` (text `v2 · revised`
when revised), `brief-revised-badge`, `brief-plan`, `brief-risks`,
`brief-estimate`, plus `brief-evidence`, `brief-uncertainties`,
`brief-intention`-area sections, `brief-deadline`, `brief-confidence`,
`brief-changes`.

## Verification (honest results, run 2026-10-29)

Isolated harness in `verify/` (own package.json; renders this component against
states derived from `src/data/scenario.ts`). `npm run verify` executes
typecheck → build → screenshots → axe + interaction checks.

- `tsc --noEmit` + vite build: **pass**
- axe-core WCAG 2.1 A/AA on all 6 scenarios (pending, revising, revised,
  approved, evidence-kinds, edge): **0 violations**
- 30/30 scripted interaction checks pass (keyboard toggle of superseded
  history, clamp expand 144px→312px with aria flips, SLA chip visible/open &
  hidden/approved, testids, live-region copy, reduced-motion ≈0s)
- 21 screenshots (`verify/results/`) at 1440/820/390, visually inspected

Not verified here: the integrated page (root `npm run build` currently fails in
WORKFLOW's `src/components/decision/**` + `clarification/**`, which still use
superseded status names) — covered by QA's `qa/` E2E once those files compile.
Known cosmetic artifact: the 🤖 emoji shows as □ only in the headless Linux
capture browser (no emoji font installed); real browsers render it.
