# Executive panel review: CTO · CIO · COO

**Date:** 03/11/2026 · **Subject:** Retail Inventory Control Tower, end to end (MVP with Phase 2 planning views) · **Format:** strategy at panel level; low-level implementation delegated to specialist teams (§6)

Throughout, **built** means implemented and tested in this repository today; **proposed** means a design for a production deployment, not yet built.

## 1. Verdict

| | Rating | One line |
|---|---|---|
| **As a portfolio MVP** | **8 / 10** (7.5 before this review) | Decision-led, rigorous and unusually well governed for its size: a GMROI-anchored KPI tree with data-derived targets, published data quality and verifiable provenance. The data is synthetic and the live backend isn't deployed |
| **As a production system for a real retailer** | **4 / 10** | The architecture and method transfer; the scale, availability, integration, identity and compliance work has not been done |

### Scorecard

| Dimension | Score | Rationale |
|---|---|---|
| Business value and clarity | 8 | Opens on a GMROI scorecard (markup × turns, guardrail, data-derived targets) and six money-framed findings; planning views explain *what to do*. No workflow to act on a decision yet |
| Analytics rigour | 8 | Forecasts chosen by back-test; accuracy **and bias** pooled exactly against a naive baseline (≈31% vs 38% WAPE); statistical safety stock with lead-time variability, recomputed in the browser; network GMROI. Promotions not modelled |
| Data model | 7 | Normalised system of record with an append-only, sign-checked stock ledger; Kimball star with conformed dimensions and periodic-snapshot facts. Dimensions are Type 1 only; no cost layers, returns or item-location attributes |
| Architecture and scalability | 6 | Stateless read API, response cache, ETags, static-first front end. Never load-tested beyond 60 SKUs × 8 sites |
| Availability and resilience | 6 | The public site depends on nothing but GitHub Pages; the live API is a single free instance with no SLA |
| Security | 8 | Least-privilege roles enforced in the database, read-only by construction, CSP, secret scanning, breach playbook. No identity layer (not needed for public synthetic data; mandatory for real data) |
| Compliance and governance | 6 | No personal or payment data by design; audit trail, immutable month-end snapshots, generated data dictionary. Gaps: data residency, retention policy, accessibility audit, statutory valuation |
| Operability | 7 | 9 data-quality gates published per month, structured logs, runbook, data release runnable in CI, checksummed snapshots. No monitoring or alerting |
| Delivery and documentation | 9 | ADRs, as-built HLD/LLD, pipeline lineage, data dictionary, cost and security analysis, business review |
| Cost | 10 | $0 by construction; no payment method anywhere, so no bill is possible |

## 2. The good, the bad and the ugly

**The good**
- **Decision-first design.** Findings lead with money and a next action; every number traces to one SQL view and shows its method.
- **Engineering discipline beyond its size.** 48 API, 30 pipeline, 22 snapshot/summary (incl. checksum verification of every published file) and 21 contract tests; CI on every change; least-privilege roles verified by attempted writes.
- **Self-correcting.** Review caught and fixed real defects: a 75× GMROI from averaging stores, a crash that blocked live data, clipped chart axes, and bins overfilled up to 5.7× capacity.
- **Static-first availability.** The public site can't be taken down by the backend; month-end snapshots are reproducible and immutable.

**The bad**
- **Not deployed live.** The API and database are designed, tested and documented, but Neon and Render accounts were never provisioned; the site runs on snapshots.
- **Thin model coverage.** No promotion effects, no price elasticity, no multi-echelon optimisation; safety stock is per site, not network-optimised.
- **Type 1 history only.** Cost, price and supplier terms are overwritten, so a past month's figures use today's master data where they read dimensions.
- **Read-only.** It recommends orders but can't place, approve or track them.

**The ugly**
- **Synthetic data hid real problems until late.** Bins were overfilled for the project's whole life until a screenshot exposed it; demand is too smooth (59 of 60 SKUs classify as "predictable"); 88% of value sits in DCs.
- **Bus factor of one.** One person knows how to operate it, and until today the data release only ran on their laptop.
- **Two repositories, one set of docs, copied by hand.** The public copy can drift from the private source.
- **Hosting region.** The planned database region is US (Ohio); a Canadian retailer would likely require Canadian residency.

## 3. Through each panellist's lens

### CTO: architecture, resilience, scale

**Single points of failure**

| Component | Failure | Impact today | Mitigation today | Production design (proposed) |
|---|---|---|---|---|
| Public site (GitHub Pages) | Outage | Site down | Global CDN; nothing else on the request path | CDN with origin failover; custom domain |
| Live API (Render, 1 free instance) | Crash, sleep, quota | Live data unavailable | Site falls back to snapshots automatically | ≥ 2 stateless instances across zones behind a load balancer; autoscale on CPU and latency |
| Database (Neon, single compute) | Outage, quota | Live data unavailable | Snapshots; data reproducible from seed | Primary + synchronous standby in another zone; read replicas for the API; point-in-time recovery |
| Data release | Laptop lost | Couldn't publish new data | **Built today:** `data-release.yml` rebuilds everything in CI | Scheduled pipeline in an orchestrator with retries and alerting |
| Secrets | Leak or loss | Credential compromise | Secret stores only, rotation workflow, playbook | Vault/Key Vault with short-lived credentials and access reviews |
| People | Maintainer unavailable | Nobody can operate it | Runbook, setup guide, ADRs | Two-person on-call; documented ownership per workstream |

