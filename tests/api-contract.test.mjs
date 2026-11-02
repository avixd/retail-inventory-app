/**
 * Front-end contract test against a running API.
 *
 * The views were written against the built-in demo arrays in src/data/inventory.js.
 * This test proves the live API can stand in for them:
 *   1. every field the demo data has, the API's data has too, with the same type
 *      (checked recursively across every row, including nested PO lines);
 *   2. after hydrate(), every selector the views call runs and returns finite numbers;
 *   3. the API is read-only and sends the security and caching headers we rely on.
 *
 *   API_URL=http://localhost:8000 npm run test:api
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import * as inv from "../src/data/inventory.js";

const API = (process.env.API_URL || "http://localhost:8000").replace(/\/$/, "");

const COLLECTIONS = {
  warehouses: "WAREHOUSES", suppliers: "SUPPLIERS", products: "PRODUCTS", stock: "STOCK",
  bins: "BINS", purchaseOrders: "PURCHASE_ORDERS", invoices: "INVOICES",
  transferOrders: "TRANSFER_ORDERS", movements: "MOVEMENTS", grns: "GRNS", stockTrend: "STOCK_TREND",
};
const OBJECTS = { shelf: "SHELF", emptyBins: "EMPTY_BINS" };

const kind = (v) => (v === null ? "null" : Array.isArray(v) ? "array" : typeof v);

/** Collect "path: problem" strings where `actual` lacks something `expected` has. */
function compareShape(expected, actual, path, problems) {
  const ek = kind(expected);
  const ak = kind(actual);
  if (ek === "null" || ak === "null") return; // optional either side
  if (ek !== ak) return problems.push(`${path}: expected ${ek}, got ${ak}`);
  if (ek === "array") {
    if (expected.length && actual.length) actual.forEach((row, i) => compareShape(expected[0], row, `${path}[${i}]`, problems));
  } else if (ek === "object") {
    for (const key of Object.keys(expected)) {
      if (!(key in actual)) problems.push(`${path}.${key}: missing`);
      else compareShape(expected[key], actual[key], `${path}.${key}`, problems);
    }
  }
}

// Snapshot the demo data before hydrate() replaces it in place.
const demo = structuredClone(Object.fromEntries(
  [...Object.entries(COLLECTIONS), ...Object.entries(OBJECTS)].map(([k, name]) => [k, inv[name]])));

let dataset;
let datasetResponse;

test("GET /api/v1/dataset returns 200 with an ETag", async () => {
  datasetResponse = await fetch(`${API}/api/v1/dataset`);
  assert.equal(datasetResponse.status, 200);
  assert.ok(datasetResponse.headers.get("etag"), "ETag header");
  dataset = await datasetResponse.json();
  assert.match(String(dataset.meta?.asOf), /^\d{4}-\d{2}-\d{2}$/);
});

for (const key of [...Object.keys(COLLECTIONS), ...Object.keys(OBJECTS)]) {
  test(`dataset.${key} has every field the views expect`, () => {
    assert.ok(key in dataset, `dataset.${key} present`);
    if (key in COLLECTIONS) assert.ok(dataset[key].length > 0, `dataset.${key} is not empty`);
    const problems = [];
    if (key in OBJECTS) {
      // ID-keyed, sparse maps (SKU -> store -> qty, site -> bins): a missing key means zero,
      // so check every entry has the demo's value shape rather than the same keys.
      const sample = Object.values(demo[key])[0];
      const inner = kind(sample) === "object" ? Object.values(sample)[0] : sample?.[0];
      for (const [id, value] of Object.entries(dataset[key])) {
        if (kind(value) !== kind(sample)) problems.push(`${key}.${id}: expected ${kind(sample)}, got ${kind(value)}`);
        for (const v of Object.values(value)) if (kind(v) !== kind(inner)) problems.push(`${key}.${id}: value ${kind(v)}`);
      }
    } else compareShape(demo[key], dataset[key], key, problems);
    assert.deepEqual(problems.slice(0, 10), [], `${problems.length} shape problem(s)`);
  });
}

