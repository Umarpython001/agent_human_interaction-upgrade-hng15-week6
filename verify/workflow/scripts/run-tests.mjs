/**
 * WORKFLOW components — jsdom interaction test suite.
 *
 * Verifies the clarification loop + decision controls end to end by driving
 * the real components (bundled with esbuild) inside jsdom: asking/answering,
 * chronological order, revision visibility, all three decisions, required
 * feedback, double-click guards, invalid transitions, failure retry, and
 * accessibility spot checks.
 *
 * Run: npm test   (from verify/workflow)
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";

const here = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(here, "..");
const repoRoot = path.resolve(projectRoot, "..", "..");
const tmpDir = path.join(projectRoot, "tmp");
const resultsDir = path.join(projectRoot, "results");
fs.mkdirSync(tmpDir, { recursive: true });
fs.mkdirSync(resultsDir, { recursive: true });

/* ------------------------------------------------------------------ */
/* 1. Bundle the test entry                                            */
/* ------------------------------------------------------------------ */
/*
 * IMPORTANT: `verify/node_modules` (the UI agent's harness install) sits
 * between this harness and the repo root, so plain node resolution would give
 * the entry `verify/node_modules/react` while the components under `src/`
 * get the ROOT `react` — two React copies and an instant "invalid hook call".
 * Alias react/react-dom/scheduler to the repo root (the app's real deps) so
 * exactly one copy is bundled.
 */
const reactRoot = path.join(repoRoot, "node_modules");
const requireLocal = createRequire(import.meta.url);
// esbuild is a build-time tool only — resolved from the nearest install
// (verify/node_modules, shipped with vite 5). It never affects bundle contents.
const esbuild = requireLocal("esbuild");
const { JSDOM } = requireLocal("jsdom"); // installed locally in verify/workflow

const singleReact = {
  react: path.join(reactRoot, "react"),
  "react-dom": path.join(reactRoot, "react-dom"),
  scheduler: path.join(reactRoot, "scheduler"),
};

await esbuild.build({
  entryPoints: [path.join(projectRoot, "tests", "entry.tsx")],
  bundle: true,
  write: true,
  outfile: path.join(tmpDir, "bundle.js"),
  format: "iife",
  platform: "browser",
  jsx: "automatic",
  alias: singleReact,
  define: { "process.env.NODE_ENV": '"production"' },
  logLevel: "warning",
  absWorkingDir: projectRoot,
});

/* ------------------------------------------------------------------ */
/* 2. jsdom + helpers                                                  */
/* ------------------------------------------------------------------ */
const dom = new JSDOM(
  '<!doctype html><html><body><div id="root"></div></body></html>',
  { pretendToBeVisual: true, url: "http://localhost/", runScripts: "outside-only" }
);
const { window } = dom;
const doc = window.document;

window.eval(fs.readFileSync(path.join(tmpDir, "bundle.js"), "utf8"));

const qa = (sel) => [...doc.querySelectorAll(sel)];
const q = (sel) => doc.querySelector(sel);
const bodyText = () => doc.body.textContent.replace(/\s+/g, " ");
const byText = (sel, needle) =>
  qa(sel).find((el) => el.textContent.replace(/\s+/g, " ").includes(needle));
const click = (el) =>
  el.dispatchEvent(new window.MouseEvent("click", { bubbles: true, cancelable: true }));
const setValue = (el, value) => {
  const proto =
    el.tagName === "TEXTAREA"
      ? window.HTMLTextAreaElement.prototype
      : window.HTMLInputElement.prototype;
  Object.getOwnPropertyDescriptor(proto, "value").set.call(el, value);
  el.dispatchEvent(new window.Event("input", { bubbles: true }));
};
const settle = (ms = 10) => new Promise((r) => setTimeout(r, ms));
const REVISION_MS = 20;
const afterRevision = () => settle(REVISION_MS + 60);

const results = [];
function check(name, cond, detail = "") {
  results.push({ name, pass: !!cond, detail: cond ? "" : detail });
  const mark = cond ? "PASS" : "FAIL";
  console.log(`${mark}  ${name}${!cond && detail ? ` — ${detail}` : ""}`);
}

