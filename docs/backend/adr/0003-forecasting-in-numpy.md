# 0003 · Forecasting models implemented in numpy

Date: 02/11/2026 · Status: accepted (refines LLD §4.5)

## Context

The LLD named statsmodels for Holt-Winters. Two problems surfaced in testing. First, statsmodels' seasonal initialisation wants two full cycles in every backtest fold, which 24 months of weekly data can't give the earliest folds. Second, the first model-selection run on the generated data chose Croston for 255 of 300 series, most of them not intermittent, where Croston's bias correction quietly under-forecasts by about 5%.

## Decision

- Implement seasonal naive, simple exponential smoothing (SES), additive damped Holt-Winters and Croston-SBA directly in numpy. Holt-Winters is fitted across a 90-point parameter grid in one vectorised pass and initialised from a single season.
- Croston is only a candidate when demand is intermittent (average demand interval ≥ 1.32 weeks, the Syntetos-Boylan cut-off).
- Forecast unconstrained demand (sales + lost sales), not sales.

## Consequences

Measured on the generated data (300 store × SKU series, rolling-origin backtest, 4 folds × 8 weeks):

| | Before | After |
|---|---|---|
| Chosen models | Croston 255, naive 32, HW 13 | SES 246, naive 33, HW 12, Croston 9 |
| Volume-weighted WAPE | 30.9% | 30.9% |
| Weighted bias | not measured | −0.9% |
| Beats seasonal naive | 89% of series | 89% of series |

Same accuracy, honest model labels, near-zero bias. The finding worth stating plainly: at store × SKU × week level, last year's exact week is mostly noise, so smoothing beats copying it. Seasonality pays off at higher levels of aggregation.

The pipeline also drops a heavy dependency, and every formula is visible and unit-tested.
