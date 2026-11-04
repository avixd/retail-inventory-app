/**
 * Unit tests for the decision maths (src/data/planning.js), against textbook values
 * and closed-form optima.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  normalCdf, normalPdf, zFor, lossFunction, serviceLevelAnalysis, workingCapital, HOLDING_RATE,
} from "../src/data/planning.js";

const close = (a, b, tol, msg) => assert.ok(Math.abs(a - b) <= tol, `${msg}: ${a} vs ${b}`);

test("standard normal functions match textbook values", () => {
  close(normalCdf(1.645), 0.95, 2e-4, "Phi(1.645)");
  close(normalCdf(0), 0.5, 1e-9, "Phi(0)");
  close(normalCdf(-1.96), 0.025, 2e-4, "Phi(-1.96)");
  close(normalPdf(0), 0.398942, 1e-6, "phi(0)");
  close(zFor(0.98), 2.0537, 1e-3, "z(98%)");
  close(zFor(0.9), 1.2816, 1e-3, "z(90%)");
  close(lossFunction(0), 0.398942, 1e-6, "G(0)");
  close(lossFunction(1.2816), 0.0475, 5e-4, "G(1.2816)");
});

test("service-level costs are computed per the formulas, and the optimum matches the closed form", () => {
  // One A position: d = 10/day, sd_d = 4, L = 9 days, sd_L = 1 -> sigma_LT = sqrt(9*16 + 100*1) = sqrt(244)
  const dataset = { products: [{ sku: "S1", unitCost: 20, unitPrice: 50 }] };
  const repl = { items: [{ sku: "S1", abc: "A", location: "ST-11", avgDailyDemand: 10, sdDailyDemand: 4,
    leadTimeMean: 9, leadTimeSd: 1, eoq: 100 }] };
  const res = serviceLevelAnalysis(repl, dataset, { A: 0.95, B: 0.95, C: 0.9 });
  const a = res.classes.A;
  const sigma = Math.sqrt(244), cycles = 3650 / 100, z = zFor(0.95);
  close(a.chosen.ssValue, z * sigma * 20, 1e-6, "safety-stock value");
  close(a.chosen.holding, z * sigma * 20 * HOLDING_RATE, 1e-6, "holding cost");
  close(a.chosen.lostMargin, cycles * sigma * lossFunction(z) * 30, 1e-6, "lost margin");
  // d(cost)/dz = 0  =>  1 - Phi(z*) = h * cost / (cycles * margin)
  const target = 1 - (HOLDING_RATE * 20) / (cycles * 30);
  close(a.optimal.level, target, 0.006, "grid optimum vs closed form");
  assert.ok(a.curve.every((p, i, arr) => i === 0 || p.ssValue >= arr[i - 1].ssValue), "more service needs more stock");
});

test("working capital: DIO, terms-weighted DPO, excess and ageing", () => {
  const files = {
    dataset: {
      products: [{ sku: "S1", unitCost: 10, unitPrice: 25 }],
      stock: [{ sku: "S1", onShelf: 10, offShelf: 90 }],
      suppliers: [{ spendYtd: 300, terms: "Net 30" }, { spendYtd: 100, terms: "Net 60" }],
      bins: [{ sku: "S1", qty: 50, lastMove: "2026-10-20" }, { sku: "S1", qty: 40, lastMove: "2026-06-01" }],
    },
    replenishment: { items: [{ sku: "S1", name: "x", location: "WH-01", abc: "A", onHand: 90, reorderPoint: 40, eoq: 30 }] },
    procurement: { payablesByTerms: [{ amount: 400 }] },
    networkKpis: [{ month: "2026-10-01", daysOfSupply: 48 }],
  };
  const wc = workingCapital(files, "2026-10-31");
  assert.equal(wc.inventory, 1000);
  assert.equal(wc.ownFunded, 600);
  assert.equal(wc.dio, 48);
  assert.equal(wc.dpo, 37.5);                     // (300*30 + 100*60) / 400
  assert.equal(wc.gapDays, 10.5);
  assert.equal(wc.excessValue, 200);              // (90 - (40 + 30)) * 10
  assert.equal(wc.aging[0].value, 500);           // 11 days old
  assert.equal(wc.agedOver90, 400);               // 152 days old
});
