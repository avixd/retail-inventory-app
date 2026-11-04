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
import * as inv from "../src/data/inventory.js";
import { summarise, kpiTrend } from "../src/data/summary.js";

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
    for (const name of [...Object.values(FILES), "kpis.json", "meta.json", "manifest.json"]) {
      assert.ok(existsSync(new URL(`${month}/${name}`, DIR)), `${month}/${name} exists`);
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
  });
}

test("the root snapshot (used by older clients) matches the default month", () => {
  assert.equal(read("dataset.json").meta.asOf, index.default);
});
