# 0011: Product-level demand shocks for realistic variability

**Date:** 04/11/2026 · **Status:** Accepted

## Context

Daily store-level noise averages away when demand is summed across 5 stores and 7 days, so 59 of 60 SKUs classified as X (steady). Segmentation, safety stock and forecasting all looked easier than real retail.

## Decision

Each product gets a volatility profile (steady 50%, variable 32%, erratic 18%; slow movers lean erratic). Every week a log-normal multiplier with mean 1 (σ = 0.10 / 0.45 / 0.80) scales the product's demand in **all** stores, and erratic products have lumpy weeks (20% chance of a week at 10% of normal). Planners don't see the shocks. The multiplier is a pure function of (seed, product, week).

## Calibration (full two-year history, offline)

| Measure | Before | After |
|---|---|---|
| XYZ mix (X / Y / Z) | 59 / 1 / 0 | 35 / 15 / 10 |
| Lost sales, share of demand | — | 6.1% |
| Worst DC bin fill | 1.15× | 1.10× |

## Consequences

Forecast error rises to a realistic level, buffers matter, and the ABC-XYZ matrix carries real decisions. Requires catalogue v3 and a reseed.