**Availability (theoretical).** The site's availability is that of the CDN, because it needs nothing else. Live data's availability today is the product of two free-tier services with no SLA. A production design of two API instances, each at 99.5%, gives 1 − 0.005² ≈ 99.997% for the tier, assuming independent failures. With a zone-redundant database at about 99.95%, the end-to-end figure is bounded by the database at roughly **99.95%**: under 4.4 hours of downtime a year. Proposed targets: RPO ≤ 5 minutes, RTO ≤ 1 hour.

**Scalability.** Measured today: about 200k ledger rows and 219k daily sales rows for 60 SKUs × 8 sites × 2 years, with a full 12-month rebuild in about 30 minutes on a laptop. Extrapolated to a mid-size retailer (50k SKUs × 500 sites):

| Concern | Extrapolation | Response |
|---|---|---|
| Ledger growth | ~5 billion movements a year | Partition `stock_movement` by month; BRIN index on date; archive closed periods |
| Daily sales rows | ~9 billion a year if zero rows are stored | Store non-zero rows only; derive zeros in the semantic layer |
| Analytics | Facts too large for OLTP Postgres | Move the star schema to a columnar lakehouse (Fabric, Databricks or Snowflake); keep Postgres for operations |
| Forecasting | 25 million series | Distributed and hierarchical forecasting; global ML models per category; reconcile store to network |
| API reads | Many concurrent planners | Stateless horizontal scale, CDN-cached month-end reads, read replicas |

The code's main choices (set-based SQL, independent per-series models, a stateless API) scale; the single-node runtime does not.

### CIO: governance, security, compliance, data

**Compliance posture for a Canadian retailer**

| Obligation | Status today | Gap and proposed action |
|---|---|---|
| **PCI DSS** (card data) | Out of scope by design: no payment data anywhere | Keep it so: ingest only tokenised, aggregated sales |
| **PIPEDA / Quebec Law 25** (personal information) | No customer data. Supplier contacts are fictitious business contact information | Privacy impact assessment before any customer data; minimise supplier contact fields; cross-border transfer assessment if hosted outside Canada |
| **Data residency** | Planned database region: US (Ohio) | Choose Canadian regions (e.g. AWS ca-central-1 / Azure Canada Central) for production |
| **Record retention** (CRA: generally 6 years) | Nothing is deleted; no written policy | Documented retention schedule; archive closed periods; tested restores |
| **Inventory valuation** (IFRS IAS 2 / ASPE 3031: lower of cost and net realisable value; FIFO or weighted average) | Uses a single standard unit cost; no cost layers or write-downs | Label as management information, not statutory; add cost layers and NRV write-downs before any finance use |
| **Internal controls over financial reporting** | Append-only ledger enforced by grants, job audit trail, immutable month-end snapshots, change control via CI | Add approvals on releases, periodic access reviews, segregation of duties between data release and publishing |
| **Accessibility** (AODA, WCAG 2.0 AA in Ontario) | Labelled controls, keyboard-usable dialog; not audited | Formal WCAG audit; text alternatives for charts (tables exist for most) |

**Data model.** How the retail entities map, measured against Kimball retail conventions and the concepts in the ARTS/NRF operational data model:

| Layer | Built | Proposed additions |
|---|---|---|
| System of record (3NF) | Location (DC/store, serving DC), supplier, product hierarchy (department → class → subclass → style), PO and lines, goods receipts with rejections, transfers, supplier invoices, promotions, holidays, DC bins, daily sales with **lost sales**, append-only **stock ledger** with typed, sign-checked movements | Item-location attributes, UOM conversions, cost and price history, returns and shrink reason codes, lots/expiry where relevant |
| Analytics (Kimball star) | Conformed dimensions: date, product, location, supplier. Facts: inventory **periodic snapshot** (daily), sales (daily grain), PO line (**accumulating snapshot** with lifecycle dates). Model outputs keyed by run | **SCD Type 2** dimensions for cost, price, supplier terms and store attributes; basket-level sales fact if POS data allows |
| Semantic / API | `v_*` views, the only objects the public role can read; generated data dictionary | Shared metrics layer feeding the app and Power BI |

### COO: operations, adoption, value

