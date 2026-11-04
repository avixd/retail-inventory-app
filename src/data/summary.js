/**
 * Executive summary: headline findings for a month-end, compared with the month before.
 *
 * Every function here is pure: it takes one month's snapshot files and returns
 * numbers, so the selected month and the prior month go through identical code
 * and the comparison is like for like. Nothing reads the shared arrays in
 * inventory.js. Definitions are spelled out next to each metric so the page can
 * show exactly how each figure was calculated.
 */
export const SUMMARY_FILES = ["dataset", "replenishment", "networkKpis", "scorecard", "spendPareto", "procurement", "dataQuality"];
const FILE_NAMES = {
  dataset: "dataset.json", replenishment: "replenishment.json", networkKpis: "kpis-network.json",
  scorecard: "scorecard.json", spendPareto: "spend-pareto.json", procurement: "procurement-summary.json",
  dataQuality: "data-quality.json",
};

/** Fetch every file the summary needs for one month-end with `getFile(month, name)`. Missing files are null. */
export async function loadMonth(month, getFile) {
  const entries = await Promise.all(SUMMARY_FILES.map(async (k) => [k, await getFile(month, FILE_NAMES[k])]));
  return Object.fromEntries(entries);
}

const items = (x) => (Array.isArray(x) ? x : x?.items ?? []);
const sum = (rows, f) => rows.reduce((s, r) => s + f(r), 0);

/** First day of the as-of month, the key KPI rows use ("2026-10-31" -> "2026-10-01"). */
export const monthKey = (asOf) => `${asOf.slice(0, 7)}-01`;

/** Inventory investment: units on hand x unit cost, split shelf vs warehouse reserve. */
export function inventoryInvestment(dataset) {
  const cost = new Map(items(dataset?.products).map((p) => [p.sku, p.unitCost]));
  const stock = items(dataset?.stock);
  const value = sum(stock, (s) => (s.onShelf + s.offShelf) * (cost.get(s.sku) ?? 0));
  const reserve = sum(stock, (s) => s.offShelf * (cost.get(s.sku) ?? 0));
  return { value, reserve, reserveShare: value ? reserve / value : 0 };
}

/**
 * Sales at risk: for every store/DC position that is out of stock or below its
 * reorder point, the demand expected during one replenishment lead time that
 * current stock can't cover, valued at retail price:
 *   sum of max(0, avg daily demand x mean lead time - on hand) x unit price
 */
export function salesAtRisk(dataset, replenishment) {
  const price = new Map(items(dataset?.products).map((p) => [p.sku, p.unitPrice]));
  const atRisk = items(replenishment).filter((r) => r.status === "OUT" || r.status === "BELOW_ROP");
  const value = sum(atRisk, (r) =>
    Math.max(0, r.avgDailyDemand * r.leadTimeMean - r.onHand) * (price.get(r.sku) ?? 0));
  return {
    value,
    out: atRisk.filter((r) => r.status === "OUT").length,
    belowRop: atRisk.filter((r) => r.status === "BELOW_ROP").length,
  };
}

/**
 * Month KPIs for the whole network (API: /analytics/kpis/network). GMROI and turns
 * divide store margin and COGS by store AND DC inventory: averaging per-site
 * figures would ignore the DC stock behind every store sale and overstate both.
 */
export function monthKpis(networkKpis, asOf) {
  const row = items(networkKpis).find((k) => k.month === monthKey(asOf));
  return {
    gmroi: row?.gmroi ?? null,
    turns: row?.turns ?? null,
    daysOfSupply: row?.daysOfSupply ?? null,
    stockoutRate: row?.stockoutRate ?? null,
  };
}

/** Network KPI trend for every month in the file (for the 12-month chart). */
export function kpiTrend(networkKpis) {
  return [...items(networkKpis)].sort((a, b) => a.month.localeCompare(b.month)).map((k) => ({
    month: new Date(`${k.month}T00:00:00Z`).toLocaleString("en-CA", { month: "short", year: "2-digit", timeZone: "UTC" }),
    gmroi: round(k.gmroi, 1),
    stockoutPct: round(k.stockoutRate == null ? null : 100 * k.stockoutRate, 2),
  }));
}