test("referential integrity: every SKU, supplier and site referenced exists", () => {
  const skus = new Set(dataset.products.map((p) => p.sku));
  const suppliers = new Set(dataset.suppliers.map((s) => s.id));
  const sites = new Set(dataset.warehouses.map((w) => w.id));
  for (const s of dataset.stock) assert.ok(skus.has(s.sku), `stock ${s.sku}`);
  for (const b of dataset.bins) {
    assert.ok(sites.has(b.warehouse), `bin site ${b.warehouse}`);
    if (b.sku) assert.ok(skus.has(b.sku), `bin sku ${b.sku}`);
  }
  for (const po of dataset.purchaseOrders) {
    assert.ok(suppliers.has(po.supplierId), `po supplier ${po.supplierId}`);
    for (const l of po.lines) assert.ok(skus.has(l.sku), `po line ${l.sku}`);
  }
  for (const p of dataset.products) assert.ok(suppliers.has(p.supplierId), `product supplier ${p.supplierId}`);
});

/** Walk any selector result and collect paths to numbers that aren't finite (NaN, Infinity). */
function nonFinite(value, path = "", out = []) {
  if (typeof value === "number") { if (!Number.isFinite(value)) out.push(`${path} = ${value}`); }
  else if (Array.isArray(value)) value.forEach((v, i) => nonFinite(v, `${path}[${i}]`, out));
  else if (value && typeof value === "object") for (const [k, v] of Object.entries(value)) nonFinite(v, `${path}.${k}`, out);
  return out;
}

test("every selector the views call works on live data (no NaN, no throw)", () => {
  inv.hydrate(dataset);
  assert.ok(inv.STORES.length > 0 && inv.DCS.length > 0, "stores and DCs derived");
  const skus = inv.PRODUCTS.map((p) => p.sku);
  const results = {
    totals: inv.totals(),
    lowStock: inv.lowStock(),
    unitsByCategory: inv.unitsByCategory(),
    unitsByWarehouse: inv.unitsByWarehouse(),
    supplierMetrics: inv.supplierMetrics(),
    spendContribution: inv.spendContribution(),
    cohortSummary: inv.cohortSummary(),
    poStatusSummary: inv.poStatusSummary(),
    avgPoCycleTime: inv.avgPoCycleTime(),
    suppliersByTerms: inv.suppliersByTerms(),
    outstandingByTerms: inv.outstandingByTerms(),
    poTotals: inv.PURCHASE_ORDERS.map(inv.poTotal),
    onShelfByStore: inv.onShelfByStore(skus),
    offShelfByWarehouse: inv.offShelfByWarehouse(skus),
    floors: inv.DCS.map((d) => inv.warehouseFloor(d.id)),
    capacity: inv.DCS.map((d) => inv.siteBinCapacity(d.id)),
  };
  assert.deepEqual(nonFinite(results).slice(0, 10), []);
  assert.ok(results.totals.units > 0 && results.totals.value > 0, "inventory has units and value");
  assert.equal(results.totals.skus, dataset.products.length);
  assert.ok(results.avgPoCycleTime.count > 0, "closed POs feed the cycle-time KPI");
});

test("If-None-Match returns 304 (cheap revalidation)", async () => {
  const res = await fetch(`${API}/api/v1/dataset`, { headers: { "If-None-Match": datasetResponse.headers.get("etag") } });
  assert.equal(res.status, 304);
});

test("API is read-only: writes are rejected", async () => {
  for (const method of ["POST", "PUT", "PATCH", "DELETE"]) {
    const res = await fetch(`${API}/api/v1/dataset`, { method });
    assert.ok([403, 404, 405].includes(res.status), `${method} -> ${res.status}`);
  }
  const admin = await fetch(`${API}/api/admin/purchase-orders`, { method: "POST" });
  assert.ok([404, 405].includes(admin.status), `admin routes not mounted (got ${admin.status})`);
});

test("security headers are present", async () => {
  const res = await fetch(`${API}/api/v1/meta`);
  assert.equal(res.headers.get("x-content-type-options"), "nosniff");
  assert.equal(res.headers.get("x-frame-options"), "DENY");
  assert.match(res.headers.get("content-security-policy") ?? "", /default-src 'none'/);
  assert.ok(res.headers.get("x-request-id"), "request id");
});

test("bad input is rejected with problem+json, not a stack trace", async () => {
  const res = await fetch(`${API}/api/v1/forecast?limit=999999`);
  assert.equal(res.status, 422);
  assert.match(res.headers.get("content-type") ?? "", /problem\+json/);
  const body = await res.text();
  assert.doesNotMatch(body, /Traceback|psycopg|sqlalchemy/i);
});

test("CORS only allows the configured origin", async () => {
  const res = await fetch(`${API}/api/v1/meta`, { headers: { Origin: "https://evil.example" } });
  assert.equal(res.headers.get("access-control-allow-origin"), null);
});
