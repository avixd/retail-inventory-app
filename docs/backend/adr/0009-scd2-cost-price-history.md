# 0009: Cost and price history as SCD Type 2

**Date:** 04/11/2026 · **Status:** Accepted

## Context

Product cost and price lived only on the product row. When they change, overwriting them (Type 1) silently restates history: last year's margin and inventory value get recalculated at today's cost. The simulator also never changed costs or prices, so margin was flat and the problem was invisible.

## Decision

- **Source of change:** suppliers raise costs once a year in their renewal month (1.5-6%); retail prices follow 28 days later, passing on 50-100% of the increase. The schedule is a pure function of (seed, product, date), so a paused and resumed simulation is identical.
- **Storage:** `core.product_price_history` is append-only (the loader can insert but not update or delete); `core.product` keeps the current version, checked by `price_history_current`.
- **Dimension:** `analytics.dim_product_scd2` derives `valid_to` and `is_current` from the next version, rather than updating rows.
- **Facts:** sales COGS and margin, and inventory valuation in the KPIs, join the version in force on each date. Point-in-time valuations ("what is the stock worth now") keep current cost.

## Consequences

- Gross margin moves realistically (57.8-59.0% over two years) and the markup driver of GMROI becomes meaningful.
- Range joins on 300k-row facts are cheap at this scale; at production scale, materialise a daily cost table or carry the cost on the fact at load time.
- Statutory valuation (FIFO or weighted-average cost layers, NRV write-downs) is still out of scope; this is standard-cost history for management reporting.
