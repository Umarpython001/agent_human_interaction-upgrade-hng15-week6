// QA end-to-end journey smoke test for the Ziki Clarification Loop demo.
//
// Drives the real UI in a headless browser the way a human would and asserts the
// actual state machine via `data-testid="request-detail"` (`data-status` +
// `data-version`) plus the published data-testid contract. Checks acceptance
// criteria from docs/research/04_implementation_spec.md §8 and docs/qa/test_plan.md.
// Nothing here modifies app code.
//
//   node scripts/smoke.mjs                 # serve dist/ and run all checks
//   BASE_URL=... node scripts/smoke.mjs    # test an already-running server
//
// Exit code: 0 = all pass, 1 = at least one FAIL. SKIP is never a pass.
import { chromium } from "playwright";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { existsSync } from "node:fs";
import { serveDir } from "./_serve.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const distDir = resolve(here, "../../dist");
const AGENT_DELAY = 1400; // matches src/App.tsx AGENT_DELAY
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

const results = [];
function record(id, name, status, note = "") {
  results.push({ id, name, status, note });
  const icon = { PASS: "✅", FAIL: "❌", SKIP: "⏭️ " }[status];
  console.log(`${icon} [${id}] ${name}${note ? ` — ${note}` : ""}`);
}

async function main() {
  let base = process.env.BASE_URL;
  let stop = null;
  if (!base) {
    if (!existsSync(distDir)) {
      console.error("dist/ not found. Run `npm run build` in the project root, or set BASE_URL.");
      process.exit(1);
    }
    const server = await serveDir(distDir);
    base = server.origin;
    stop = () => server.close();
  }
  console.log(`Target: ${base}\n`);

  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  const consoleErrors = [];
  page.on("console", (m) => m.type() === "error" && consoleErrors.push(m.text()));
  page.on("pageerror", (e) => consoleErrors.push(String(e)));

  try {
    await runJourney(page, base, consoleErrors);
  } finally {
    await browser.close();
    if (stop) await stop();
  }
  report(consoleErrors);
}

// --- state helpers (bound to the request-detail contract) -----------------
const detail = (page) => page.locator('[data-testid="request-detail"]');
const getStatus = (page) => detail(page).getAttribute("data-status");
const getVersion = async (page) => Number(await detail(page).getAttribute("data-version"));

