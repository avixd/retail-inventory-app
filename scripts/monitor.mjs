/**
 * Production health check (read-only). Run by .github/workflows/monitor.yml every
 * 6 hours, or locally:
 *
 *   node scripts/monitor.mjs [site URL] [portfolio URL]
 *
 * Checks the things a visitor depends on, end to end:
 *   - the site is up and serves its Content-Security-Policy
 *   - the month index is intact and the default month is the newest
 *   - every published file of the default month matches its manifest SHA-256
 *   - every blocking data-quality check passed for the load behind it
 *   - the portfolio page links to the app, and the demo video is served
 *   - (only if API_BASE_URL is set) the API is healthy and serves the same as-of date
 *
 * Prints a Markdown report (also written to $GITHUB_STEP_SUMMARY) and exits 1 on any failure.
 */
import { createHash } from "node:crypto";
import { appendFileSync } from "node:fs";

const SITE = (process.argv[2] || "https://avixd.github.io/retail-inventory-app/").replace(/\/?$/, "/");
const PORTFOLIO = (process.argv[3] || "https://avixd.github.io/").replace(/\/?$/, "/");
const API = (process.env.API_BASE_URL || "").replace(/\/$/, "");
const TIMEOUT_MS = 20000;

const results = [];
const record = (name, ok, detail) => results.push({ name, ok, detail });

async function get(url, { retries = 2 } = {}) {
  for (let attempt = 0; ; attempt++) {
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(TIMEOUT_MS), headers: { "Cache-Control": "no-cache" } });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return res;
    } catch (err) {
      if (attempt >= retries) throw new Error(`${url}: ${err.message}`);
      await new Promise((r) => setTimeout(r, 5000 * (attempt + 1)));
    }
  }
}

async function check(name, fn) {
  try {
    record(name, true, (await fn()) || "ok");
  } catch (err) {
    record(name, false, err.message);
  }
}

await check("Site up, CSP present", async () => {
  const html = await (await get(SITE)).text();
  const raw = /http-equiv="Content-Security-Policy"\s+content="([^"]+)"/.exec(html)?.[1];
  // Attribute values are HTML-encoded (&#39; for '), so decode before comparing.
  const csp = raw?.replace(/&#39;/g, "'").replace(/&quot;/g, '"').replace(/&amp;/g, "&");
  if (!csp) throw new Error("no Content-Security-Policy meta tag");
  if (!csp.includes("default-src 'self'")) throw new Error(`unexpected CSP: ${csp}`);
  return "200, CSP default-src 'self'";
});

let latest = null;
await check("Month index intact", async () => {
  const index = await (await get(`${SITE}snapshot/index.json`)).json();
  const sorted = [...index.months].sort().reverse();
  if (index.months.length < 1) throw new Error("no months published");
  if (index.default !== sorted[0]) throw new Error(`default ${index.default} is not the newest (${sorted[0]})`);
  latest = index.default;
  return `${index.months.length} months, default ${latest}`;
});

if (latest) {
  await check("Files match manifest checksums", async () => {
    const manifest = await (await get(`${SITE}snapshot/${latest}/manifest.json`)).json();
    if (manifest.asOf !== latest) throw new Error(`manifest as-of ${manifest.asOf} != ${latest}`);
    const bad = [];
    for (const [file, info] of Object.entries(manifest.files)) {
      const body = Buffer.from(await (await get(`${SITE}snapshot/${latest}/${file}`)).arrayBuffer());
      if (createHash("sha256").update(body).digest("hex") !== info.sha256) bad.push(file);
    }
    if (bad.length) throw new Error(`checksum mismatch: ${bad.join(", ")}`);
    return `${Object.keys(manifest.files).length} files verified (commit ${manifest.gitSha})`;
  });

  await check("Blocking data-quality checks passed", async () => {
    const checks = await (await get(`${SITE}snapshot/${latest}/data-quality.json`)).json();
    const failed = checks.filter((c) => c.severity === "error" && !c.passed).map((c) => c.checkName);
    if (failed.length) throw new Error(`failed: ${failed.join(", ")}`);
    const warns = checks.filter((c) => c.severity === "warn" && !c.passed).map((c) => c.checkName);
    return `${checks.length} checks, ${warns.length ? `warnings: ${warns.join(", ")}` : "no warnings"}`;
  });
}

await check("Portfolio links to the app and the demo video", async () => {
  const html = await (await get(PORTFOLIO)).text();
  if (!html.includes(SITE.replace(/\/$/, ""))) throw new Error("portfolio no longer links to the app");
  const video = /data-video="([^"]+)"/.exec(html)?.[1];
  if (!video) throw new Error("demo video link missing");
  const res = await get(new URL(video, PORTFOLIO).href);
  return `video ${res.headers.get("content-type")}, ${res.headers.get("content-length")} bytes`;
});

if (API) {
  await check("API healthy and serving the published month", async () => {
    await get(`${API}/health`, { retries: 4 }); // free tier may need to wake up
    const meta = await (await get(`${API}/api/v1/meta`)).json();
    if (latest && meta.dataAsOf !== latest) throw new Error(`API as-of ${meta.dataAsOf} != site ${latest}`);
    return `as-of ${meta.dataAsOf}, read-only ${meta.readOnly}`;
  });
} else {
  record("API", true, "not configured (site runs on published snapshots)");
}

const failed = results.filter((r) => !r.ok);
const report = [
  `## Production health: ${failed.length ? `❌ ${failed.length} failing` : "✅ all checks passed"}`,
  "",
  "| Check | Result | Detail |",
  "|---|---|---|",
  ...results.map((r) => `| ${r.name} | ${r.ok ? "✅" : "❌"} | ${r.detail.replace(/\|/g, "\\|")} |`),
  "",
  `Checked ${new Date().toISOString()} · site ${SITE}`,
].join("\n");
console.log(report);
if (process.env.GITHUB_STEP_SUMMARY) appendFileSync(process.env.GITHUB_STEP_SUMMARY, `${report}\n`);
process.exit(failed.length ? 1 : 0);
