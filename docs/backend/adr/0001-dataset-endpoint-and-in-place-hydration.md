# 0001 · Dataset endpoint and in-place hydration

Date: 02/11/2026 · Status: accepted

## Context

The nine existing views read shared arrays (`PRODUCTS`, `SUPPLIERS`, `BINS`...) from `src/data/inventory.js` and compute their own figures. The LLD's end state moves all business logic server-side, but rewriting nine views in one go is a big-bang change to code that works, and it would delay having *any* live data.

## Decision

Strangler-fig migration:

1. The API exposes `GET /api/v1/dataset`, which returns those arrays field for field (camelCase, same names, same shapes), computed from the database.
2. On load the front end fetches the snapshot, then the live dataset, and replaces each array's contents **in place** (`splice` / key replacement, never reassignment), so every module that imported them keeps a valid reference. A version counter remounts the active view.
3. Aggregate endpoints (`/replenishment/recommendations`, `/suppliers/scorecard`, `/forecast`...) are built alongside, and views move onto them one at a time.

## Consequences

- All nine views run on real, database-backed data immediately, with no view rewrites.
- Some logic temporarily exists twice (front-end selectors and SQL views). This is tracked: each view that moves onto an aggregate endpoint deletes its client-side selector.
- The dataset payload is bounded (recent windows, row limits) so it stays a few hundred KB.
- The snapshot is the same JSON, so offline/asleep behaviour comes free.
