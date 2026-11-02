/**
 * Where the dashboard's data comes from, in order of preference:
 *
 *   1. Live API    (VITE_API_BASE_URL), refreshed nightly by the pipeline.
 *   2. Snapshot    (/snapshot/dataset.json), published with every deploy.
 *   3. Built-in    demo arrays in inventory.js, so `npm run dev` works offline.
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
const SNAPSHOT_URL = `${import.meta.env.BASE_URL}snapshot/dataset.json`;
const LIVE_TIMEOUT_MS = 8000;
const RETRY_DELAYS_MS = [0, 15000, 30000, 60000]; // covers a full cold start

/** Public site is view-only: action buttons are disabled when this is set at build time. */
export const READ_ONLY = import.meta.env.VITE_READ_ONLY === "true";
export const VIEW_ONLY_TIP = "View-only demo: actions are disabled on the public site.";

let status = { source: "demo", asOf: null, version: 0 };
const listeners = new Set();

export function subscribe(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getStatus() {
  return status;
}

function publish(dataset, source) {
  hydrate(dataset);
  status = { source, asOf: dataset?.meta?.asOf ?? null, version: status.version + 1 };
  listeners.forEach((l) => l());
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

/** Load the static snapshot (fast). Falls back silently to the built-in demo data. */
export async function loadSnapshot() {
  try {
    publish(await fetchJson(SNAPSHOT_URL, 4000), "snapshot");
  } catch {
    // No snapshot (e.g. local dev without the pipeline): keep built-in data.
  }
}

/** Wake the API and switch to live data when it responds. Never throws. */
export async function goLive() {
  if (!API_BASE) return;
  fetch(`${API_BASE}/health`).catch(() => {});
  for (const delay of RETRY_DELAYS_MS) {
    if (delay) await sleep(delay);
    try {
      publish(await fetchJson(`${API_BASE}/api/v1/dataset`, LIVE_TIMEOUT_MS), "live");
      return;
    } catch {
      // Still waking up or over its free-tier quota; the snapshot stays on screen.
    }
  }
}
