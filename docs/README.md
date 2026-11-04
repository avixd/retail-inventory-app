# Retail Inventory Control Tower: documentation

A full-stack retail inventory platform: a React dashboard on GitHub Pages, a read-only API, a Postgres system of record with an analytics layer, and a pipeline that simulated 24 months of multi-site retail (to a fixed cut-off of 31 Oct 2026) and runs demand forecasting and statistical replenishment. It opens on an Executive Summary, and an As-of selector replays the whole dashboard at any of the last twelve month-ends. All data is synthetic. Running cost: $0.

**[Open the live app](https://avixd.github.io/retail-inventory-app/)** · **[Watch the demo (1:32)](https://avixd.github.io/assets/video/retail-inventory-demo.mp4)**

## Read in this order

| # | Document | For |
|---|---|---|
| 1 | [Business review: problem, USP, applications, honest critique](backend/business-review.md) | Everyone, especially business readers (5 minutes) |
| 2 | [Panel review (CTO · CIO · COO): rating, good/bad/ugly, resilience, compliance, holes and next steps](backend/panel-review.md) | Leadership and technical reviewers |
| 3 | [KPI tree and metric definitions (north star: GMROI)](backend/metrics.md) | Anyone reading the numbers |
| 4 | [Overview: how it works, good practice, pros and cons](backend/README.md) | Everyone (5 minutes) |
| 5 | [Security: threat model, controls, breach response](backend/security.md) | Technical reviewers |
| 6 | [Cost: why it's $0 and stays that way](backend/cost.md) | Technical reviewers |
| 7 | [Data pipeline, end to end](backend/data-pipeline.md) · [Data dictionary](backend/data-dictionary.md) | How every number is produced, checked and published; every table and column |
| 8 | [Option analysis](backend/option-analysis.md) → [High-level design](backend/high-level-design.md) → [Low-level design](backend/low-level-design.md) | Deep dive: requirements, schema, API, maths |
| 9 | [Architecture decisions](backend/adr/README.md) | Why the code looks the way it does |
| 10 | [Front-end architecture](architecture.md) · [View-by-view walkthrough](technical-walkthrough.md) · [Front-end decisions](decisions.md) | The dashboard itself |
| 11 | [Setup guide](backend/setup-guide.md) · [Runbook](backend/runbook.md) · [Local development](backend/local-dev.md) | Operating it |

The backend **code** is in a private repository (available on request). Its documentation is published here because it contains no code and no secrets: the system's security does not rely on its design being hidden.