/* ------------------------------------------------------------------ */
/* 3. Boot                                                             */
/* ------------------------------------------------------------------ */
window.__harness.mount(doc.getElementById("root"), REVISION_MS);
await settle();

const reset = async () => {
  click(q(".zk-wfx__reset"));
  await settle();
};

/* ------------------------------------------------------------------ */
/* T1 — initial state                                                 */
/* ------------------------------------------------------------------ */
check(
  "T1.1 status banner shows waiting-on-you state",
  q(".zk-wfx__banner")?.textContent.includes("Waiting on you"),
  bodyText().slice(0, 200)
);
check(
  "T1.2 open question callout visible with the agent's question",
  q(".zk-wfx__question")?.textContent.includes("which behaviour should the page show")
);
check(
  "T1.3 seeded agent question is the only thread message",
  qa(".zk-ct__msg").length === 1 && q(".zk-ct__msg")?.classList.contains("zk-ct__msg--agent")
);
check("T1.4 three suggestion chips offered", qa(".zk-ct__chip").length === 3);
check(
  "T1.5 decision controls exist and are disabled while the question is open",
  qa(".zk-dc__btn--approve").length === 1 &&
    q(".zk-dc__btn--approve").disabled === true
);
check(
  "T1.6 honest disabled reason shown for decisions",
  q(".zk-dc__disabled-reason")?.textContent.includes("Answer the agent's question")
);
check(
  "T1.7 composer enabled and plan shows v1 without revised marker",
  q(".zk-ct__input").disabled === false &&
    q(".zk-wfx__version")?.textContent.includes("v1") &&
    !q(".zk-wfx__revised")
);

/* ------------------------------------------------------------------ */
/* T2 — composer validation                                            */
/* ------------------------------------------------------------------ */
click(q(".zk-ct__send"));
await settle();
check(
  "T2.1 empty submission blocked with validation message",
  q(".zk-ct__error")?.textContent.includes("at least 3 characters") &&
    qa(".zk-ct__msg").length === 1
);

setValue(q(".zk-ct__input"), "x");
click(q(".zk-ct__send"));
await settle();
check(
  "T2.2 1-character submission blocked",
  q(".zk-ct__error")?.textContent.includes("at least 3 characters")
);

setValue(q(".zk-ct__input"), "y".repeat(2001));
click(q(".zk-ct__send"));
await settle();
check(
  "T2.3 over-2000-character submission blocked",
  q(".zk-ct__error")?.textContent.includes("under 2000 characters")
);

/* ------------------------------------------------------------------ */
/* T3 — asking with a typed answer                                    */
/* ------------------------------------------------------------------ */
setValue(q(".zk-ct__input"), "Please keep it in place with a retry link.");
click(q(".zk-ct__send"));
await settle();
const msgsAfterAsk = qa(".zk-ct__msg");
check(
  "T3.1 human answer appended, chronologically last",
  msgsAfterAsk.length === 2 &&
    msgsAfterAsk[1].classList.contains("zk-ct__msg--human") &&
    msgsAfterAsk[1].textContent.includes("retry link")
);
check("T3.2 composer cleared after successful send", q(".zk-ct__input").value === "");
check(
  "T3.3 revision-in-progress banner shown, controls locked",
  q(".zk-wfx__banner")?.textContent.includes("preparing version 2") &&
    q(".zk-ct__send").disabled === true &&
    q(".zk-dc__btn--approve").disabled === true
);
check(
  "T3.4 suggestions hidden while the agent is revising",
  qa(".zk-ct__chip").length === 0
);

/* ------------------------------------------------------------------ */
/* T4 — revision lands, distinguishable                               */
/* ------------------------------------------------------------------ */
await afterRevision();
check(
  "T4.1 agent acknowledgment appended after the human answer",
  qa(".zk-ct__msg").length === 3 &&
    qa(".zk-ct__msg")[2].classList.contains("zk-ct__msg--agent") &&
    qa(".zk-ct__msg")[2].textContent.includes("noted")
);
check(
  "T4.2 plan shows v2 with revised marker",
  q(".zk-wfx__version")?.textContent.includes("v2") && !!q(".zk-wfx__revised")
);
check(
  "T4.3 changed steps are tagged",
  qa(".zk-wfx__step--changed").length >= 1 && !!q(".zk-wfx__step-tag")
);
check(
  "T4.4 banner announces v2 ready; decisions now enabled",
  q(".zk-wfx__banner")?.textContent.includes("Version 2 is ready") &&
    q(".zk-dc__btn--approve").disabled === false
);
check(
  "T4.5 version history entry exists",
  q(".zk-wfx__versions")?.textContent.includes("v1") &&
    q(".zk-wfx__versions")?.textContent.includes("v2")
);

