/**
 * Accessibility audit: WCAG 2.0 / 2.1, levels A and AA (the standard Ontario's AODA
 * references), with axe-core, on every view of the built site. Exits 1 on any
 * violation, so CI keeps the site at zero.
 *
 *   npm run build && npm run preview -- --port 4174 &
 *   npm run test:a11y                      # A11Y_URL to override, A11Y_CHANNEL=msedge to use Edge
 */
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { chromium } from "playwright";

const URL = process.env.A11Y_URL || "http://localhost:4174/retail-inventory-app/";
const TAGS = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"];
const axeSource = readFileSync(createRequire(import.meta.url).resolve("axe-core/axe.min.js"), "utf8");

const browser = await chromium.launch({ channel: process.env.A11Y_CHANNEL || undefined });
// The site's CSP (rightly) forbids injected scripts; bypass it for the audit only.
const page = await (await browser.newContext({ viewport: { width: 1440, height: 900 }, bypassCSP: true })).newPage();
await page.goto(URL, { waitUntil: "networkidle" });
await page.waitForSelector(".scorecard", { state: "attached", timeout: 60000 });

const views = (await page.locator("nav.sidebar button").allInnerTexts()).map((t) => t.trim().split("\n")[0]);
const found = [];
for (const view of views) {
  await page.locator("nav.sidebar button", { hasText: view }).first().click();
  await page.waitForTimeout(2500);
  await page.evaluate(axeSource);
  const { violations } = await page.evaluate((tags) => window.axe.run(document, { runOnly: { type: "tag", values: tags } }), TAGS);
  for (const v of violations) found.push({ view, id: v.id, impact: v.impact, help: v.help, nodes: v.nodes.length, target: v.nodes[0]?.target[0] });
}
await browser.close();

console.log(`Accessibility (WCAG 2.0/2.1 A+AA): ${views.length} views audited, ${found.length} violation(s)`);
for (const f of found) console.log(`  [${f.impact}] ${f.view}: ${f.id} (${f.nodes} element(s), e.g. ${f.target}) - ${f.help}`);
process.exit(found.length ? 1 : 0);
