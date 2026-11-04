# 0007: Freeze the published dataset at a cut-off date

**Date:** 02/11/2026 · **Status:** Accepted · **Supersedes:** the daily schedule in the original nightly design

## Context

The pipeline was designed to advance the simulated business every night. The owner wants the opposite for a portfolio piece: every visit should show the same, reviewable data, and launching or redeploying the project must never change the database. Looking back in time is more useful to a reviewer than a moving "today".

## Decision

- The dataset ends at a fixed `DATA_CUTOFF` (31 Oct 2026, a month end so monthly KPIs close cleanly), defined once in `pipeline/retail_pipeline/generate/history.py`.
- `seed` and the advance job default to that date, not "yesterday". The advance workflow has **no schedule**; it runs only when started by hand.
- The public site ships a static snapshot taken at the cut-off, so it shows the real backend data even when the API is asleep or not deployed.

## Consequences

- Reproducible: the same seed and cut-off rebuild identical data (determinism is covered by tests).
- Lower cost and attack surface: no scheduled database writes, no recurring Actions minutes, and any unexpected write is an anomaly worth investigating.
- The "nightly pipeline" becomes a capability demonstrated by CI (which runs it on every push) rather than a live process.
- Moving forward in time is a deliberate release: change the constant, run the workflow, review, publish.
- Looking back in time is served by month-end snapshots ([ADR 0008](0008-month-end-history-snapshots.md)).
