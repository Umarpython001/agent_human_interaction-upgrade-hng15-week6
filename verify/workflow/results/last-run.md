# WORKFLOW verification run — jsdom interaction suite

Date: 2026-10-29T01:09:43.845Z
Result: **54/54 passed, 0 failed**

| Test | Result |
|---|---|
| T1.1 status banner shows waiting-on-you state | PASS |
| T1.2 open question callout visible with the agent's question | PASS |
| T1.3 seeded agent question is the only thread message | PASS |
| T1.4 three suggestion chips offered | PASS |
| T1.5 decision controls exist and are disabled while the question is open | PASS |
| T1.6 honest disabled reason shown for decisions | PASS |
| T1.7 composer enabled and plan shows v1 without revised marker | PASS |
| T2.1 empty submission blocked with validation message | PASS |
| T2.2 1-character submission blocked | PASS |
| T2.3 over-2000-character submission blocked | PASS |
| T3.1 human answer appended, chronologically last | PASS |
| T3.2 composer cleared after successful send | PASS |
| T3.3 revision-in-progress banner shown, controls locked | PASS |
| T3.4 suggestions hidden while the agent is revising | PASS |
| T4.1 agent acknowledgment appended after the human answer | PASS |
| T4.2 plan shows v2 with revised marker | PASS |
| T4.3 changed steps are tagged | PASS |
| T4.4 banner announces v2 ready; decisions now enabled | PASS |
| T4.5 version history entry exists | PASS |
| T5.1 duplicate send click produced exactly one human message | PASS |
| T6.1 suggestion chip found and clickable | PASS |
| T6.2 agent ack matches the chosen suggestion | PASS |
| T6.3 revised plan reflects the redirect behaviour | PASS |
| T7.1 approve panel opens with optional note field | PASS |
| T7.2 approved outcome bound to version 2 | PASS |
| T7.3 approval copy never claims work is done (prove-before-done) | PASS |
| T7.4 decision controls are gone — repeated decision impossible | PASS |
| T7.5 banner confirms authorization-only state | PASS |
| T7.6 thread closed after decision with honest reason | PASS |
| T8.1 changes panel opens | PASS |
| T8.2 empty change request blocked with validation | PASS |
| T8.3 feedback appears in the thread and status shows changes-requested revision | PASS |
| T8.4 decision history traces the change request on v2 | PASS |
| T8.5 v3 lands and is marked revised | PASS |
| T8.6 approval after revision is bound to v3 (renewed decision) | PASS |
| T8.7 history retains the full trace across the renewed decision | PASS |
| T9.0 decline disabled while the question is still open | PASS |
| T9.1 empty decline blocked with validation | PASS |
| T9.2 declined outcome shows reason and version | PASS |
| T9.3 declined banner shown | PASS |
| T10.1 failed decision shows inline error, keeps input, no outcome recorded | PASS |
| T10.2 retry after failure succeeds with the preserved input | PASS |
| T10.3 failed question keeps the draft and shows an inline error | PASS |
| T11.1 decide before answering is rejected | PASS |
| T11.2 duplicate human message while revising is rejected | PASS |
| T11.3 stray agent revision while awaiting decision is rejected | PASS |
| T11.4 decision for a stale version is rejected | PASS |
| T11.5 second decision after approval is rejected | PASS |
| T12.1 thread is an ordered list | PASS |
| T12.2 composer textarea has a label | PASS |
| T12.3 decision controls are a labelled group | PASS |
| T12.4 live regions present for status + decision announcements | PASS |
| T12.5 buttons carry accessible names | PASS |
| T12.6 every decision control is keyboard-reachable (native button) | PASS |
