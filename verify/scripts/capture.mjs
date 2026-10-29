// Screenshot capture: every scenario × 3 viewports, plus full-page shots.
// Usage: npm run capture   (requires npm run build first)
import { mkdirSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";
import { startStaticServer } from "./serve.mjs";

const root = fileURLToPath(new URL("..", import.meta.url));
const OUT = join(root, "results");
mkdirSync(OUT, { recursive: true });

const CASES = ["pending", "revising", "revised", "approved", "evidence-kinds", "edge"];
const VIEWPORTS = [
  { width: 1440, height: 1000, label: "desktop" },
  { width: 820, height: 1100, label: "tablet" },
  { width: 390, height: 844, label: "mobile" },
];

const server = await startStaticServer();
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });

await page.goto(server.url, { waitUntil: "load" });
await page.waitForSelector('[data-testid="brief"]');
// Let ClampedText's overflow measurement settle (rAF + fonts.ready).
await page.waitForTimeout(300);

const shots = [];
for (const vp of VIEWPORTS) {
  await page.setViewportSize({ width: vp.width, height: vp.height });
  await page.waitForTimeout(200);
  for (const id of CASES) {
    const file = join(OUT, `${id}--${vp.label}-${vp.width}.png`);
    await page.locator(`[data-case="${id}"]`).screenshot({ path: file });
    shots.push(`${id}--${vp.label}-${vp.width}.png`);
  }
  const full = join(OUT, `full-page--${vp.label}-${vp.width}.png`);
  await page.screenshot({ path: full, fullPage: true });
  shots.push(`full-page--${vp.label}-${vp.width}.png`);
}

await browser.close();
await server.close();

console.log(`capture OK — ${shots.length} screenshots in verify/results/`);
for (const s of shots) console.log(`  ${s}`);