/* ------------------------------------------------------------------ */
/* T5 — double-click on send is a no-op                               */
/* ------------------------------------------------------------------ */
await reset();
setValue(q(".zk-ct__input"), "Does this affect the login page too?");
click(q(".zk-ct__send"));
click(q(".zk-ct__send")); // same tick duplicate
await afterRevision();
check(
  "T5.1 duplicate send click produced exactly one human message",
  qa(".zk-ct__msg--human").length === 1,
  `human messages: ${qa(".zk-ct__msg--human").length}`
);

/* ------------------------------------------------------------------ */
/* T6 — suggestion chip drives the matching recipe                    */
/* ------------------------------------------------------------------ */
await reset();
const redirectChip = byText(".zk-ct__chip", "Redirect to /invite");
check("T6.1 suggestion chip found and clickable", !!redirectChip);
click(redirectChip);
await afterRevision();
const agentMsgs = qa(".zk-ct__msg--agent");
check(
  "T6.2 agent ack matches the chosen suggestion",
  agentMsgs[agentMsgs.length - 1].textContent.includes("settings-style banner")
);
check(
  "T6.3 revised plan reflects the redirect behaviour",
  q(".zk-wfx__plan")?.textContent.includes("/invite?error=missing-params")
);

/* ------------------------------------------------------------------ */
/* T7 — approve the current version                                   */
/* ------------------------------------------------------------------ */
click(q(".zk-dc__btn--approve"));
await settle();
check(
  "T7.1 approve panel opens with optional note field",
  !!q(".zk-dc__panel") && !!byText(".zk-dc__label", "optional")
);
setValue(q(".zk-dc__textarea"), "Looks good — go ahead.");
click(byText(".zk-dc__btn", "Confirm approval of v2"));
await settle();
const outcome = q(".zk-dc__outcome");
check(
  "T7.2 approved outcome bound to version 2",
  outcome?.classList.contains("zk-dc__outcome--approved") &&
    outcome.textContent.includes("Approved · version 2") &&
    outcome.textContent.includes("Looks good — go ahead.")
);
check(
  "T7.3 approval copy never claims work is done (prove-before-done)",
  outcome?.textContent.includes("has not started or completed the work")
);
check(
  "T7.4 decision controls are gone — repeated decision impossible",
  qa(".zk-dc__btn--approve").length === 0 && qa(".zk-dc__btn--decline").length === 0
);
check(
  "T7.5 banner confirms authorization-only state",
  q(".zk-wfx__banner")?.textContent.includes("Approved — version 2 is authorized")
);
check(
  "T7.6 thread closed after decision with honest reason",
  q(".zk-ct__input").disabled === true &&
    q(".zk-ct__disabled-reason")?.textContent.includes("clarification loop is closed")
);

