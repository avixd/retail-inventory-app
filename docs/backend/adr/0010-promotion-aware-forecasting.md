# 0010: Model promotions as a lift on base demand

**Date:** 04/11/2026 · **Status:** Accepted

## Context

The data contains planned promotions (15-30% off, about three a year per product) that roughly double demand, but the forecasting models ignored them. Promotion weeks were systematically under-forecast, and the weeks after them over-forecast because the spike leaked into the level.

## Decision

Demand in week *w* = base × (1 + β × *z*<sub>w</sub>), where *z* is the week's average promotional discount, known in advance.

- β is estimated per series as the median of (promotion-week demand ÷ median of non-promotion weeks within ±4 weeks − 1) ÷ *z*, clipped to [0, 8]; fewer than two usable promotion weeks gives β = 0.
- History is de-promoted before fitting any candidate model, and the lift is re-applied to planned promotion weeks.
- The back-test re-estimates β using **only data before each cut**, and scores promotion weeks both with and without the lift, so the gain is measured rather than assumed.

## Alternatives considered

| Option | Why not (yet) |
|---|---|
| Regression with promotion dummies (ARIMAX, Prophet) | More parameters per series than 104 weeks of data supports, and new dependencies |
| Global ML model (gradient boosting) across series | Strong at scale; overkill and less explainable for 300 series |
| Ignore, add safety stock | Pays for promotions with permanent inventory |

## Measured result (31 Oct 2026 data, 300 series)

- Lift recovered accurately: median β 2.68 against 2.5 in the simulator (a 20% discount lifts demand ≈54% vs 50%); 259 of 300 series show a measurable lift.
- Promotion-week error: **38.8% with the lift vs 39.8% without**. A real but small gain: the product-level weekly demand swings added in ADR 0011 now dominate the error in those weeks. Reported as such on the dashboard, which words its headline from the measured gain.

## Consequences

- Promotion-week accuracy is reported separately on the Demand Forecast view, with and without the lift.
- Not modelled: permanent price elasticity, cannibalisation, halo effects.
