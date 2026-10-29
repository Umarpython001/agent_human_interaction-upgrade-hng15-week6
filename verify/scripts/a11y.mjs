// Accessibility + interaction verification for ActionBriefCard.
// Usage: npm run a11y   (requires npm run build first)
//
// What runs:
//   1. axe-core (WCAG 2.1 A+AA tags) against each scenario's card element
//   2. keyboard: tab to the superseded-history <summary>, Enter toggles it
//   3. clamped long text: Show more button exists, expands, aria-expanded flips
//   4. status announcements + revision badges text (QA testid contract)
//   5. SLA chip visible only while the request is open
//   6. prefers-reduced-motion kills the chevron transition
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";
import axe from "axe-core";
import { startStaticServer } from "./serve.mjs";

const root = fileURLToPath(new URL("..", import.meta.url));
const OUT = join(root, "results");
mkdirSync(OUT, { recursive: true });

const CASES = ["pending", "revising", "revised", "approved", "evidence-kinds", "edge"];
const report = { axe: [], checks: [] };
let failures = 0;

function check(name, ok, detail = "") {
  report.checks.push({ name, ok, detail });
  if (!ok) failures += 1;
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? ` — ${detail}` : ""}`);
}

const server = await startStaticServer();
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
await page.goto(server.url, { waitUntil: "load" });
await page.waitForSelector('[data-testid="brief"]');
await page.waitForTimeout(300); // let the clamp measurement settle

/* 1 — axe-core per scenario, scoped to the card element itself ---------------- */
await page.addScriptTag({ content: axe.source });
for (const id of CASES) {
  const violations = await page.evaluate(async (caseId) => {
    const el = document.querySelector(`[data-case="${caseId}"] .harness__frame`);
    const res = await window.axe.run(el, {
      runOnly: { type: "tag", values: ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"] },
    });
    return res.violations.map((v) => ({
      id: v.id,
      impact: v.impact,
      help: v.help,
      nodes: v.nodes.map((n) => n.target.join(" ")),
    }));
  }, id);
  report.axe.push({ case: id, violations });
  check(`axe ${id}`, violations.length === 0, violations.map((v) => `${v.id}: ${v.help} @ ${v.nodes.join(" | ")}`).join(" ; "));
}

/* 2 — keyboard: tab to the superseded-history summary and toggle it ----------- */
let tabsUsed = 0;
let focused = false;
while (tabsUsed < 40) {
  await page.keyboard.press("Tab");
  tabsUsed += 1;
  focused = await page.evaluate(
    () => document.activeElement?.closest('[data-case="revised"]')?.querySelector("summary") === document.activeElement,
  );
  if (focused) break;
}
check("keyboard: summary reachable with Tab", focused, `${tabsUsed} tabs`);
if (focused) {
  await page.keyboard.press("Enter");
  const opened = await page.evaluate(() =>
    document.querySelector('[data-case="revised"] details')?.open === true,
  );
  check("keyboard: Enter opens superseded history", opened);
  await page.keyboard.press("Enter");
  const closed = await page.evaluate(() =>
    document.querySelector('[data-case="revised"] details')?.open === false,
  );
  check("keyboard: Enter closes it again", closed);
}

/* 3 — clamped long text (edge case) ------------------------------------------ */
const edgeToggle = page.locator('[data-case="edge"] .zk-brief__clamp-toggle');
check("clamp: toggle renders for overflowing text", (await edgeToggle.count()) === 1);
if ((await edgeToggle.count()) === 1) {
  check("clamp: aria-expanded starts false", (await edgeToggle.getAttribute("aria-expanded")) === "false");
  const before = await page.evaluate(() => document.querySelector('[data-case="edge"] .zk-brief__clamp')?.clientHeight ?? 0);
  await edgeToggle.click();
  const after = await page.evaluate(() => document.querySelector('[data-case="edge"] .zk-brief__clamp')?.clientHeight ?? 0);
  check("clamp: Show more expands the text", after > before + 100, `${before}px → ${after}px`);
  check("clamp: aria-expanded flips to true", (await edgeToggle.getAttribute("aria-expanded")) === "true");
  check("clamp: no toggle for short text (pending case)", (await page.locator('[data-case="pending"] .zk-brief__clamp-toggle').count()) === 0);
}

/* 4 — status announcement + QA testid contract -------------------------------- */
const pendingStatus = (await page.locator('[data-case="pending"] [role="status"]').innerText()).replace(/\s+/g, " ").trim();
check("status pill announces 'Waiting on you'", pendingStatus.includes("Waiting on you"), pendingStatus);
const revisingStatus = (await page.locator('[data-case="revising"] [role="status"]').innerText()).replace(/\s+/g, " ").trim();
check("working phase announces 'Agent revising plan'", revisingStatus.includes("Agent revising plan"), revisingStatus);
const versionText = (await page.locator('[data-case="revised"] [data-testid="brief-version"]').innerText()).replace(/\s+/g, " ").trim();
check("brief-version text is 'v2 · revised'", versionText === "v2 · revised", versionText);
check("brief-revised-badge present on revised", (await page.locator('[data-case="revised"] [data-testid="brief-revised-badge"]').count()) === 1);
check("brief-revised-badge absent on v1", (await page.locator('[data-case="pending"] [data-testid="brief-revised-badge"]').count()) === 0);
check("data-version=2 on revised card", (await page.locator('[data-case="revised"] [data-testid="brief"][data-version="2"]').count()) === 1);
for (const testid of ["brief-plan", "brief-risks", "brief-estimate", "brief-evidence", "brief-uncertainties"]) {
  check(`testid ${testid} present in pending case`, (await page.locator(`[data-case="pending"] [data-testid="${testid}"]`).count()) === 1);
}

/* 5 — SLA chip only while the request is open --------------------------------- */
check("SLA chip shown while open (pending)", (await page.locator('[data-case="pending"] [data-testid="brief-deadline"]').count()) === 1);
check("SLA chip shown while changes_requested", (await page.locator('[data-case="edge"] [data-testid="brief-deadline"]').count()) === 1);
check("SLA chip hidden when approved", (await page.locator('[data-case="approved"] [data-testid="brief-deadline"]').count()) === 0);
check("confidence chip rendered from data", (await page.locator('[data-case="pending"] [data-testid="brief-confidence"]').count()) === 1);

/* 6 — prefers-reduced-motion --------------------------------------------------- */
await page.emulateMedia({ reducedMotion: "reduce" });
const transition = await page.evaluate(() => {
  const el = document.querySelector('[data-case="revised"] .zk-brief__chevron');
  return el ? parseFloat(getComputedStyle(el).transitionDuration) : NaN;
});
check("reduced-motion: chevron transition ~0", Number.isFinite(transition) && transition <= 0.001, `${transition}s`);
await page.emulateMedia({ reducedMotion: "no-preference" });

await browser.close();
await server.close();

writeFileSync(join(OUT, "a11y.json"), JSON.stringify(report, null, 2));
console.log(`\n${failures === 0 ? "ALL CHECKS PASSED" : `${failures} CHECK(S) FAILED`} — full report in verify/results/a11y.json`);
process.exit(failures === 0 ? 0 : 1);
