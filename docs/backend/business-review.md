# Business review: what this is, why it matters, and an honest critique

**Date:** 03/11/2026 · **Audience:** business stakeholders, hiring managers, reviewers · **Status:** MVP (Phase 1) live at [avixd.github.io/retail-inventory-app](https://avixd.github.io/retail-inventory-app/)

## 1. In one paragraph

A multi-site retailer's inventory decisions (what to reorder, where capital is tied up, which suppliers to trust, what to pay first) usually live in four systems and a spreadsheet. This MVP puts them on one screen, opens on the six findings a leader needs at month-end with the money attached, and lets anyone replay the business at any of the last twelve month-ends. Underneath is a real data platform: an append-only stock ledger, statistical forecasting and replenishment, data-quality gates and a read-only API, all running at **$0**. The data is simulated, so the value here is the **method and the decision design**, not the specific numbers.

## 2. The problem, and who has it

| Who | Question they can't answer quickly today | Cost of not knowing |
|---|---|---|
| Inventory / replenishment planner | What will run out before the next delivery, and how much to order? | Stock-outs (lost sales, lost customers) or over-ordering (cash and space) |
| Finance / CFO | How much cash is in stock, where, and is it earning its keep? | Working capital locked in slow stock; GMROI unknown by site |
| Procurement | Which suppliers deliver on time and in full, and how concentrated is our spend? | Paying for unreliability; single-supplier exposure |
| Operations leadership | What changed since last month, and where do I act first? | Monthly reviews spent assembling numbers instead of deciding |

## 3. What the MVP does

| Capability | Business question answered |
|---|---|
| **Executive Summary** (landing view) | Inventory investment, sales at risk, stock-out rate, network GMROI, supplier concentration, overdue payables: each with its change since last month-end, a takeaway, and a link to the detail |
| **Strategic KPI scorecard** | Is the return on inventory improving, and why? GMROI (north star) = markup on cost × turns, plus days of supply and the stock-out guardrail, each against the business's own best sustained performance |
| **Planning views** | How good are the forecasts (accuracy and bias vs a naive baseline)? What should be reordered and why (worked safety-stock maths)? Is capital held where the revenue is (ABC-XYZ)? Which sites under-perform? |
| **Look back in time** | How did we stand at any of the last twelve month-ends? What moved? |
| Reorder / low-stock | Which SKUs are below their statistical reorder point, and what to buy |
| Off-shelf / warehouse | How much capital sits in DC reserve; bin-level fill |
| Procure-to-pay | Where POs are stuck; cycle time; payables by terms |
| Supplier performance | Weighted, transaction-based scorecard; cohorts; spend Pareto |
| Platform (behind the screen) | Ledger, star schema, forecasts with back-tested accuracy, replenishment policy, 11 data-quality gates, data dictionary, read-only API |

## 4. Unique selling points

1. **Decision-first, not chart-first.** The landing view states findings in sentences with a dollar figure and a "what to do next" link. Most inventory dashboards open on charts and leave the interpretation to the reader.
2. **Defensible numbers.** Every figure traces to one function, one file, one SQL view ([data-pipeline.md §4](data-pipeline.md)), and the method is printed on the page. When the first version produced a flattering but wrong GMROI (75×, averaging stores and ignoring the DC stock behind them), the design caught it and replaced it with the network figure (~11×).
3. **Time travel without a database.** Twelve month-end states are rebuilt deterministically and shipped as static files. Reviewing "last quarter as it was" costs nothing, can't be altered, and needs no access control beyond the website.
4. **Production-grade foundations at $0.** Least-privilege database roles, a read-only API, data-quality gates that roll back bad loads, CI on every change, a generated data dictionary, ADRs, and a breach-response playbook ([security.md](security.md), [cost.md](cost.md)).
5. **One model, many front ends.** The same analytics layer feeds the web app and is designed to feed Power BI, so the logic is written once.

## 5. What the concept implies

- **The value is in the layer between ERP and the boardroom.** The ERP records transactions; it doesn't tell a leader what to act on. A thin, governed "decision layer" over existing systems is cheaper and faster to build than replacing systems, and it's where analytics teams create visible value.
- **Month-end snapshots are a governance feature, not just a cost saving.** A frozen, reproducible view of each month is what finance and audit want: the number shown in October's review can be shown again in March, unchanged.
- **Statistical policy beats rules of thumb.** Reorder points derived from demand and lead-time variability, by service-level class, make the inventory trade-off explicit. The organisation chooses a service level and the system sizes the stock, instead of planners padding orders "to be safe".
- **Network thinking matters.** Store-level metrics flatter performance when the warehouse carries most of the stock. Executive metrics must be computed across the whole network.

## 6. Real-life applications

| Sector | Use case | Primary value lever | What would change for a real deployment |
|---|---|---|---|
| Multi-store specialty or grocery retail | Store and DC replenishment; month-end inventory review | Fewer stock-outs; less excess stock | Connect POS and ERP feeds; daily refresh; promotion-aware forecasts |
| Wholesale and distribution | Supplier performance and spend concentration; DC stock health | Better supplier terms; lower safety stock through reliable suppliers | Supplier portal data; contract terms; landed cost |
| Pharmacy and healthcare supply | Availability of critical items; expiry-aware stock | Service level on critical SKUs | Lot and expiry tracking; regulatory audit trail (snapshots help) |
| Spare parts and MRO | Intermittent-demand items (the Croston model is already included) | Lower inventory for slow movers without stock-outs | Installed-base drivers; multi-echelon policy |
| E-commerce with 3PLs | Inventory across owned and 3PL warehouses | Working capital; fulfilment availability | 3PL stock feeds; transfer costs |
| Private equity / turnaround | Rapid working-capital diagnostic of a portfolio company | Cash release from inventory | One-off load of the target's data; the month-end replay shows the trend |

**Illustrative value (synthetic data, method only):** at 31 Oct 2026, $1.03M of the $1.17M inventory sits in DC reserve. Releasing 10% of reserve through statistical reorder points frees about $100K of cash. The $74.7K of sales at risk over one lead time is the size of the prize for faster replenishment of 34 at-risk positions.

## 7. Critique

### Strengths
- Clear business framing; the summary answers "so what" in seconds.
- Engineering is real, tested and documented end to end; every number is traceable.
- Security and cost were designed in, not bolted on: read-only by construction, $0 by construction.

### Weaknesses, stated plainly

| Weakness | Why it matters | Mitigation or next step |
|---|---|---|
| **Synthetic data** | Patterns are generated, not observed. Variability is calibrated (XYZ 35/15/10, lost sales ~6% of demand) and costs and prices change over time, but 88% of value sits in DCs and GMROI (~10-11×) is high for retail | Say so on every page (done); the method transfers to real data unchanged |
| **Bins over capacity (fixed)** | The simulator put stock away into each SKU's assigned bin without overflowing to spare bins: at 31 Oct, 110 of 192 DC bins exceed capacity (worst 5.7×). The warehouse map shows them as "Full", which understates the problem. Found while recording the demo | A data-quality warning now reports it on every load; fix put-away to overflow into empty bins, then rebuild the history (first item of the next phase) |
| **Promotion modelling helps less than expected** | The lift is recovered accurately (≈54% for a 20% discount vs 50% simulated) but promotion-week error improves only ~1 point, because week-to-week demand swings dominate | Reported as measured on the Demand Forecast view; next: price elasticity and a model of the demand swings (e.g. external signals) |
| **Small scale** | 60 SKUs and 8 sites; real retailers have 10k-1M SKU-locations | Architecture scales (set-based SQL, per-series models parallelise); untested at that size |
| **Read-only** | Shows decisions but can't action them (raise the PO, approve the transfer) | Write paths exist in code for dev only; production would need authentication, approvals and audit |
| **Monthly granularity for history** | Month-end replay can't show intra-month events | Fine for governance reviews; daily ops would use the live API |
| **No authentication or row-level security** | Fine for public synthetic data; unacceptable for real data | Real deployment: SSO, RLS by region/store, audit log (designed for in [security.md](security.md)) |
| **Single currency, single business unit** | Real groups span currencies and banners | Currency dimension and FX table |

### Risks
- **Free-tier dependence** (if the live API is deployed): quotas pause service rather than bill. The site never depends on it.
- **Over-trust in model outputs:** reorder points are only as good as the lead-time data; the summary shows method and baseline accuracy to keep users sceptical.

## 8. From MVP to production

| Area | MVP (today) | Production |
|---|---|---|
| Data source | Deterministic simulator | ERP, POS, WMS and supplier feeds via CDC or nightly extracts |
| Refresh | Frozen at a cut-off; month-end snapshots | Daily or intra-day, plus month-end snapshots for governance |
| Users | Anonymous, read-only | SSO, roles, row-level security |
| Actions | View only | Approve recommended POs and transfers, with audit trail |
| Models | Statistical baselines, no promotions | Promotion and price elasticity; multi-echelon safety stock; exception alerts |
| BI | Web app | Web app plus Power BI on the same semantic layer |

Phased plan for the next steps: Phase 2 (forecast and replenishment views), Phase 3 (decision tools: service-level trade-off simulator, working-capital lens, supplier risk), Phase 4 (governance: metrics layer, data trust panel, lineage), Phase 5 (Power BI).
