# Low-level design

Status: **as built (code complete, pending first deploy)** · Date: 02/11/2026 · Scope: Phases 1 and 2

> **As-built changes.** The build refined this design in five places, each recorded as a decision: the API serves a front-end-shaped dataset so existing views switch over without rewrites ([ADR-0001](adr/0001-dataset-endpoint-and-in-place-hydration.md)); CI tests on a Postgres container rather than Neon branches ([ADR-0002](adr/0002-ci-postgres-service-container.md)); forecasting models are implemented in numpy with SES added and Croston limited to intermittent series ([ADR-0003](adr/0003-forecasting-in-numpy.md)); roles are created with SQL because console roles inherit `neon_superuser` ([ADR-0004](adr/0004-least-privilege-roles-via-sql.md)); simulator plans live in `ops`, not `core` ([ADR-0005](adr/0005-simulator-plans-outside-core.md)). Also: the product hierarchy column is `product_class` (`class` is an SQL keyword), the supplier fill rate is measured as **line fill** (share of PO lines delivered complete on first receipt), and the scorecard and KPIs are computed in SQL views rather than Python jobs. The sections below are updated to match.

How each component in the [high-level design](high-level-design.md) is built: repository layout, database objects, the analytics maths, the API contract, pipeline jobs, front-end integration, CI/CD and testing. Requirement IDs (FR-xx, NFR-xx) refer to the HLD.

## 1. Repository layout

Since 02/11/2026 the code is split across two repositories (see [ADR 0006](adr/0006-private-backend-repo.md)): the front end stays in the public `retail-inventory-app` repo so the existing Pages workflow keeps working, and everything below the API line (`backend/`, `pipeline/`, these docs, the backend workflows) lives in the private `retail-inventory-backend` repo. The tree below shows both, merged. Backend and pipeline are separate Python projects because they have different dependency footprints: the API must fit in 512 MB, the pipeline needs pandas and statsmodels.

```text
/                              React front end (unchanged location)
├── src/api/client.js          fetch wrapper, timeouts, base URL
├── src/api/useLiveData.js     snapshot-first data hook
├── src/components/DataStatus.jsx   "Live / Snapshot · as of …" badge
├── public/snapshot/           generated at build time, git-ignored
├── backend/                   FastAPI service (deployed to Render)
│   ├── pyproject.toml, uv.lock, Dockerfile, .env.example
│   ├── app/
│   │   ├── main.py            app factory, middleware, router registration
│   │   ├── core/              config, db, logging, errors, security
│   │   ├── api/v1/            one router per domain (read-only)
│   │   ├── api/v1/admin/      write routers, imported only if ADMIN_API_ENABLED
│   │   ├── schemas/           Pydantic response and request models
│   │   └── repositories/      SQL, one module per domain
│   ├── migrations/            Alembic environment and versions
│   └── tests/{unit,integration}/
├── pipeline/                  nightly jobs (run in GitHub Actions)
│   ├── pyproject.toml, uv.lock
│   ├── retail_pipeline/
│   │   ├── generate/          calendar, catalogue, demand, procurement, seed
│   │   ├── simulate_day.py
│   │   ├── refresh.py
│   │   ├── forecast/          models, backtest, run
│   │   ├── replenishment.py, classification.py, scorecard.py, kpis.py
│   │   ├── dq_checks.py
│   │   └── export_snapshot.py
│   └── tests/
├── powerbi/                   retail-inventory.pbix, screenshots/
└── .github/workflows/         ci.yml, deploy.yml, api-release.yml, nightly.yml
```

## 2. Technology and version policy

| Concern | Choice | Notes |
|---|---|---|
| Language | Python 3.12 | Same version in API container, pipeline and CI |
| Dependency management | `uv` with committed lock files | Reproducible installs, fast in CI |
| API framework | FastAPI, Pydantic v2, Uvicorn | OpenAPI docs generated at `/docs` |
| Data access | SQLAlchemy 2.x Core + psycopg 3 | Core, not ORM: the API runs read queries against views, so an ORM adds weight without value |
| Migrations | Alembic, hand-written SQL in each revision | Views, roles and grants are versioned like tables |
| Rate limiting | slowapi | In-memory; fine for a single instance |
| Pipeline maths | numpy, pandas | Forecasting models and Canadian holiday rules implemented in code ([ADR-0003](adr/0003-forecasting-in-numpy.md)); pipeline only, never in the API image |
| Normal distribution | Python standard library `statistics.NormalDist` | Avoids pulling SciPy in for one function |
| Lint / types | ruff, mypy | Enforced in CI |
| Tests | pytest, httpx | Integration tests run against a Neon branch |

