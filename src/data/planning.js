/**
 * Decision maths for the Service Levels and Working Capital views.
 * Pure functions over a month's published files, so every figure is testable
 * and the same code runs for every month-end.
 *
 * Service level (continuous review, normally distributed lead-time demand):
 *   sigma_LT  = sqrt(L * sd_d^2 + d^2 * sd_L^2)       demand uncertainty over the lead time
 *   SS(s)     = z(s) * sigma_LT                         safety stock for cycle service level s
 *   ESC(s)    = sigma_LT * G(z)                         expected units short per replenishment cycle
 *   cycles/yr = 365 * d / Q                             Q = the position's EOQ
 *   cost(s)   = SS(s) * unit cost * h  +  cycles * ESC(s) * unit margin
 * G is the standard normal loss function. h = 25% a year (the holding rate the
 * EOQ uses). A short unit is costed at its lost gross margin, at stores and DCs
 * alike: DC shortages propagate to store shelves, so this is the conservative
 * (upper-bound) view of a DC stock-out.
 */

export const HOLDING_RATE = 0.25;
export const CURRENT_POLICY = { A: 0.98, B: 0.95, C: 0.9 }; // analytics/config.py SERVICE_LEVEL
export const LEVEL_GRID = Array.from({ length: 40 }, (_, i) => Math.round((0.8 + i * 0.005) * 1000) / 1000); // 0.80 .. 0.995

const items = (x) => (Array.isArray(x) ? x : x?.items ?? []);

/* ---------- standard normal ---------- */
export const normalPdf = (z) => Math.exp(-z * z / 2) / Math.sqrt(2 * Math.PI);