async function runJourney(page, base, consoleErrors) {
  await page.goto(base, { waitUntil: "networkidle" });
  record("B2", "App loads without runtime errors",
    consoleErrors.length === 0 ? "PASS" : "FAIL",
    consoleErrors.length ? consoleErrors.join(" | ") : "clean console");

  // ---- initial state machine -------------------------------------------
  record("S1", "Initial status is in_clarification (human's move)",
    (await getStatus(page)) === "in_clarification" ? "PASS" : "FAIL",
    `status=${await getStatus(page)}`);

  // ---- J2: brief comprehensibility -------------------------------------
  const sections = {
    "J2a": ['[data-testid="brief"] .zk-brief__clamp', "Intention"],
    "J2b": ['[data-testid="brief-plan"] li', "Plan steps"],
    "J2c": ['[data-testid="brief-evidence"] li', "Evidence"],
    "J2d": ['[data-testid="brief-risks"] li', "Risks"],
    "J2e": ['[data-testid="brief-uncertainties"] li', "Uncertainties"],
    "J2f": ['[data-testid="brief-estimate"]', "Estimate chip"],
  };
  for (const [id, [sel, label]] of Object.entries(sections)) {
    const n = await page.locator(sel).count();
    record(id, `Brief shows ${label}`, n > 0 ? "PASS" : "FAIL", `${n} found`);
  }
  record("J2g", "Agent identity + level shown",
    (await page.locator(".zk-brief__agent-name").count()) > 0 &&
    (await page.locator(".zk-brief__agent-sub").count()) > 0 ? "PASS" : "FAIL");
  record("J2h", "Issue #129 context shown",
    (await page.locator(".zk-brief__issue-title").count()) > 0 ? "PASS" : "FAIL");
  // research §7 refinements (confidence + deadline) — only assert if present in data
  const hasConf = (await page.locator('[data-testid="brief-confidence"]').count()) > 0;
  const hasSla = (await page.locator('[data-testid="brief-deadline"]').count()) > 0;
  record("J2i", "Confidence chip shown (research refinement #1)",
    hasConf ? "PASS" : "SKIP", hasConf ? "present" : "not supplied by scenario data");
  record("J2j", "SLA/deadline chip shown (research refinement #2)",
    hasSla ? "PASS" : "SKIP", hasSla ? "present" : "not supplied by scenario data");

  // ---- J3: clarification question visible + interactive -----------------
  record("J3a", "Clarification question visible",
    (await page.locator(".question-body").count()) > 0 ? "PASS" : "FAIL");
  const suggested = await page.locator(".suggested-btn").count();
  record("J3b", "Suggested answers + free text available",
    suggested > 0 && (await page.locator('[data-testid="clarification-input"]').count()) > 0
      ? "PASS" : "FAIL", `${suggested} suggested`);

  // ---- J10a: invalid transition guard -----------------------------------
  record("J10a", "Post answer disabled when input empty",
    await page.locator('[data-testid="clarification-submit"]').isDisabled() ? "PASS" : "FAIL");

  // ---- J4/J5: typed answer -> agent reply -> revised plan (v2) ----------
  const v1 = await getVersion(page);
  await page.locator('[data-testid="clarification-input"]').fill(
    "Show the inline error state here, no redirect.");
  await page.locator('[data-testid="clarification-submit"]').click();
  await wait(AGENT_DELAY + 900);

  const msgs = page.locator('[data-testid="clarification-thread"] [data-testid="message"]');
  const msgCount = await msgs.count();
  const lastAuthor = await msgs.last().getAttribute("data-author");
  record("J4", "Answer appears in thread, newest is agent's reply",
    msgCount >= 3 && lastAuthor === "agent" ? "PASS" : "FAIL",
    `${msgCount} msgs, last=${lastAuthor}`);

  const v2 = await getVersion(page);
  record("S2", "Status -> revised_awaiting_review after agent revision",
    (await getStatus(page)) === "revised_awaiting_review" ? "PASS" : "FAIL",
    `status=${await getStatus(page)}`);
  record("J5a", "Plan version incremented (v1 -> v2)", v2 === v1 + 1 ? "PASS" : "FAIL",
    `v${v1} -> v${v2}`);
  record("J5b", "'Revised' badge shown",
    await page.locator('[data-testid="brief-revised-badge"]').isVisible() ? "PASS" : "FAIL");
  record("J5c", "'What changed' summary shown",
    (await page.locator('[data-testid="brief-changes"]').count()) > 0 ? "PASS" : "FAIL");
  record("J5d", "Changed steps labelled (not colour-only)",
    (await page.locator(".zk-brief__badge.is-changed").count()) > 0 ? "PASS" : "FAIL");
  record("J5e", "Superseded v1 still reachable",
    (await page.locator("details.zk-brief__details").count()) > 0 ? "PASS" : "FAIL");

  // ---- J6: decision controls appear at revised_awaiting_review -----------
  record("J6", "Decision controls visible after revision",
    await page.locator('[data-testid="decision-approve"]').isVisible() ? "PASS" : "FAIL");

  // ---- J7: request changes requires feedback; bumps version --------------
  const vBefore = await getVersion(page);
  await page.locator('[data-testid="decision-changes"]').click();
  record("J7a", "Send feedback disabled when feedback empty",
    await page.locator('[data-testid="decision-submit"]').isDisabled() ? "PASS" : "FAIL");
  await page.locator('[data-testid="decision-feedback"]')
    .fill("Also log a metric when this fires.");
  await page.locator('[data-testid="decision-submit"]').click();
  await wait(AGENT_DELAY + 900);
  const vAfter = await getVersion(page);
  record("J7b", "Request changes -> agent revises -> version increments",
    vAfter === vBefore + 1 ? "PASS" : "FAIL", `v${vBefore} -> v${vAfter}`);
  record("S3", "Status returns to revised_awaiting_review after feedback revision",
    (await getStatus(page)) === "revised_awaiting_review" ? "PASS" : "FAIL",
    `status=${await getStatus(page)}`);

  // ---- J9: approve is honest --------------------------------------------
  await page.locator('[data-testid="decision-approve"]').click();
  await wait(300);
  const approved = await page.locator('[data-testid="decision-status"]').innerText();
  record("S4", "Status -> approved", (await getStatus(page)) === "approved" ? "PASS" : "FAIL",
    `status=${await getStatus(page)}`);
  record("J9a", "Approval explicitly states it is NOT completion",
    /not completion/i.test(approved) ? "PASS" : "FAIL", approved.replace(/\s+/g, " ").slice(0, 90));
  record("J9b", "No done/merged/deployed claim after approval",
    !/\b(merged|deployed|is done|completed)\b/i.test(approved) ? "PASS" : "FAIL");
  record("J10b", "Decision controls removed after decision (no repeat clicks)",
    !(await page.locator('[data-testid="decision-approve"]').isVisible().catch(() => false))
      ? "PASS" : "FAIL");

  // ---- J12: demo honesty disclaimer --------------------------------------
  const disclaimer = await page.locator(".demo-note").innerText().catch(() => "");
  record("J12", "Demo/mock disclaimer present",
    /simulated locally|nothing is sent/i.test(disclaimer) ? "PASS" : "FAIL");

  // ---- J8: decline path requires a reason (fresh state) ------------------
  await page.reload({ waitUntil: "networkidle" });
  await page.locator(".suggested-btn").first().click();
  await page.locator('[data-testid="clarification-submit"]').click();
  await wait(AGENT_DELAY + 900);
  await page.locator('[data-testid="decision-decline"]').click();
  record("J8a", "Decline asks for a required reason",
    await page.locator("#decline-reason").isVisible() ? "PASS" : "FAIL");
  record("J8b", "Decline confirm disabled without a reason",
    await page.locator('[data-testid="decision-submit"]').isDisabled() ? "PASS" : "FAIL");
  await page.locator("#decline-reason").fill("We'll handle this one manually.");
  await page.locator('[data-testid="decision-submit"]').click();
  await wait(300);
  const declined = await page.locator('[data-testid="decision-status"]').innerText();
  record("S5", "Status -> declined", (await getStatus(page)) === "declined" ? "PASS" : "FAIL",
    `status=${await getStatus(page)}`);
  record("J8c", "Declined copy keeps issue open (no false completion)",
    /stays open|will not act/i.test(declined) ? "PASS" : "FAIL",
    declined.replace(/\s+/g, " ").slice(0, 90));

  // ---- K1: keyboard reachability + visible focus -------------------------
  await page.reload({ waitUntil: "networkidle" });
  const kb = await keyboardCheck(page);
  record("K1", "Keyboard: answer input reachable + focus visible",
    kb.inputReachable && kb.focusVisible ? "PASS" : "FAIL", JSON.stringify(kb));
}