Exact package versions are resolved and recorded in the lock files when each component is built, not guessed here. The Postgres major version is whatever Neon provisions by default; it's recorded at provisioning. The design assumes Postgres 17 or later for the `MAINTAIN` privilege (§3.4); on 16 the pipeline role owns the materialised views instead.

## 3. Database

### 3.1 Schemas

| Schema | Purpose | Who reads | Who writes |
|---|---|---|---|
| `core` | Normalised system of record | Pipeline | Pipeline (`etl_runner`), dev-only admin API (`app_writer`) |
| `analytics` | Dimensions, facts, model outputs and the `v_*` views the API serves | API (`app_reader`), Power BI, pipeline | Pipeline |
| `ops` | Job runs, data-quality results, audit log | Pipeline, admin | Pipeline, admin API |

The production API never touches `core` directly. Everything it serves goes through `analytics.v_*` views, so the public surface is a short, reviewable list of views.

### 3.2 Core tables

Surrogate integer keys for joins; human-readable business codes (`SKU-1001`, `PO-24017`) kept unique for display and APIs. Money is `numeric(12,2)`. All dates are `date`; event timestamps are `timestamptz`.

| Table | Key columns | Notes and constraints |
|---|---|---|
| `location` | `location_id`, `code` (unique), `name`, `location_type` (`DC`/`STORE`), `city`, `province`, `region` | Seeded with the current 8 Canadian sites |
| `supplier` | `supplier_id`, `code`, `name`, `contact_email`, `payment_terms_days`, `preferred_terms_days`, `quoted_lead_days`, `ordering_cost`, `onboarded_year` | `ordering_cost` feeds EOQ. Emails use `.example` |
| `product` | `product_id`, `sku`, `name`, `department`, `product_class`, `subclass`, `style`, `supplier_id`, `uom`, `unit_cost`, `unit_price`, `pack_size`, `holding_cost_rate` (default 0.25), `active`, `launched_on` | Hierarchy kept on the product row (small, stable). `unit_price > unit_cost` check |
| `promotion` | `promotion_id`, `product_id`, `starts_on`, `ends_on`, `discount_pct` | Drives demand uplift in the generator |
| `bin` | `bin_id`, `location_id`, `bin_code`, `aisle`, `capacity_units` | DC locations only (trigger-enforced). Unique per location |
| `stock_movement` | `movement_id`, `occurred_on`, `location_id`, `product_id`, `movement_type`, `qty`, `bin_id`, `ref_type`, `ref_id` | **Append-only ledger.** `movement_type` ∈ `OPENING`, `SALE`, `RECEIPT`, `TRANSFER_OUT`, `TRANSFER_IN`, `ADJUSTMENT`, `RETURN`. `qty` signed, never zero. `UPDATE` revoked from every role; deletion only through the prune function |
| `sales_daily` | PK (`sale_date`, `location_id`, `product_id`), `units`, `gross_revenue`, `promo_flag` | Store locations only. Source for demand history |
| `purchase_order` | `po_id`, `po_no`, `supplier_id`, `ship_to_location_id`, `status`, `created_on`, `submitted_on`, `approved_on`, `expected_on`, `closed_on`, `payment_terms_days` | `status` ∈ `DRAFT`, `SUBMITTED`, `ON_HOLD`, `OPEN`, `PARTIALLY_RECEIVED`, `RECEIVED`, `CLOSED`, `CANCELLED` |
| `purchase_order_line` | PK (`po_id`, `line_no`), `product_id`, `qty_ordered`, `unit_cost` | `qty_ordered > 0` |
| `goods_receipt` | `grn_id`, `grn_no`, `po_id`, `location_id`, `received_on`, `status` | |
| `goods_receipt_line` | PK (`grn_id`, `line_no`), `po_line_no`, `product_id`, `qty_received`, `qty_rejected` | Both ≥ 0. Rejections feed the quality score |
| `transfer_order` | `transfer_id`, `to_no`, `from_location_id`, `to_location_id`, `status`, `created_on`, `shipped_on`, `received_on` | `from_location_id <> to_location_id` |
| `transfer_order_line` | PK (`transfer_id`, `line_no`), `product_id`, `qty` | |
| `supplier_invoice` | `invoice_id`, `invoice_no`, `invoice_type` (`INVOICE`/`CREDIT`), `supplier_id`, `po_id`, `invoice_date`, `due_date`, `amount`, `paid_on`, `status` | Credit notes feed the relationship score |
| `holiday` | `holiday_date`, `name`, `province` | Canadian statutory holidays; used by the generator and `dim_date` |