/** Phi(z), Abramowitz & Stegun 7.1.26 (|error| < 1.5e-7). */
export function normalCdf(z) {
  const x = Math.abs(z) / Math.SQRT2;
  const t = 1 / (1 + 0.3275911 * x);
  const erf = 1 - ((((1.061405429 * t - 1.453152027) * t + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t * Math.exp(-x * x);
  return z >= 0 ? (1 + erf) / 2 : (1 - erf) / 2;
}

/** z for a cycle service level p (inverse normal, A&S 26.2.23, |error| < 4.5e-4). */
export function zFor(p) {
  const q = p < 0.5 ? p : 1 - p;
  const t = Math.sqrt(-2 * Math.log(q));
  const z = t - (2.515517 + 0.802853 * t + 0.010328 * t * t) / (1 + 1.432788 * t + 0.189269 * t * t + 0.001308 * t ** 3);
  return p < 0.5 ? -z : z;
}

/** Standard normal loss function G(z) = phi(z) - z * (1 - Phi(z)): expected shortfall per unit sigma. */
export const lossFunction = (z) => normalPdf(z) - z * (1 - normalCdf(z));

/* ---------- service level ---------- */

function enrich(replenishment, dataset) {
  const prod = new Map(items(dataset?.products).map((p) => [p.sku, p]));
  return items(replenishment)
    .filter((r) => r.avgDailyDemand > 0 && r.eoq > 0 && prod.has(r.sku))
    .map((r) => {
      const p = prod.get(r.sku);
      return {
        cls: r.abc, location: r.location, sku: r.sku,
        sigma: Math.sqrt(r.leadTimeMean * r.sdDailyDemand ** 2 + r.avgDailyDemand ** 2 * r.leadTimeSd ** 2),
        cycles: (365 * r.avgDailyDemand) / r.eoq, q: r.eoq, demand: 365 * r.avgDailyDemand,
        cost: p.unitCost, margin: Math.max(p.unitPrice - p.unitCost, 0),
      };
    });
}

/** Cost and service of one class of positions at cycle service level s. */
function classAt(positions, s) {
  const z = zFor(s);
  const g = lossFunction(z);
  let ssValue = 0, holding = 0, shortUnits = 0, lostMargin = 0, demand = 0;
  for (const p of positions) {
    const ss = Math.max(z, 0) * p.sigma;
    const short = p.cycles * p.sigma * g;
    ssValue += ss * p.cost;
    holding += ss * p.cost * HOLDING_RATE;
    shortUnits += short;
    lostMargin += short * p.margin;
    demand += p.demand;
  }
  return { level: s, ssValue, holding, shortUnits, lostMargin, totalCost: holding + lostMargin,
    fillRate: demand ? 1 - shortUnits / demand : 1, positions: positions.length };
}

/** Per class: the curve over the grid, the cost-minimising level, and the chosen and current points. */
export function serviceLevelAnalysis(replenishment, dataset, chosen = CURRENT_POLICY) {
  const all = enrich(replenishment, dataset);
  const classes = {};
  for (const cls of ["A", "B", "C"]) {
    const pos = all.filter((p) => p.cls === cls);
    if (!pos.length) continue;
    const curve = LEVEL_GRID.map((s) => classAt(pos, s));
    const optimal = curve.reduce((best, pt) => (pt.totalCost < best.totalCost ? pt : best));
    classes[cls] = { curve, optimal, chosen: classAt(pos, chosen[cls]), current: classAt(pos, CURRENT_POLICY[cls]) };
  }
  const sum = (key, pick) => Object.values(classes).reduce((s, c) => s + c[pick][key], 0);
  const totals = (pick) => ({ ssValue: sum("ssValue", pick), holding: sum("holding", pick),
    lostMargin: sum("lostMargin", pick), totalCost: sum("totalCost", pick), shortUnits: sum("shortUnits", pick) });
  return { classes, chosen: totals("chosen"), current: totals("current"), optimal: totals("optimal") };
}

/* ---------- working capital ---------- */

const DAY = 86400000;
export const AGE_BUCKETS = [
  { label: "0-30 days", max: 30 }, { label: "31-60 days", max: 60 },
  { label: "61-90 days", max: 90 }, { label: "Over 90 days", max: Infinity },
];

/**
 * DIO = network days of supply for the month; DPO (terms) = supplier payment
 * terms weighted by year-to-date spend; the gap DIO - DPO is the number of days
 * inventory has to be financed by the business rather than its suppliers
 * (retail sales are card/cash, so receivables are ~0). Excess = stock above the
 * policy's natural maximum (reorder point + EOQ). Ageing = DC bin stock by days
 * since the bin last moved.
 */
export function workingCapital({ dataset, replenishment, procurement, networkKpis }, asOf) {
  const prod = new Map(items(dataset?.products).map((p) => [p.sku, p]));
  const cost = (sku) => prod.get(sku)?.unitCost ?? 0;
  const inventory = items(dataset?.stock).reduce((s, x) => s + (x.onShelf + x.offShelf) * cost(x.sku), 0);
  const payables = (procurement?.payablesByTerms ?? []).reduce((s, r) => s + r.amount, 0);

  const net = items(networkKpis).find((k) => k.month === `${asOf.slice(0, 7)}-01`);
  const dio = net?.daysOfSupply ?? null;
  const suppliers = items(dataset?.suppliers);
  const spend = suppliers.reduce((s, x) => s + (x.spendYtd || 0), 0);
  const termDaysOf = (t) => Number(/(\d+)/.exec(t || "")?.[1] ?? 0);
  const dpo = spend ? suppliers.reduce((s, x) => s + (x.spendYtd || 0) * termDaysOf(x.terms), 0) / spend : null;

  const excessRows = items(replenishment)
    .map((r) => ({ ...r, excess: Math.max(0, r.onHand - (r.reorderPoint + r.eoq)) }))
    .filter((r) => r.excess > 0)
    .map((r) => ({ sku: r.sku, name: r.name, location: r.location, abc: r.abc, units: r.excess, value: r.excess * cost(r.sku) }))
    .sort((a, b) => b.value - a.value);

  const asOfMs = Date.parse(`${asOf}T00:00:00Z`);
  const aging = AGE_BUCKETS.map((b) => ({ ...b, value: 0, units: 0 }));
  for (const b of items(dataset?.bins)) {
    if (!b.sku || !b.qty) continue;
    const age = b.lastMove ? Math.max(0, Math.round((asOfMs - Date.parse(`${b.lastMove}T00:00:00Z`)) / DAY)) : Infinity;
    const bucket = aging.find((x) => age <= x.max);
    bucket.value += b.qty * cost(b.sku);
    bucket.units += b.qty;
  }

  const trend = [...items(networkKpis)].sort((a, b) => a.month.localeCompare(b.month)).map((k) => ({
    month: new Date(`${k.month}T00:00:00Z`).toLocaleString("en-CA", { month: "short", year: "2-digit", timeZone: "UTC" }),
    dio: k.daysOfSupply, dpo: dpo == null ? null : Math.round(dpo),
  }));

  return {
    inventory, payables, ownFunded: inventory - payables,
    dio, dpo, gapDays: dio != null && dpo != null ? dio - dpo : null,
    excessValue: excessRows.reduce((s, r) => s + r.value, 0), excessRows,
    aging, agedOver90: aging[3].value, trend,
  };
}