async function keyboardCheck(page) {
  let inputReachable = false;
  let focusVisible = false;
  for (let i = 0; i < 50; i++) {
    await page.keyboard.press("Tab");
    const found = await page.evaluate(() => {
      const el = document.activeElement;
      if (el && (el.id === "clarification-input" || el.dataset?.testid === "clarification-input")) {
        const s = getComputedStyle(el);
        return { hit: true, ring: s.outlineStyle !== "none" && parseFloat(s.outlineWidth) > 0 || (s.boxShadow && s.boxShadow !== "none") };
      }
      return { hit: false };
    });
    if (found.hit) { inputReachable = true; focusVisible = Boolean(found.ring); break; }
  }
  return { inputReachable, focusVisible };
}

function report(consoleErrors) {
  const pass = results.filter((r) => r.status === "PASS").length;
  const fail = results.filter((r) => r.status === "FAIL").length;
  const skip = results.filter((r) => r.status === "SKIP").length;
  console.log(`\n=== SMOKE SUMMARY: ${pass} pass, ${fail} fail, ${skip} skip ===`);
  if (fail > 0) {
    console.log("\nFailed checks:");
    for (const r of results.filter((x) => x.status === "FAIL"))
      console.log(`  ✗ [${r.id}] ${r.name}${r.note ? ` — ${r.note}` : ""}`);
  }
  process.exit(fail > 0 ? 1 : 0);
}

main().catch((e) => { console.error("Harness error:", e); process.exit(1); });