Indexes beyond primary and unique keys: `stock_movement (product_id, location_id, occurred_on)`, `sales_daily (product_id, sale_date)`, `purchase_order (status)`, `purchase_order (supplier_id, created_on)`.

### 3.3 Analytics layer

A Kimball-style star schema. Dimensions are type-1 (overwrite); slowly changing history is out of scope and stated as a limitation.

| Object | Type | Grain | Built from |
|---|---|---|---|
| `dim_date` | table | one row per calendar date | generated; flags holidays, ISO week, month, quarter (calendar fiscal year) |
| `dim_product`, `dim_location`, `dim_supplier` | views | one row per entity | `core` tables |
| `fact_sales_daily` | view | date × store × product | `sales_daily` + cost for margin |
| `fact_inventory_daily` | materialised view | date × location × product, end-of-day on hand | running sum of `stock_movement` over a date spine |
| `fact_po_line` | materialised view | PO line | PO, receipts and dates: received qty, fill %, on-time flag, actual lead days |
| `inventory_position` | view | location × product, now | on hand + open PO qty not yet received + inbound transfers in transit |
| `product_classification` | table (model output) | product, per run | ABC, XYZ, revenue share, CV |
| `forecast_weekly` | table (model output) | run × product × store × week | chosen model's forecast with 80% interval |
| `forecast_accuracy` | table (model output) | run × product × store × model | backtest WAPE and bias, chosen flag |
| `replenishment_recommendation` | table (model output) | run × product × location | SS, ROP, EOQ, position, recommended qty and value, status |
| `supplier_scorecard` | table (model output) | run × supplier | six sub-scores, weighted score, cohort |
| `inventory_kpi_monthly` | table (model output) | month × product × location | turns, days of supply, GMROI, stockout days |

API-facing views (`analytics.v_*`) wrap the latest successful run of each model output, so the API never has to know about run IDs: `v_inventory_overview`, `v_stock_trend_monthly`, `v_inventory_positions`, `v_reorder_alerts`, `v_warehouse_floor`, `v_movements`, `v_purchase_orders`, `v_po_pipeline`, `v_payables_by_terms`, `v_goods_receipts`, `v_transfers`, `v_products`, `v_suppliers`, `v_supplier_scorecard`, `v_spend_pareto`, `v_supplier_cohorts`, `v_forecast`, `v_abc_xyz`, `v_inventory_kpis`.

### 3.4 Roles and grants

Login roles are created with SQL by `python -m app.bootstrap_roles`, with passwords from GitHub secrets, never in the Neon console ([ADR-0004](adr/0004-least-privilege-roles-via-sql.md)). Migration 0003 grants privileges and refuses to run if either role inherits `neon_superuser`, `pg_read_all_data`/`pg_write_all_data` or any elevated attribute. As built, the pipeline refreshes materialised views through `analytics.refresh_facts()`, a `SECURITY DEFINER` function it may execute, rather than holding `MAINTAIN` (works on any Postgres version). The essentials:

```sql
-- Public API: read-only, analytics views only, short queries
ALTER ROLE app_reader SET default_transaction_read_only = on;
ALTER ROLE app_reader SET statement_timeout = '5s';
GRANT USAGE ON SCHEMA analytics TO app_reader;
GRANT SELECT ON ALL TABLES IN SCHEMA analytics TO app_reader;
ALTER DEFAULT PRIVILEGES IN SCHEMA analytics GRANT SELECT ON TABLES TO app_reader;
REVOKE ALL ON SCHEMA core, ops FROM app_reader;

-- Nightly pipeline: insert data, update order statuses, refresh views
GRANT USAGE ON SCHEMA core, analytics, ops TO etl_runner;
GRANT SELECT, INSERT ON ALL TABLES IN SCHEMA core TO etl_runner;
GRANT UPDATE ON core.purchase_order, core.transfer_order, core.supplier_invoice TO etl_runner;
GRANT SELECT, INSERT, DELETE ON ALL TABLES IN SCHEMA analytics TO etl_runner;
GRANT EXECUTE ON FUNCTION analytics.refresh_facts() TO etl_runner;  -- SECURITY DEFINER refresh
GRANT SELECT, INSERT, UPDATE ON ALL TABLES IN SCHEMA ops TO etl_runner;

-- Ledger integrity: nobody edits history
REVOKE UPDATE ON core.stock_movement FROM PUBLIC, etl_runner, app_writer;

-- app_writer exists in dev branches only; it is never created on the production branch
```

### 3.5 Synthetic data generator (FR-03, FR-04)

Deterministic given a seed, so every environment can rebuild identical data.

| Element | Rule |
|---|---|
| Catalogue | The 12 existing SKUs kept, expanded to about 60 across the same hierarchy; 12 suppliers kept |
| History | 24 months of daily store sales (two full seasonal cycles, needed for weekly seasonal models) |
| Demand | Base rate × weekly pattern (weekend uplift) × annual seasonality by department (apparel peaks Q4, outdoor peaks summer) × promotion uplift × holiday effect + noise. Around 15% of SKUs intermittent (many zero days) to exercise the intermittent-demand model |
| Replenishment history | Simulated with a reorder-point policy so receipts, POs and transfers are consistent with sales |
| Supplier behaviour | Each supplier gets a lead-time mean and variability, on-time probability, rejection rate and fill rate. These drive transactions; scores are then *measured* from those transactions, not typed in |
| Daily simulation | `simulate_day` advances one day with the same rules: sales, PO status transitions, receipts, transfers, invoices |

### 3.6 Sizing (estimate)

About 60 SKUs × 5 stores × 730 days ≈ 219,000 sales rows; 60 × 8 locations × 730 ≈ 350,000 inventory-day rows; ledger around 250,000 rows; model outputs are small. At roughly 150 bytes per row including indexes, total is about **125 MB**, a quarter of Neon's 0.5 GB free storage. The nightly job collapses movements older than 30 months into a single `OPENING` row per product and location, so storage stays flat.

## 4. Analytics methods (Phase 2)

All parameters live in one config module so they're visible and tunable. The pipeline computes these; the API only reads the results.

### 4.1 Demand statistics

Trailing 91 days of daily demand. For a DC, demand is the sum of the stores it supplies; for a store, its own sales.

- d̄ = mean daily demand, σd = standard deviation of daily demand
- L̄, σL = mean and standard deviation of actual supplier lead time over the last 12 months, from `fact_po_line`. With fewer than 5 receipts, fall back to quoted lead time and σL = 0.2 × quoted.

### 4.2 Safety stock and reorder point

Accounts for variability in both demand and lead time:

    SS  = z × √( L̄ × σd²  +  d̄² × σL² )
    ROP = d̄ × L̄ + SS

z comes from the target service level by ABC class: A = 98% (z ≈ 2.05), B = 95% (z ≈ 1.65), C = 90% (z ≈ 1.28), computed with `NormalDist().inv_cdf`.

### 4.3 Order quantity

    EOQ = √( 2 × D × S / H )      D = d̄ × 365,  S = supplier ordering cost,  H = unit cost × holding cost rate
    IP  = on hand + on order + inbound in transit
    If IP ≤ ROP:  Q = max( EOQ,  ROP + d̄ × R − IP ),  R = 7-day review period, rounded up to pack size

