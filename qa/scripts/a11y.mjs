// QA accessibility scan (axe-core) for the Ziki Clarification Loop demo.
// Scans the production build at two key states: initial (awaiting answer) and
// post-revision (awaiting decision). Automated scanning is a FILTER, not proof
// of full accessibility — results are triaged by the QA agent, not auto-trusted.
//
//   node scripts/a11y.mjs               # serve dist/ and scan
//   BASE_URL=... node scripts/a11y.mjs   # scan an already-running server
import { chromium } from "playwright";
import AxeBuilder from "@axe-core/playwright";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { existsSync } from "node:fs";
import { serveDir } from "./_serve.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const distDir = resolve(here, "../../dist");
const AGENT_DELAY = 1400;
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

// WCAG 2.1 A + AA
const TAGS = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"];

async function scan(page, label) {
  const results = await new AxeBuilder({ page }).withTags(TAGS).analyze();
  const v = results.violations;
  console.log(`\n--- ${label}: ${v.length} violation type(s) ---`);
  if (v.length === 0) {
    console.log("  none");
    return { label, violations: [] };
  }
  for (const viol of v) {
    console.log(`  [${viol.impact}] ${viol.id}: ${viol.help} (${viol.nodes.length} node(s))`);
    for (const n of viol.nodes.slice(0, 3)) console.log(`      ${n.target.join(" ")}`);
    if (viol.nodes.length > 3) console.log(`      … +${viol.nodes.length - 3} more`);
  }
  return { label, violations: v.map((x) => ({ id: x.id, impact: x.impact, nodes: x.nodes.length, help: x.help })) };
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
  console.log(`Target: ${base}`);

  const browser = await chromium.launch();
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await context.newPage();
  const all = [];
  try {
    await page.goto(base, { waitUntil: "networkidle" });
    all.push(await scan(page, "State 1 — awaiting answer (initial)"));
    // move to decision state
    await page.locator(".suggested-btn").first().click();
    await page.locator('[data-testid="clarification-submit"]').click();
    await wait(AGENT_DELAY + 900);
    all.push(await scan(page, "State 2 — awaiting decision (post-revision)"));
  } finally {
    await context.close().catch(() => {});
    await browser.close();
    if (stop) await stop();
  }

  const total = all.flatMap((s) => s.violations);
  const serious = total.filter((v) => v.impact === "critical" || v.impact === "serious");
  console.log(`\n=== A11Y SUMMARY: ${total.length} violation type(s); ${serious.length} critical/serious ===`);
  process.exit(serious.length > 0 ? 1 : 0);
}

main().catch((e) => {
  console.error("Harness error:", e);
  process.exit(1);
});
