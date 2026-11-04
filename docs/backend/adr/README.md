# Architecture decision records

Short records of decisions made during the build that changed or sharpened the original design. Each states the context, the decision and its consequences, so a reviewer can see *why* the code looks the way it does.

| # | Decision | Status |
|---|---|---|
| [0001](0001-dataset-endpoint-and-in-place-hydration.md) | Serve a front-end-shaped dataset and hydrate the existing arrays in place (strangler pattern) | Accepted |
| [0002](0002-ci-postgres-service-container.md) | Integration tests on a Postgres service container, not Neon branches | Accepted |
| [0003](0003-forecasting-in-numpy.md) | Forecasting models implemented in numpy; Croston only for intermittent series | Accepted |
| [0005](0005-simulator-plans-outside-core.md) | Keep the simulator's future events out of the system of record | Accepted |
| [0006](0006-private-backend-repo.md) | Backend in a private repo; the public front end reaches it only through the read-only API | Accepted |
| [0007](0007-frozen-dataset-cut-off.md) | Freeze the published dataset at a cut-off date; no scheduled database writes | Accepted |
| [0008](0008-month-end-history-snapshots.md) | Look back in time with month-end snapshots built offline, not an as-of API | Accepted |
| [0009](0009-scd2-cost-price-history.md) | Cost and price history as SCD Type 2; facts use the cost effective on their date | Accepted |
| [0010](0010-promotion-aware-forecasting.md) | Model promotions as a lift on base demand, measured in the back-test | Accepted |
| [0011](0011-demand-realism.md) | Product-level weekly demand shocks for realistic variability | Accepted |
| [0012](0012-monitoring-and-accessibility.md) | Free production monitoring; WCAG A/AA enforced in CI | Accepted |
| [0013](0013-decision-tools.md) | Service-level and working-capital decision tools computed in the browser | Accepted |