Status per row: `OUT` (on hand = 0), `BELOW_ROP` (IP ≤ ROP), `LOW` (IP ≤ ROP + 25% of SS), otherwise `OK`. DCs order from suppliers; stores are topped up from their DC as transfer suggestions using DC-to-store transit time.

### 4.4 ABC-XYZ classification

- **ABC** on trailing 12-month revenue across the network: cumulative share ≤ 80% → A, ≤ 95% → B, rest → C.
- **XYZ** on the coefficient of variation of weekly units over 26 weeks: CV < 0.5 → X, 0.5–1.0 → Y, > 1.0 (or no sales) → Z.

### 4.5 Forecasting

Weekly series per product × store (about 300 series), 8-week horizon.

| Candidate | When it suits |
|---|---|
| Seasonal naive (same week last year) | Baseline every model must beat |
| Simple exponential smoothing | Noisy store-level series where last year's exact week is mostly noise |
| Holt-Winters, additive, damped trend, 52-week seasonality | Smooth seasonal items (mostly X/Y) |
| Croston-SBA | Intermittent demand only (average demand interval ≥ 1.32 weeks); excluded otherwise because its bias correction under-forecasts steady demand |

Selection uses a rolling-origin backtest: 4 folds, each forecasting 8 weeks ahead, scored by **WAPE** (Σ|actual − forecast| / Σ actual). The lowest-WAPE model is chosen per series and the improvement over seasonal naive (forecast value added) is stored. The 80% interval comes from empirical quantiles of backtest errors, which avoids distribution assumptions that intermittent series break. Promotions are not used as a model input in Phase 2; that's a documented limitation and a natural Phase 3 item.

### 4.6 Supplier scorecard from transactions

Same six criteria and weights as the current UI (they sum to 1.0), now measured from trailing 12-month history:

