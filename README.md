# Retail Inventory Management Dashboard

An interactive, single-screen **"control tower"** for multi-warehouse, multi-store retail inventory. It brings stock positions, replenishment, purchasing, goods receipt, inter-site transfers and supplier performance into one place — the kind of decisions usually scattered across ERP screens and spreadsheets.

**Live demo:** https://avixd.github.io/retail-inventory-app/

> **Demo project.** All data is synthetic and generated for demonstration. It does not represent any real company, supplier or system. Nothing is sent, saved or transmitted — every action (raising a PO, posting a goods receipt, etc.) is in-memory only. Currency is Canadian dollars (CAD).

## What it does

Nine linked views over a shared in-memory data model:

| View | Purpose |
|---|---|
| Inventory Overview | KPIs, on-hand trend, value by category and location |
| Reorder Alerts | SKUs at or below reorder point, with suggested PO value |
| Off-Shelf | Back-of-house / warehouse reserve stock and capital tied up |
| Stock Movements | Recent inbound/outbound/adjustment activity |
| Purchase Orders | PO pipeline by stage, outstanding payables, raise-a-PO flow |
| Goods Receipt | Post GRNs against open POs |
| Transfer Orders | Inter-site stock transfers |
| Suppliers & Products | Master data for vendors and SKUs |
| Supplier Performance | Scorecards, spend Pareto, working-capital and terms analysis |

## Tech stack

- **React 19** + **Vite** — single-page app, component-driven architecture
- **Recharts** — interactive, drill-down visualisations
- **lucide-react** — icons
- Deployed as a **static site** on GitHub Pages (no backend)

## Run locally

```bash
npm install
npm run dev      # http://localhost:5173
```

Build a production bundle:

```bash
npm run build    # outputs static files to dist/
npm run preview  # serve the built bundle locally
```

## Licence

All rights reserved. This repository is published for **viewing and evaluation only** — see [LICENSE](LICENSE). Please do not copy, modify, redistribute or reuse the code or assets without permission.