/** Supplier concentration: top-3 share of year-to-date spend, and spend with Watchlist suppliers. */
export function supplierConcentration(spendPareto, scorecard) {
  const pareto = items(spendPareto);
  const cohort = new Map(items(scorecard).map((s) => [s.supplierId, s.cohort]));
  const total = sum(pareto, (p) => p.spendYtd);
  const top3 = sum([...pareto].sort((a, b) => b.spendYtd - a.spendYtd).slice(0, 3), (p) => p.spendYtd);
  const watch = pareto.filter((p) => cohort.get(p.supplierId) === "Watchlist");
  return {
    top3Share: total ? top3 / total : 0,
    top3Names: [...pareto].sort((a, b) => b.spendYtd - a.spendYtd).slice(0, 3).map((p) => p.name),
    watchlistCount: watch.length,
    watchlistSpend: sum(watch, (p) => p.spendYtd),
    watchlistShare: total ? sum(watch, (p) => p.spendYtd) / total : 0,
  };
}

/** Supplier payables: open invoices and the part already past due. */
export function payables(procurement) {
  const rows = procurement?.payablesByTerms ?? [];
  return { outstanding: sum(rows, (r) => r.amount), overdue: sum(rows, (r) => r.overdueAmount ?? 0) };
}

const round = (n, dp = 0) => (n == null ? null : Math.round(n * 10 ** dp) / 10 ** dp);

/** All metrics for one month's files. */
export function summarise(files, asOf) {
  return {
    asOf,
    investment: inventoryInvestment(files.dataset),
    risk: salesAtRisk(files.dataset, files.replenishment),
    kpis: monthKpis(files.networkKpis, asOf),
    suppliers: supplierConcentration(files.spendPareto, files.scorecard),
    payables: payables(files.procurement),
  };
}

/** Change between months, or null when there is no prior month to compare with. */
export const delta = (cur, prev) => (prev == null || cur == null ? null : cur - prev);

/* ---------- Strategic KPI scorecard (north star: GMROI) ----------
   Definitions live in the backend's metrics catalogue (metrics/metrics.toml).
   Targets are data-derived: the best rolling 3-month average over the trailing
   12 month-ends, i.e. performance this business has already sustained. */

export const TARGET_WINDOW_MONTHS = 3;
export const WATCH_BAND = 0.1; // within 10% of target = "watch"

/** Best rolling `window`-month average of a series (oldest first). Null if too short. */
export function dataDerivedTarget(values, direction, window = TARGET_WINDOW_MONTHS) {
  const v = values.filter((x) => x != null);
  if (v.length < window) return null;
  const avgs = [];
  for (let i = 0; i + window <= v.length; i++) avgs.push(v.slice(i, i + window).reduce((s, x) => s + x, 0) / window);
  return direction === "lower" ? Math.min(...avgs) : Math.max(...avgs);
}

/** "on" at or better than target, "watch" within WATCH_BAND of it, otherwise "off". */
export function targetStatus(value, target, direction) {
  if (value == null || target == null) return null;
  if (direction === "lower") return value <= target ? "on" : value <= target * (1 + WATCH_BAND) ? "watch" : "off";
  return value >= target ? "on" : value >= target * (1 - WATCH_BAND) ? "watch" : "off";
}

const SCORECARD = [
  { id: "gmroi", name: "GMROI", tier: "north_star", direction: "higher", unit: "×", get: (k) => k.gmroi },
  { id: "turns", name: "Inventory turns", tier: "driver", direction: "higher", unit: "×", get: (k) => k.turns },
  { id: "markup", name: "Markup on cost", tier: "driver", direction: "higher", unit: "×",
    get: (k) => (k.gmroi != null && k.turns ? k.gmroi / k.turns : null) },
  { id: "days_of_supply", name: "Days of supply", tier: "driver", direction: "lower", unit: "days", get: (k) => k.daysOfSupply },
  { id: "stockout_rate", name: "Store stock-out rate", tier: "guardrail", direction: "lower", unit: "%", get: (k) => k.stockoutRate },
];

/** Scorecard for the as-of month from the network KPI file (12 trailing months). */
export function kpiScorecard(networkKpis, asOf) {
  const rows = [...items(networkKpis)].sort((a, b) => a.month.localeCompare(b.month));
  const current = rows.find((k) => k.month === monthKey(asOf));
  if (!current) return null;
  const metrics = SCORECARD.map((m) => {
    const value = m.get(current);
    const target = dataDerivedTarget(rows.map(m.get), m.direction);
    return { ...m, get: undefined, value, target, status: targetStatus(value, target, m.direction) };
  });
  const by = Object.fromEntries(metrics.map((m) => [m.id, m]));
  // GMROI = markup on cost x turns exactly; reported so the identity is visible and testable.
  return { metrics, identityGap: by.gmroi.value != null ? Math.abs(by.markup.value * by.turns.value - by.gmroi.value) : null };
}