/* ------------------------------------------------------------------ */
/* T8 — request changes (required feedback) → renewed decision on v3  */
/* ------------------------------------------------------------------ */
await reset();
click(byText(".zk-ct__chip", "Show the inline error state"));
await afterRevision();
click(q(".zk-dc__btn--changes"));
await settle();
check("T8.1 changes panel opens", !!q(".zk-dc__panel"));
click(byText(".zk-dc__btn", "Send change request"));
await settle();
check(
  "T8.2 empty change request blocked with validation",
  q(".zk-dc__error")?.textContent.includes("needs feedback") &&
    q(".zk-dc__textarea").getAttribute("aria-invalid") === "true"
);
setValue(
  q(".zk-dc__textarea"),
  "Don't render the error in place — show the expired-invite screen instead."
);
click(byText(".zk-dc__btn", "Send change request"));
await settle();
check(
  "T8.3 feedback appears in the thread and status shows changes-requested revision",
  qa(".zk-ct__msg--human").some((m) =>
    m.textContent.includes("expired-invite screen")
  ) && q(".zk-wfx__banner")?.textContent.includes("Changes requested")
);
check(
  "T8.4 decision history traces the change request on v2",
  q(".zk-dc__history")?.textContent.includes("Changes requested · v2") &&
    q(".zk-dc__history")?.textContent.includes("expired-invite screen")
);
await afterRevision();
check(
  "T8.5 v3 lands and is marked revised",
  q(".zk-wfx__version")?.textContent.includes("v3") && !!q(".zk-wfx__revised")
);
click(q(".zk-dc__btn--approve"));
await settle();
click(byText(".zk-dc__btn", "Confirm approval of v3"));
await settle();
check(
  "T8.6 approval after revision is bound to v3 (renewed decision)",
  q(".zk-dc__outcome")?.textContent.includes("Approved · version 3")
);
check(
  "T8.7 history retains the full trace across the renewed decision",
  qa(".zk-dc__history-item").length >= 1 &&
    q(".zk-dc__history")?.textContent.includes("Changes requested · v2")
);

/* ------------------------------------------------------------------ */
/* T9 — decline (required reason)                                     */
/* ------------------------------------------------------------------ */
await reset();
check(
  "T9.0 decline disabled while the question is still open",
  q(".zk-dc__btn--decline").disabled === true
);
click(byText(".zk-ct__chip", "Treat it as an expired invite"));
await afterRevision();
click(q(".zk-dc__btn--decline"));
await settle();
click(byText(".zk-dc__btn", "Confirm decline"));
await settle();
check(
  "T9.1 empty decline blocked with validation",
  q(".zk-dc__error")?.textContent.includes("decline needs a reason")
);
setValue(
  q(".zk-dc__textarea"),
  "This duplicates the fix in PR #1851 — close in favour of that one."
);
click(byText(".zk-dc__btn", "Confirm decline"));
await settle();
check(
  "T9.2 declined outcome shows reason and version",
  q(".zk-dc__outcome")?.classList.contains("zk-dc__outcome--declined") &&
    q(".zk-dc__outcome")?.textContent.includes("Declined · version 2") &&
    q(".zk-dc__outcome")?.textContent.includes("PR #1851")
);
check(
  "T9.3 declined banner shown",
  q(".zk-wfx__banner")?.textContent.includes("Declined — version 2")
);

/* ------------------------------------------------------------------ */
/* T10 — simulated failure: error, kept input, retry                  */
/* ------------------------------------------------------------------ */
await reset();
click(byText(".zk-ct__chip", "Show the inline error state"));
await afterRevision();
const failBox = q(".zk-wfx__tool input");
click(failBox); // React checkboxes toggle via click (activation behavior)
await settle();

click(q(".zk-dc__btn--approve"));
await settle();
setValue(q(".zk-dc__textarea"), "Keep this note on retry.");
click(byText(".zk-dc__btn", "Confirm approval"));
await settle();
check(
  "T10.1 failed decision shows inline error, keeps input, no outcome recorded",
  q(".zk-dc__error")?.textContent.includes("simulated network failure") &&
    q(".zk-dc__textarea").value === "Keep this note on retry." &&
    !q(".zk-dc__outcome")
);
// The toggle is one-shot: the failure auto-resets it when consumed, so the
// retry below runs against a healthy "network" without touching the box.
click(byText(".zk-dc__btn", "Confirm approval"));
await settle();
check(
  "T10.2 retry after failure succeeds with the preserved input",
  q(".zk-dc__outcome--approved") &&
    q(".zk-dc__outcome")?.textContent.includes("Keep this note on retry.")
);

await reset();
click(failBox);
await settle();
setValue(q(".zk-ct__input"), "Will this text survive a failure?");
click(q(".zk-ct__send"));
await settle();
check(
  "T10.3 failed question keeps the draft and shows an inline error",
  q(".zk-ct__error")?.textContent.includes("simulated network failure") &&
    q(".zk-ct__input").value === "Will this text survive a failure?" &&
    qa(".zk-ct__msg--human").length === 0
);

