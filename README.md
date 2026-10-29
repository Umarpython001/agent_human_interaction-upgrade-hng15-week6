# Ziki · Clarification Loop Demo

A small, frontend-only, interactive prototype demonstrating the **Clarification Loop**:
an AI agent identifies an ambiguity in a software issue, asks the human a specific
question instead of guessing, incorporates the answer into a revised plan, and only then
asks for an informed decision (Approve / Request changes / Decline).

One realistic scenario throughout: **issue #129 — "Invitation pages hang on an infinite
spinner when the invite link is missing required parameters."** The agent, `Umar-Solver`,
has a plan but doesn't know which fallback behaviour the product wants — three patterns
already exist in the app.

## Run it

```bash
npm install
npm run dev        # http://localhost:5173
```

Production build / static preview:

```bash
npm run build      # type-checks (tsc) + bundles to dist/
npm run preview    # serves dist/ on http://localhost:4173
```

No backend, no environment variables, no network calls at runtime.

## The interaction flow

1. **Agent request** — the Action Brief presents the agent's intention, evidence, plan
   (v1), risks, and the flagged uncertainty, with a "Waiting on you" status.
2. **Clarification** — the agent's question with three suggested answers plus free text.
3. **Answer** — clicking a suggested answer (or posting typed text) appends it to the
   conversation; the agent "revises" (simulated ~1.4 s delay) and acknowledges.
4. **Revised plan** — plan **v2** renders with changed steps highlighted, a
   "What changed" summary, and v1 preserved as superseded history.
5. **Decision** — Approve (explicitly worded so approval ≠ completion), Request changes
   (free-text feedback → the agent produces v3 and the controls reopen), or Decline
   (guarded by a confirm step → terminal declined state).
6. Contradictory/repeated decisions are impossible: each version accepts one decision,
   and terminal states lock the controls.

## Mock vs real

- All state is local React state (`useReducer` + Context); the store in `src/store/`
  is the single source of truth.
- The agent's replies are **predetermined** in `src/data/scenario.ts` — the mock-data
  boundary. Swapping in a real API later means replacing that file's builders, not the UI.
- Nothing is transmitted to Ziki or any real agent. Vocabulary (escalation types,
  question/answer immutability, proposal versioning) follows Ziki's public agent spec
  at https://ziki.dev/llms.txt.

## Structure

```
src/
  main.tsx App.tsx          # entry + page shell (lead)
  styles/tokens.css         # design tokens extracted from Ziki screenshots
  styles/global.css
  types.ts                  # shared data model
  lib/statusMeta.ts         # canonical status labels/colours
  data/scenario.ts          # mock scenario + deterministic agent replies
  store/                    # reducer + context (single source of truth)
  components/
    TopNav.tsx              # Ziki-style header
    action-brief/           # proposal card (intention, evidence, plan versions…)
    clarification/          # question, suggested answers, composer, thread
    decision/               # status banner + approve/request-changes/decline
```

## Accessibility & responsive

Semantic landmarks and buttons, `aria-live` decision banner, labelled inputs, visible
focus rings, keyboard-operable suggested answers, and a single-column layout below
1020 px with the top-nav collapsing on small screens.
