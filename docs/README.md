# Retail Inventory Control Tower: documentation

A full-stack retail inventory platform: a React dashboard on GitHub Pages, a read-only API, a Postgres system of record with an analytics layer, and a pipeline that simulated 24 months of multi-site retail (to a fixed cut-off of 31 Oct 2026) and runs demand forecasting and statistical replenishment. It opens on an Executive Summary, and an As-of selector replays the whole dashboard at any of the last twelve month-ends. All data is synthetic. Running cost: $0.

**[Open the live app](https://avixd.github.io/retail-inventory-app/)**

## Read in this order

| # | Document | For |
|---|---|---|
| 1 | [Overview: how it works, good practice, pros and cons](backend/README.md) | Everyone (5 minutes) |
| 2 | [Security: threat model, controls, breach response](backend/security.md) | Technical reviewers |
| 3 | [Cost: why it's $0 and stays that way](backend/cost.md) | Technical reviewers |
| 4 | [Data pipeline, end to end](backend/data-pipeline.md) · [Data dictionary](backend/data-dictionary.md) | How every number is produced, checked and published; every table and column |
| 5 | [Option analysis](backend/option-analysis.md) → [High-level design](backend/high-level-design.md) → [Low-level design](backend/low-level-design.md) | Deep dive: requirements, schema, API, maths |
| 6 | [Architecture decisions](backend/adr/README.md) | Why the code looks the way it does |
| 7 | [Front-end architecture](architecture.md) · [View-by-view walkthrough](technical-walkthrough.md) · [Front-end decisions](decisions.md) | The dashboard itself |
| 8 | [Setup guide](backend/setup-guide.md) · [Runbook](backend/runbook.md) · [Local development](backend/local-dev.md) | Operating it |

The backend **code** is in a private repository (available on request). Its documentation is published here because it contains no code and no secrets: the system's security does not rely on its design being hidden.