- **Fits the monthly operating rhythm.** Month-end review, what changed, where to act; the planning views give planners the "why" behind each order.
- **Missing the daily rhythm.** No exception alerts ("SKU X will stock out at store Y on Thursday"), no task list, no way to accept or override a recommendation and record why.
- **Adoption risks.** Planners distrust black-box orders. Mitigated by the worked safety-stock example and published accuracy; would need a pilot with an override log to build trust.
- **Value case to prove in a pilot:** working capital released from DC reserve, stock-out rate on A items, planner hours saved on month-end packs. Measure against a control group of stores.

## 4. Holes and proposed solutions

| # | Hole | Risk | Proposed solution | Owner team | Effort | Priority |
|---|---|---|---|---|---|---|
| 1 | Live backend not deployed | "Backend" is only demonstrable via snapshots | Provision Neon and Render per the setup guide; smoke test; keep snapshot fallback | Platform & SRE | S | High |
| 2 | Single-instance API and database | Downtime of live data | Production topology in §3; until then, the snapshot fallback | Platform & SRE | M | Medium (production only) |
| 3 | US hosting region | Residency non-compliance | Canadian regions; transfer impact assessment | Security & compliance | S | High before real data |
| 4 | Type 1 dimensions | Restated history; audit questions | SCD Type 2 on product cost/price, supplier terms, store attributes | Data engineering | M | Medium |
| 5 | Forecasts ignore promotions | Promo weeks under-forecast | Promotion uplift regressor; report promo-week accuracy separately | Data science | M | High |
| 6 | Synthetic demand too smooth | Segmentation and safety stock look easier than reality | Calibrate the simulator to public retail benchmarks (CV distribution, DC share) | Data science | S | Medium |
| 7 | No monitoring or alerting | Silent failures | Uptime checks, error-rate and latency alerts, data-freshness alerts | Platform & SRE | S | Medium |
| 8 | Docs copied between repos by hand | Public docs drift | CI job syncs `docs/` to the public repo on release (excluding internal plans) | Platform & SRE | S | Low |
| 9 | Read-only: no decision workflow | Recommendations not actioned | Accept/override with reason codes, approval limits, audit trail; SSO and RLS first | Product & UX + Security | L | Next phase |
| 10 | Valuation not statutory-grade | Misuse for financial reporting | Cost layers, NRV write-downs; label as management information until then | Data engineering + Finance | M | Low (until finance use) |
| 11 | Accessibility not audited | AODA exposure | WCAG 2.0 AA audit and fixes | Product & UX | S | Medium |
| 12 | Bus factor of one | Operational fragility | Second maintainer, recorded walkthrough, on-call rota | Leadership | S | High for production |

**Resolved during this review** (built and tested):

| Was | Now |
|---|---|
| Bins overfilled up to 5.7× capacity | Slots sized from the replenishment policy at peak demand; worst 1.15×; regression test |
| Data release only on one laptop | `data-release.yml` rebuilds everything in CI |
| Weighted forecast error used a 52-week proxy; no bias reported | Back-test denominator stored; WAPE and bias pooled exactly |
| Data-quality results stayed in the database | Published per month; data trust panel on the summary |
| No provenance on published data | Git SHA and SHA-256 per file in each manifest, verified by tests |
| KPI definitions scattered | `metrics/metrics.toml` → generated KPI tree; CI-validated |
| No check on product economics | `price_above_cost` blocks a load with a SKU priced at or below cost |
| Freshness check would warn forever on frozen data | Replaced by "sales loaded through the as-of date" |

## 5. Next steps (90 days)

| Window | Outcome | Teams |
|---|---|---|
| Days 0-30 | Live API deployed with monitoring; promotion-aware forecasting prototype; simulator calibration; docs sync automated | Platform & SRE, Data science |
| Days 31-60 | SCD Type 2 dimensions; decision-tools phase (service-level trade-off simulator, working-capital lens, supplier risk); WCAG audit | Data engineering, Product & UX |
| Days 61-90 | Pilot design with a real data extract (Canadian region, privacy assessment); accept/override workflow behind SSO; production topology costed | Security & compliance, Product & UX, Retail operations |

## 6. Delegation: specialist workstreams

The panel sets direction; each workstream owns its detailed design and delivery, reporting through the decision log (ADRs).

| Workstream | Mandate | First deliverables |
|---|---|---|
| **Platform & SRE** | Hosting, availability, observability, release automation | Live deployment, SLOs and alerts, HA topology design |
| **Data engineering** | Ingestion, data model, quality, lineage | SCD Type 2, partitioning plan, ERP/POS/WMS integration contracts |
| **Data science** | Forecasting and inventory optimisation | Promotion uplift, accuracy reporting by segment, calibration |
| **Security & compliance** | Identity, privacy, residency, controls | SSO + RLS design, privacy impact assessment, retention schedule |
| **Product & UX** | Decision workflow, accessibility, adoption | Accept/override flow, WCAG audit, pilot success metrics |
| **Retail operations (business owner)** | Policy choices and value realisation | Service-level targets by class, pilot stores, benefits tracking |
