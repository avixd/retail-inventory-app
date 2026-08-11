# Technical walkthrough

This document walks through the solution stage by stage: first the foundation the whole app is built on, then each of the nine views and the logic behind it, then the shared building blocks. The aim is that anyone reading the code can see *why* each piece exists, not just what it does.

## Stage 0 — Foundation: model the domain once

Before any screen was built, the domain was modelled in `src/data/inventory.js`. This is the decision everything else rests on. Rather than scatter mock data through components, the app defines one internally consistent set of entities (warehouses, suppliers, products, stock, bins, POs, invoices, transfers, movements, GRNs) and a library of pure selector functions over them.

The payoff shows up everywhere downstream: every number on every screen traces back to one function, the views stay thin, and changing a rule (say, the reorder logic or a supplier weight) is a one-line edit in a single file rather than a hunt through the UI. See [architecture.md](architecture.md) for the full entity and selector catalogue.

## Stage 1 — Application shell and navigation

`main.jsx` mounts React. `App.jsx` holds the whole navigation model in one piece of state: an `active` string naming the current view. A `VIEWS` map turns that string into a component, and the `Sidebar` is the only thing that changes it. `Sidebar` renders from `NAV_ITEMS`, which groups the nine views into four sections (Overview, Inventory, Procurement, Master Data) and carries each item's label and icon.

There is no router library. For a single-user dashboard with nine self-contained screens, one state variable and a lookup are simpler, smaller and easier to reason about than URL-based routing — a case of matching the tool to the size of the problem.

## Stage 2 — The nine views

### Inventory Overview

The landing screen answers "where do we stand?" It uses `totals()` for the headline KPIs (unit counts and inventory value at both cost and retail), `STOCK_TREND` for the six-month on-hand area chart, and `scopedRows` / `unitsByCategory` to break value down by category and location. A location scope (all sites / stores only / DCs only / a single site) filters the on-shelf and off-shelf sides independently, because the two live in different places (stores vs distribution centres).

### Reorder / Low-Stock

The replenishment screen answers "what do I buy today?" `lowStock()` walks every product, compares on-hand against its `reorderPoint`, and returns those at or below the line together with a suggested order quantity and the value of covering them. The suggested-PO value gives a planner an immediate sense of the cash needed to clear the risk.

### Off-Shelf · Warehouse

This screen answers "how much is tied up in the back, and where is it?" It surfaces reserve (off-shelf) stock, the capital sitting in it, and a **warehouse floor map**. The map is built by `warehouseFloor(whId)`: it combines occupied bins (`BINS`) with empty slots (`EMPTY_BINS`), groups them by aisle letter, and tags each bin with a fill percentage and a conditional-format tier (empty / low / half / high / full). `siteBinCapacity` calibrates the denominator per site so every warehouse shows a realistic spread of fill states rather than everything reading full or empty.

### Stock Movements

A ledger view answering "what has moved recently?" It renders `MOVEMENTS` — inbound receipts, outbound sales/shipments and adjustments — with the status-pill styling shared across the app.

### Orders · Procure-to-Pay

The procurement hub answers "where are my POs, and what do I owe?" `poStatusSummary()` rolls purchase orders into lifecycle buckets (Draft → Submitted → On hold → Purchased → Received → Closed) with value and count per stage, giving a pipeline view of committed spend. `avgPoCycleTime()` reports mean create-to-close days. `outstandingByTerms()` groups unpaid payables by payment terms so cash timing is visible. The screen also includes a **raise-a-PO flow**: the user can assemble a PO and "submit" it, which updates local state and shows a confirmation — a working interaction that writes nothing to the shared model.

### Goods Receipt

Answers "receive stock against an order." The user picks an open PO and records received quantities per line, then posts a goods receipt note. Posting generates a new GRN number and prepends it to the recent list in local state, mirroring how a receiving clerk would confirm a delivery.

### Transfer Orders

Answers "move stock between sites." It shows inter-site transfers with source, destination, SKU, quantity and status, using the shared status pills for lifecycle state (e.g. In Transit, Picked, Received).

### Suppliers & Products

The master-data screen answers "what do we sell and who supplies it?" It presents the product catalogue with cost, price and computed margin, and the supplier list, letting a user drill from a supplier to the SKUs they provide.

### Supplier Performance

The most analytical screen answers "which suppliers earn their volume, and where is spend concentrated?" It is driven by three selectors:

- `supplierMetrics()` scores every supplier with the weighted six-criteria model, assigns a cohort (Strategic / Preferred / Approved / Watchlist), and derives fields like lead-time variance and the gap between current and preferred payment terms.
- `spendContribution()` produces a **Pareto** ranking of suppliers by spend with cumulative percentage and the top-10 share — the classic "small number of suppliers, large share of spend" lens.
- `cohortSummary()` rolls the portfolio up by tier so the mix of spend and inventory value across cohorts is visible at a glance.

Together these turn raw supplier fields into an actionable segmentation: who to grow, maintain, monitor or exit, and how much working capital a terms change would free.

## Stage 3 — Shared building blocks

`src/components/Charts.jsx` holds the visualisation layer: an `Area` trend chart, `Bar`, `Pie` and `Scatter` components, plus a `ChartCard` wrapper that gives every chart a consistent title, subtitle and frame. `ViewHead` provides the standard header each view shows. Centralising these means the nine views compose a small, consistent vocabulary rather than each reinventing a chart or a card, which keeps the look uniform and the view files short.

## Stage 4 — The in-app action pattern

Three screens let the user *do* something — raise a PO, post a GRN, create a transfer. All of them follow the same rule: **actions write to the view's local React state, never to the shared domain model.** They produce a realistic confirmation (a new PO or GRN number, a success toast) that lasts for the session and clears on refresh.

This is what lets the app be public and completely safe. There is no persistence layer to secure, no write path to the data, and nothing a visitor can change for anyone else. It is a faithful demonstration of the workflow without any of the risk of a live system.
