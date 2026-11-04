/**
 * Where the dashboard's data comes from, in order of preference:
 *
 *   1. Live API    (VITE_API_BASE_URL), serving the same frozen data as the snapshot.
 *   2. Snapshot    (/snapshot/<month-end>/dataset.json), published with every deploy.
 *   3. Built-in    demo arrays in inventory.js, so `npm run dev` works offline.
 *
 * The data is frozen at a cut-off date, and the snapshot folder also holds the
 * previous month-ends (snapshot/index.json lists them), so viewers can look back
 * in time. Choosing a past month loads that month's static files; only the
 * latest month is ever swapped for live API data.
 *
 * The snapshot loads first because it's a static file and renders instantly.
 * The API runs on a free tier that sleeps after 15 idle minutes and takes
 * 30-60 s to wake, so we ping /health straight away (it doesn't touch the
 * database), keep showing the snapshot, and swap to live data when it answers.
 * Views read the shared arrays in inventory.js; hydrate() replaces their
 * contents in place and subscribers re-render.
 */
import { hydrate } from "./inventory";

const API_BASE = (import.meta.env.VITE_API_BASE_URL || "").replace(/\/$/, "");
const SNAPSHOT_BASE = `${import.meta.env.BASE_URL}snapshot/`;
const LIVE_TIMEOUT_MS = 8000;
const RETRY_DELAYS_MS = [0, 15000, 30000, 60000]; // covers a full cold start

/** Public site is view-only: action buttons are disabled when this is set at build time. */
export const READ_ONLY = import.meta.env.VITE_READ_ONLY === "true";
export const VIEW_ONLY_TIP = "View-only demo: actions are disabled on the public site.";

// source: "demo" | "snapshot" (latest month) | "historical" (a past month) | "live"
let status = { source: "demo", asOf: null, version: 0, months: [], month: null, loading: false };
const listeners = new Set();

export function subscribe(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getStatus() {
  return status;
}

function setStatus(patch) {
  status = { ...status, ...patch };
  listeners.forEach((l) => l());
}

function publish(dataset, source, month) {
  hydrate(dataset);
  setStatus({ source, month, asOf: dataset?.meta?.asOf ?? month, version: status.version + 1, loading: false });
}

async function fetchJson(url, timeoutMs) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { signal: controller.signal, headers: { Accept: "application/json" } });
    if (!res.ok) throw new Error(`${res.status} ${url}`);
    return await res.json();
  } finally {
    clearTimeout(timer);
  }
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const latestMonth = () => status.months[0] ?? null;

// Month files are immutable, so each is fetched at most once per visit.
const fileCache = new Map();

/** One snapshot file for a month-end, e.g. snapshotFile("2026-09-30", "kpis.json"). Null if absent. */
export function snapshotFile(month, name) {
  const url = month ? `${SNAPSHOT_BASE}${month}/${name}` : `${SNAPSHOT_BASE}${name}`;
  if (!fileCache.has(url)) fileCache.set(url, fetchJson(url, 6000).catch(() => null));
  return fileCache.get(url);
}

/** Load the month index and the default (latest) month. Falls back silently to built-in data. */
export async function loadSnapshot() {
  try {
    const index = await fetchJson(`${SNAPSHOT_BASE}index.json`, 4000);
    setStatus({ months: index.months ?? [] });
    const dataset = await snapshotFile(index.default, "dataset.json");
    if (dataset) return publish(dataset, "snapshot", index.default);
  } catch {
    // No month index (older deploy): try the single snapshot at the root.
  }
  const dataset = await snapshotFile(null, "dataset.json");
  if (dataset) publish(dataset, "snapshot", dataset.meta?.asOf ?? null);
}

/** Switch the whole dashboard to another month-end. Never throws. */
export async function selectMonth(month) {
  if (!month || month === status.month) return;
  setStatus({ loading: true });
  const dataset = await snapshotFile(month, "dataset.json");
  if (!dataset) return setStatus({ loading: false });
  publish(dataset, month === latestMonth() ? "snapshot" : "historical", month);
  if (month === latestMonth()) goLive();
}

/** Wake the API and switch to live data when it responds (latest month only). Never throws. */
export async function goLive() {
  if (!API_BASE) return;
  fetch(`${API_BASE}/health`).catch(() => {});
  for (const delay of RETRY_DELAYS_MS) {
    if (delay) await sleep(delay);
    try {
      const dataset = await fetchJson(`${API_BASE}/api/v1/dataset`, LIVE_TIMEOUT_MS);
      // The viewer may have moved to a past month while the API was waking up.
      if (status.month && status.month !== latestMonth()) return;
      publish(dataset, "live", status.month ?? dataset?.meta?.asOf ?? null);
      return;
    } catch {
      // Still waking up or over its free-tier quota; the snapshot stays on screen.
    }
  }
}
