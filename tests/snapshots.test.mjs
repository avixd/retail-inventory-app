/**
 * Checks every published month-end snapshot (public/snapshot/<date>/), offline:
 *   - index.json lists the months, newest first, and the default is the newest;
 *   - each month has every file the app reads, dated to that month-end;
 *   - each month's dataset hydrates the shared model and every selector the views
 *     call returns finite numbers;
 *   - the executive-summary maths returns finite numbers for each month.
 *
 *   npm run test:snapshots
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { createHash } from "node:crypto";
import * as inv from "../src/data/inventory.js";
import { summarise, kpiTrend, kpiScorecard } from "../src/data/summary.js";
import { serviceLevelAnalysis, workingCapital } from "../src/data/planning.js";

const DIR = new URL("../public/snapshot/", import.meta.url);
const read = (path) => JSON.parse(readFileSync(new URL(path, DIR), "utf8"));
const FILES = { dataset: "dataset.json", replenishment: "replenishment.json", networkKpis: "kpis-network.json",
  scorecard: "scorecard.json", spendPareto: "spend-pareto.json", procurement: "procurement-summary.json" };

const index = read("index.json");

function nonFinite(value, path = "", out = []) {
  if (typeof value === "number") { if (!Number.isFinite(value)) out.push(`${path} = ${value}`); }
  else if (Array.isArray(value)) value.forEach((v, i) => nonFinite(v, `${path}[${i}]`, out));
  else if (value && typeof value === "object") for (const [k, v] of Object.entries(value)) nonFinite(v, `${path}.${k}`, out);
  return out;
}

test("index lists twelve month-ends, newest first, default = newest", () => {
  assert.equal(index.months.length, 12);
  assert.deepEqual([...index.months].sort().reverse(), index.months);
  assert.equal(index.default, index.months[0]);
  for (const m of index.months) {
    const d = new Date(`${m}T00:00:00Z`);
    d.setUTCDate(d.getUTCDate() + 1);
    assert.equal(d.getUTCDate(), 1, `${m} is a month-end`);
  }
});

for (const month of index.months) {
  test(`${month}: complete, dated correctly, and computes cleanly`, () => {
    const extra = ["kpis.json", "meta.json", "manifest.json", "forecast-network.json", "forecast-accuracy.json",
      "data-quality.json", "abc-xyz.json"];
    for (const name of [...Object.values(FILES), ...extra]) {
      assert.ok(existsSync(new URL(`${month}/${name}`, DIR)), `${month}/${name} exists`);
    }
    // Provenance: every published file matches the checksum recorded when it was exported.
    const manifest = read(`${month}/manifest.json`);
    assert.equal(manifest.asOf, month);
    for (const [name, info] of Object.entries(manifest.files)) {
      const sha = createHash("sha256").update(readFileSync(new URL(`${month}/${name}`, DIR))).digest("hex");
      assert.equal(sha, info.sha256, `${month}/${name} checksum`);
    }
    const files = Object.fromEntries(Object.entries(FILES).map(([k, f]) => [k, read(`${month}/${f}`)]));
    assert.equal(files.dataset.meta.asOf, month, "dataset as-of");
    assert.equal(read(`${month}/meta.json`).dataAsOf, month, "meta as-of");

    inv.hydrate(structuredClone(files.dataset));
    const skus = inv.PRODUCTS.map((p) => p.sku);
    const selectors = {
      totals: inv.totals(), lowStock: inv.lowStock(), supplierMetrics: inv.supplierMetrics(),
      spendContribution: inv.spendContribution(), cohortSummary: inv.cohortSummary(),
      poStatusSummary: inv.poStatusSummary(), avgPoCycleTime: inv.avgPoCycleTime(),
      onShelfByStore: inv.onShelfByStore(skus), offShelfByWarehouse: inv.offShelfByWarehouse(skus),
    };
    assert.deepEqual(nonFinite(selectors).slice(0, 5), []);
    assert.equal(selectors.totals.skus, 60);
    assert.ok(selectors.totals.value > 0);

    const summary = summarise(files, month);
    assert.deepEqual(nonFinite(summary).slice(0, 5), []);
    assert.ok(summary.investment.value > 0 && summary.kpis.gmroi > 0 && summary.payables.outstanding > 0);
    assert.equal(kpiTrend(files.networkKpis).length, 12, "twelve months of KPI trend");
    assert.ok(summary.kpis.gmroi < 40, "network GMROI is a network figure, not a store average");
    const sc = kpiScorecard(files.networkKpis, month);
    assert.ok(sc && sc.identityGap < 0.05, `GMROI = markup x turns within rounding (gap ${sc?.identityGap})`);
    assert.ok(sc.metrics.every((m) => m.value != null && m.status != null), "every scorecard KPI has a value and status");
    // Decision maths runs cleanly on every month: cost-minimising levels exist and
    // can't cost more than the current policy (the current level is on the grid).
    const sl = serviceLevelAnalysis(files.replenishment, files.dataset);
    assert.deepEqual(nonFinite({ c: sl.current, o: sl.optimal }).slice(0, 5), []);
    assert.ok(sl.optimal.totalCost <= sl.current.totalCost + 1e-6, "optimum never costs more than current policy");
    const wc = workingCapital({ dataset: files.dataset, replenishment: files.replenishment,
      procurement: files.procurement, networkKpis: files.networkKpis }, month);
    assert.ok(wc.dio > 0 && wc.dpo > 0 && Number.isFinite(wc.gapDays), "DIO, DPO and the gap are defined");
    assert.ok(Math.abs(wc.aging.reduce((s, b) => s + b.value, 0) - wc.inventory) < wc.inventory, "aged DC stock is part of inventory");
    const quality = read(`${month}/data-quality.json`);
    assert.ok(quality.length >= 9 && quality.filter((c) => c.severity === "error").every((c) => c.passed),
      "data-quality published and every blocking check passed");
  });
}

test("the root snapshot (used by older clients) matches the default month", () => {
  assert.equal(read("dataset.json").meta.asOf, index.default);
});