/* ------------------------------------------------------------------ */
/* T11 — reducer guards: invalid transitions are no-ops (pure)        */
/* ------------------------------------------------------------------ */
{
  const { reducer, createInitial } = window.__harness;
  const plan = { version: 1, time: "09:12", summary: "s", steps: [{ id: "a", text: "t" }] };
  const seed = createInitial(plan, [{ id: "m1", author: "agent", body: "q", time: "09:12" }]);

  // decide while still awaiting_answer (question open) → ignored
  let s = reducer(seed, {
    type: "decide",
    record: { version: 1, decision: "approved", time: "09:45" },
  });
  check("T11.1 decide before answering is rejected", s === seed);

  // human message while revising → ignored
  const revising = reducer(seed, {
    type: "human_message",
    message: { id: "m2", author: "human", body: "a", time: "09:20" },
  });
  const dup = reducer(revising, {
    type: "human_message",
    message: { id: "m3", author: "human", body: "b", time: "09:21" },
  });
  check("T11.2 duplicate human message while revising is rejected", dup === revising);

  // agent revision while not revising → ignored
  const ready = reducer(revising, {
    type: "agent_revision",
    ack: "ack",
    plan: { version: 2, time: "09:30", summary: "s2", steps: [{ id: "b", text: "t2" }] },
  });
  const stray = reducer(ready, {
    type: "agent_revision",
    ack: "ack2",
    plan: { version: 3, time: "09:31", summary: "s3", steps: [{ id: "c", text: "t3" }] },
  });
  check("T11.3 stray agent revision while awaiting decision is rejected", stray === ready);

  // wrong-version decision → ignored
  const wrongVer = reducer(ready, {
    type: "decide",
    record: { version: 1, decision: "approved", time: "09:45" },
  });
  check("T11.4 decision for a stale version is rejected", wrongVer === ready);

  // duplicate terminal decision → ignored
  const approved = reducer(ready, {
    type: "decide",
    record: { version: 2, decision: "approved", time: "09:45" },
  });
  const dupDecide = reducer(approved, {
    type: "decide",
    record: { version: 2, decision: "declined", time: "09:46" },
  });
  check("T11.5 second decision after approval is rejected", dupDecide === approved);
}

/* ------------------------------------------------------------------ */
/* T12 — accessibility spot checks                                    */
/* ------------------------------------------------------------------ */
await reset();
check("T12.1 thread is an ordered list", !!q("ol.zk-ct__list"));
const composer = q(".zk-ct__input");
const composerLabel = doc.querySelector(`label[for="${composer.id}"]`);
check("T12.2 composer textarea has a label", !!composerLabel);
check(
  "T12.3 decision controls are a labelled group",
  q(".zk-dc__controls")?.getAttribute("role") === "group" &&
    !!q(".zk-dc__controls")?.getAttribute("aria-label")
);
check(
  "T12.4 live regions present for status + decision announcements",
  qa('[aria-live="polite"]').length >= 2
);
check(
  "T12.5 buttons carry accessible names",
  qa(".zk-dc__btn, .zk-ct__send, .zk-ct__chip").every(
    (b) => (b.textContent ?? "").trim().length > 0
  )
);
const changeBtns = qa(".zk-dc__btn");
check(
  "T12.6 every decision control is keyboard-reachable (native button)",
  changeBtns.length === 3 && changeBtns.every((b) => b.tagName === "BUTTON")
);

/* ------------------------------------------------------------------ */
/* 4. Report                                                          */
/* ------------------------------------------------------------------ */
const passed = results.filter((r) => r.pass).length;
const failed = results.length - passed;
const lines = [
  "# WORKFLOW verification run — jsdom interaction suite",
  "",
  `Date: ${new Date().toISOString()}`,
  `Result: **${passed}/${results.length} passed, ${failed} failed**`,
  "",
  "| Test | Result |",
  "|---|---|",
  ...results.map((r) => `| ${r.name} | ${r.pass ? "PASS" : "FAIL"} |`),
  "",
];
fs.writeFileSync(path.join(resultsDir, "last-run.md"), lines.join("\n"));

console.log(`\n${passed}/${results.length} passed, ${failed} failed.`);
window.__harness.unmount();
dom.window.close();
process.exit(failed > 0 ? 1 : 0);