| Criterion | Weight | Measure |
|---|---|---|
| On-time delivery | 25% | % of receipts on or before PO expected date |
| Quality | 20% | 100 − (rejected ÷ received × 100) × 8 |
| Line fill rate | 15% | % of PO lines delivered complete on the first receipt (units-based fill sat at 93-100% for every supplier and didn't discriminate) |
| Lead-time reliability | 15% | 100 − max(0, mean actual − quoted days) × 6, floor 40 |
| Payment terms | 15% | terms days ÷ preferred terms days × 100 |
| Relationship | 10% | min(years, 10) × 8 + min(credit notes ÷ $500, 20) |

Each sub-score is clamped to 0–100. Cohorts keep the existing thresholds: ≥ 82 Strategic, ≥ 70 Preferred, ≥ 58 Approved, otherwise Watchlist.

### 4.7 Inventory KPIs

| KPI | Definition |
|---|---|
| Inventory turns | trailing 12-month COGS ÷ average month-end inventory at cost |
| Days of supply | on-hand units ÷ d̄ |
| GMROI | trailing 12-month gross margin ÷ average inventory at cost |
| Stockout rate | store-product-days with zero on hand ÷ active store-product-days |
| Aged stock | units at locations with no sale of that product in 90 days |

## 5. API

### 5.1 Conventions

| Topic | Rule |
|---|---|
| Base path | `/api/v1` |
| Methods | `GET` only in production |
| Field names | camelCase in JSON (Pydantic alias generator) so the existing UI field names carry over |
| Lists | `{ "items": [...], "total": n, "limit": 50, "offset": 0, "asOf": "2026-11-02" }`; `limit` max 200 |
| Errors | RFC 9457 `application/problem+json`; no stack traces or SQL in responses |
| Caching | `Cache-Control: public, max-age=300, stale-while-revalidate=600`; `ETag` derived from the data as-of timestamp, so repeat requests get `304` |
| CORS | Allow-list from `CORS_ORIGINS` (production: `https://avixd.github.io`; dev adds localhost) |
| Rate limit | 60 requests per minute per client IP, read from the proxy's forwarded header; `429` with `Retry-After` |
| Docs | OpenAPI JSON and Swagger UI at `/docs` (read-only, safe to expose, useful in interviews) |
| Health | `/health` = process alive, **no database call** (so wake-up pings don't wake Neon); `/ready` = one `SELECT 1` |

### 5.2 Endpoint catalogue

| Endpoint | Key parameters | Source view | Serves view |
|---|---|---|---|
| `GET /api/v1/meta` | | `ops.job_run` (via view) | All (data freshness, versions) |
| `GET /api/v1/inventory/overview` | `scope` (`all`/`store`/`dc`/`location`), `location` | `v_inventory_overview` | Inventory Overview |
| `GET /api/v1/inventory/trend` | `months` (default 6) | `v_stock_trend_monthly` | Inventory Overview |
| `GET /api/v1/inventory/positions` | `location`, `sku`, `category` | `v_inventory_positions` | Overview, Off-Shelf |
| `GET /api/v1/replenishment/alerts` | `status`, `abc`, `location` | `v_reorder_alerts` | Reorder / Low-Stock |
| `GET /api/v1/warehouses/{code}/floor` | | `v_warehouse_floor` | Off-Shelf |
| `GET /api/v1/movements` | `from`, `to`, `type`, `location`, paging | `v_movements` | Stock Movements |
| `GET /api/v1/purchase-orders` | `status`, `supplier`, paging | `v_purchase_orders` | Orders |
| `GET /api/v1/purchase-orders/{poNo}` | | `v_purchase_orders` + lines | Orders |
| `GET /api/v1/procurement/summary` | | `v_po_pipeline`, `v_payables_by_terms` | Orders |
| `GET /api/v1/goods-receipts` | `from`, `to`, paging | `v_goods_receipts` | Goods Receipt |
| `GET /api/v1/transfers` | `status`, paging | `v_transfers` | Transfer Orders |
| `GET /api/v1/products`, `/suppliers` | `category`, `supplier`, `q`, paging | `v_products`, `v_suppliers` | Suppliers & Products |
| `GET /api/v1/suppliers/scorecard` | `cohort` | `v_supplier_scorecard` | Supplier Performance |
| `GET /api/v1/suppliers/spend-pareto` | | `v_spend_pareto` | Supplier Performance |
| `GET /api/v1/suppliers/cohorts` | | `v_supplier_cohorts` | Supplier Performance |
| `GET /api/v1/forecast` | `sku`, `location` | `v_forecast` | Forecast & Replenishment (Phase 2) |
| `GET /api/v1/analytics/abc-xyz` | | `v_abc_xyz` | Forecast & Replenishment (Phase 2) |
| `GET /api/v1/analytics/kpis` | `location`, `months` | `v_inventory_kpis` | Overview KPIs (Phase 2) |
| `GET /api/v1/analytics/kpis/network` | none | `v_kpi_network_monthly` | Executive Summary: network GMROI, turns, days of supply (store margin and COGS over store + DC inventory) and store stock-out rate. Per-site averages overstate GMROI because stores hold ~10% of stock (migration 0005) |

Admin endpoints (dev only, FR-09): `POST /api/v1/admin/purchase-orders`, `POST /api/v1/admin/goods-receipts`, `POST /api/v1/admin/transfer-orders`. They're registered only when `ADMIN_API_ENABLED=true`, require a bearer token checked with a constant-time comparison against a stored SHA-256 hash, connect as `app_writer`, validate business rules (for example, receipts can't exceed open PO quantity), write ledger movements in the same transaction, and record an `ops.audit_log` row. In production the flag is false, the module isn't imported and the writer credential doesn't exist.

### 5.3 Database connectivity

Connects through Neon's pooled endpoint. Pool size 5, `pool_pre_ping` on, connect timeout 10 s, and up to three retries with backoff on connection errors so a suspended Neon compute resuming doesn't surface as a failed request.

### 5.4 Configuration

| Variable | Where | Secret | Purpose |
|---|---|---|---|
| `APP_ENV` | API | no | `local`, `ci` or `prod` |
| `DATABASE_URL` | Render, CI | **yes** | `app_reader` connection string |
| `DATABASE_URL_WRITER` | local `.env` only | **yes** | `app_writer`, dev branches only |
| `ADMIN_API_ENABLED` | API | no | Defaults to `false` |
| `ADMIN_TOKEN_SHA256` | local `.env` only | **yes** | Hash of the admin bearer token |
| `CORS_ORIGINS` | API | no | Comma-separated allow-list |
| `RATE_LIMIT` | API | no | Default `60/minute` |
| `DATABASE_URL_ETL`, `DATABASE_URL_MIGRATOR` | GitHub secrets | **yes** | Pipeline and migration roles |
| `NEON_API_KEY`, `NEON_PROJECT_ID` | GitHub secrets | **yes** / no | Create and delete CI branches |
| `RENDER_DEPLOY_HOOK_URL` | GitHub secret | **yes** | Anyone holding it can trigger a deploy |
| `VITE_API_BASE_URL` | front-end build | no | Public by design; it's the API's address |
| `VITE_READ_ONLY` | front-end build | no | `true` in production; disables action buttons |

## 6. Pipeline jobs

Each job is idempotent for a given date, logs a row in `ops.job_run`, and runs as `etl_runner`.

| Job | What it does | Fails when |
|---|---|---|
| `simulate_day` | Generates the next day's sales, PO status changes, receipts, transfers and invoices; writes ledger movements. Skips if that day already exists | Any constraint violation |
| `refresh` | Rebuilds `dim_date` forward, refreshes `fact_inventory_daily` and `fact_po_line` concurrently | Refresh error |
| `classify` | ABC-XYZ (§4.4) | |
| `forecast` | Backtest and forecast all series (§4.5) | More than 10% of series fail to fit |
| `replenish` | Recommendations (§4.1–4.3) | |
| `scorecard`, `kpis` | §4.6 and §4.7 | |
| `dq_checks` | Checks below; stores results in `ops.dq_result` | Any check at severity `error` |
| `export_snapshot` | Calls the FastAPI app in-process with the reader credential and writes one JSON file per endpoint plus `manifest.json`. Because it uses the real app, the snapshot shape can't drift from the API | API error |

Data-quality checks: no negative end-of-day on hand; every active store has sales rows for the simulated day; no orphan foreign keys; receipts never exceed ordered quantity; `fact_inventory_daily` agrees with the ledger total for a random sample; latest model run exists for every output table.

## 7. Front-end integration (as built, 03/11/2026)

| Module | Responsibility |
|---|---|
| `src/data/dataSource.js` | Loads `snapshot/index.json`, then the default (latest) month; `selectMonth(date)` swaps the whole dataset; `goLive()` replaces only the **latest** month with live API data and never overrides a past month the viewer chose; `snapshotFile()` caches each immutable file once per visit |
| `src/data/inventory.js` | The original in-memory model and selectors. `hydrate()` replaces array contents in place so every view runs unchanged on backend data. Shared arrays are never passed straight to charts (Recharts 3 freezes them) |
| `src/data/summary.js` | Pure functions for the Executive Summary: `inventoryInvestment`, `salesAtRisk`, `monthKpis`, `kpiTrend`, `supplierConcentration`, `payables`, `summarise`. The selected and prior months go through the same code, so deltas are like for like |
| `src/views/ExecutiveSummary.jsx` | Six finding cards (value, delta coloured by whether up is good, takeaway, drill-down), 12-month network GMROI vs stock-out chart, method notes |
| `src/components/DataStatus.jsx` | Source badge (Snapshot / History / Live) and the "As of" month selector; visible on phones too |
| `vite.config.js` | Injects a Content-Security-Policy: the page may only connect to itself and the configured API |

**Summary metric definitions**

| Metric | Formula | Source file |
|---|---|---|
| Inventory investment | Σ (on shelf + off shelf) × unit cost; reserve share = off-shelf value ÷ total | `dataset.json` |
| Sales at risk | Σ over positions with status OUT or BELOW_ROP of max(0, d̄ × L̄ − on hand) × unit price | `replenishment.json` (rows are urgency-sorted, so all at-risk rows are within the 200 exported) |
| Stock-out rate | Share of store-SKU-days ending with zero on hand | `kpis-network.json` |
| GMROI, turns, days of supply | Store gross margin (or COGS) ÷ average daily inventory at cost over stores **and** DCs, × 365 ÷ days | `kpis-network.json` |
| Supplier concentration | Top-3 share of YTD ordered spend; spend with Watchlist suppliers (score < 58) | `spend-pareto.json`, `scorecard.json` |
| Overdue payables | Σ overdue amount of open supplier invoices | `procurement-summary.json` |

**Read-only build** (`VITE_READ_ONLY=true`, set by the Pages deploy): every form is wrapped in a disabled `<fieldset>`, action buttons are disabled with a "View only" label, and handlers return early as a second guard.

**Tests:** `npm run test:unit` (summary maths with hand-worked fixtures; every published month hydrates, every selector and summary metric is finite, dates match folders) and `npm run test:api` (contract against a running API).

## 8. CI/CD workflows

| Workflow | Trigger | Steps |
|---|---|---|
| `ci.yml` | push and pull request | Front end: `npm ci`, lint, build. Backend and pipeline: ruff, unit tests (mypy advisory). End-to-end on a `postgres:17` service container: create roles with the bootstrap script, migrate, seed 14 months, one nightly run as `etl_runner`, API tests as `app_reader`, snapshot export ([ADR-0002](adr/0002-ci-postgres-service-container.md)). Secret scan with gitleaks |
| `bootstrap.yml` | manual (type `SEED`) | First-time setup (roles → migrate → seed → analytics) or password rotation |
| `api-release.yml` | push to `master` touching `backend/**` | Run migrations as the migrator role, call the Render deploy hook, poll `/health` until healthy. Render auto-deploy is off so migrations always run first |
| `nightly.yml` | cron daily 09:17 UTC, manual dispatch | Run the §6 jobs in order; on success dispatch the public repo's `deploy.yml` with `PAGES_DISPATCH_TOKEN` |
| `deploy.yml` (public repo) | push to `master`, dispatched by nightly | Pull the snapshot from the live API, `vite build` with `VITE_API_BASE_URL`, deploy to Pages. If the API can't be reached the build still ships with the previous behaviour (built-in data) |

The nightly schedule runs in the private repo, so GitHub's 60-day inactivity shutdown (public repos only) doesn't apply.

## 9. Testing strategy

| Level | Covers | Example |
|---|---|---|
| Unit (pipeline) | Formulas against hand-calculated fixtures | SS for d̄ = 10, σd = 3, L̄ = 7, σL = 2, z = 1.65 equals 1.65 × √(7×9 + 100×4) ≈ 35.5 |
| Unit (pipeline) | Classification boundaries, scorecard weights sum to 1.0, seasonal naive reproduces last year exactly, generator determinism (same seed → same checksum) | |
| Unit (API) | Schema serialisation, parameter validation, error mapping | `limit=500` returns 422 |
| Integration | Every endpoint returns 200 and validates against its schema on a seeded Neon branch | |
| Security | `app_reader` `INSERT` is rejected by the database; `POST` to admin paths returns 404 when disabled; disallowed origin gets no CORS headers; burst traffic returns 429 | |
| Contract | Snapshot files validate against the API's Pydantic models | |

Target: 80% line coverage on pipeline business logic and API services.

## 10. Observability and runbook

- Logs: JSON lines with `request_id`, method, path, status, duration; visible in the Render log stream.
- `GET /api/v1/meta` returns data as-of date, last pipeline run and status, API version and git SHA.

| Situation | What visitors see | Action |
|---|---|---|
| Neon monthly compute used up | Snapshot badge; site fully usable | Wait for monthly reset, or reduce wake-ups |
| Render instance hours used up | Snapshot badge | Same |
| Nightly job failed | Yesterday's snapshot | Check `ops.job_run` and the Actions log; fix; re-run with manual dispatch |
| Scheduled workflow disabled after 60 quiet days | Snapshot stops advancing | Re-enable in the Actions tab |
| Credential rotation | Nothing | Reset the role password in Neon, update the Render variable and GitHub secret, redeploy |

## 11. Open items (need input at provisioning)

1. Neon region and matching Render region, chosen together to keep database round-trips short.
2. Whether to keep the API docs page (`/docs`) public. Recommended yes; it's read-only.
3. Postgres major version Neon provisions (affects §3.4 `MAINTAIN` grant).
