# 0008: Look back in time with month-end snapshots built offline

**Date:** 03/11/2026 · **Status:** Accepted · **Builds on:** [ADR 0007](0007-frozen-dataset-cut-off.md)

## Context

Viewers should be able to see the business as it stood at earlier dates, without anything writing to the hosted database when the project is opened. Two ways to do it:

| Option | How | Verdict |
|---|---|---|
| A. As-of API | Every endpoint takes `as_of`; SQL reconstructs stock from the ledger and filters orders by date | Accurate for stock, but forecasts, reorder policies and scorecards are computed *as of a run* and can't be reconstructed by a query. Every query gets slower and more complex |
| **B. Month-end snapshots** | Rebuild history locally, run the full analytics at each month-end, export the same files the site already reads | Every figure is exactly what the system would have shown on that date, including forecasts and reorder points. Static files: no database, no cost, no new attack surface |

## Decision

Option B. `scripts/build-history-snapshots.sh` reseeds a **local** database to the first of the last twelve month-ends, then advances the deterministic simulator a month at a time, running analytics and data-quality checks and exporting a snapshot at each month-end. The site ships them under `public/snapshot/<YYYY-MM-DD>/` with an `index.json`; a selector in the header switches every view to the chosen month, and the Executive Summary compares it with the month before.

## Consequences

- Twelve consistent month-ends (~3 MB, ~0.4 MB gzipped; only the chosen month is downloaded).
- The script refuses to run against anything but a local database, because it truncates.
- History is regenerated as a whole, so all twelve months always come from one code version.
- Analytics run monthly in the build (daily in production advances), so reorder policies step monthly. That matches how planners review policy and is stated in the docs.
- The live API, when deployed, serves the latest month only.
