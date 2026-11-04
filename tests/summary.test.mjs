/**
 * Unit tests for the executive-summary maths (src/data/summary.js). No API or
 * browser needed: each metric is checked against a hand-worked fixture.
 *
 *   npm run test:unit
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  inventoryInvestment, salesAtRisk, monthKpis, kpiTrend, supplierConcentration, payables, delta, monthKey,
} from "../src/data/summary.js";

const dataset = {
  products: [
    { sku: "A", unitCost: 10, unitPrice: 25 },
    { sku: "B", unitCost: 4, unitPrice: 9 },
  ],
  stock: [
    { sku: "A", onShelf: 5, offShelf: 15 }, // 20 units x 10 = 200, reserve 150
    { sku: "B", onShelf: 10, offShelf: 0 }, // 10 units x 4 = 40
  ],
};

test("inventory investment values units at cost and splits out reserve", () => {
  const r = inventoryInvestment(dataset);
  assert.equal(r.value, 240);
  assert.equal(r.reserve, 150);
  assert.equal(r.reserveShare, 150 / 240);
});

test("sales at risk counts only OUT and BELOW_ROP, at retail, never negative", () => {
  const repl = { items: [
    { sku: "A", status: "OUT", avgDailyDemand: 2, leadTimeMean: 5, onHand: 0 },       // 10 x 25 = 250
    { sku: "B", status: "BELOW_ROP", avgDailyDemand: 3, leadTimeMean: 4, onHand: 7 }, // 5 x 9 = 45
    { sku: "B", status: "BELOW_ROP", avgDailyDemand: 1, leadTimeMean: 2, onHand: 9 }, // covered: 0
    { sku: "A", status: "LOW", avgDailyDemand: 9, leadTimeMean: 9, onHand: 0 },       // ignored
    { sku: "A", status: "OK", avgDailyDemand: 9, leadTimeMean: 9, onHand: 0 },        // ignored
  ] };
  const r = salesAtRisk(dataset, repl);
  assert.equal(r.value, 295);
  assert.equal(r.out, 1);
  assert.equal(r.belowRop, 2);
});

test("month KPIs come from the network row for the as-of month; trend is sorted by month", () => {
  const network = [
    { month: "2026-10-01", gmroi: 10.5, turns: 7.2, daysOfSupply: 50.7, stockoutRate: 0.018 },
    { month: "2026-09-01", gmroi: 11.7, turns: 8.3, daysOfSupply: 44, stockoutRate: 0.037 },
  ];
  assert.equal(monthKey("2026-10-31"), "2026-10-01");
  assert.deepEqual(monthKpis(network, "2026-10-31"), { gmroi: 10.5, turns: 7.2, daysOfSupply: 50.7, stockoutRate: 0.018 });
  assert.equal(monthKpis(network, "2025-01-31").gmroi, null, "no row -> null, not zero");
  const trend = kpiTrend(network);
  assert.deepEqual(trend.map((t) => t.gmroi), [11.7, 10.5]);
  assert.deepEqual(trend.map((t) => t.stockoutPct), [3.7, 1.8]);
});

test("supplier concentration: top three share and Watchlist spend", () => {
  const pareto = [
    { supplierId: "S1", name: "One", spendYtd: 50 },
    { supplierId: "S2", name: "Two", spendYtd: 20 },
    { supplierId: "S3", name: "Three", spendYtd: 20 },
    { supplierId: "S4", name: "Four", spendYtd: 10 },
  ];
  const scorecard = [{ supplierId: "S4", cohort: "Watchlist" }, { supplierId: "S1", cohort: "Strategic" }];
  const r = supplierConcentration(pareto, scorecard);
  assert.equal(r.top3Share, 0.9);
  assert.deepEqual(r.top3Names, ["One", "Two", "Three"]);
  assert.equal(r.watchlistCount, 1);
  assert.equal(r.watchlistShare, 0.1);
});

test("payables sum open and overdue amounts across terms", () => {
  const r = payables({ payablesByTerms: [{ amount: 100, overdueAmount: 10 }, { amount: 50 }] });
  assert.deepEqual(r, { outstanding: 150, overdue: 10 });
});

test("delta is null when there is no prior month", () => {
  assert.equal(delta(5, null), null);
  assert.equal(delta(5, 3), 2);
});
