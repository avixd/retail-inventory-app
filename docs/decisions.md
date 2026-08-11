# Decisions, assumptions and limitations

This document is the honest account of the project: what was chosen and why, what was assumed, and — most importantly — where the approach stops. A demo that pretends to be a production system is worse than one that is clear about its boundaries.

## Tools used and why

| Tool | Role | Why this one |
|---|---|---|
| **React 19** | UI framework | The app is nine views over one data source; a component model with shared state fits that exactly. React is also the most transferable front-end skill to demonstrate. |
| **Vite 8** | Build tool and dev server | Near-instant hot reload in development and small, fast production bundles with almost no configuration. It is the current default for React apps and replaces heavier toolchains. |
| **Recharts 3** | Charting | Declarative, composable charts that are themselves React components, so charts compose the same way as the rest of the UI. Good enough for dashboards without pulling in a heavyweight BI library. |
| **lucide-react** | Icons | A single, consistent, tree-shakeable icon set; avoids mismatched icon styles. |
| **Inter (self-hosted)** | Typography | Bundled via `@fontsource-variable/inter` rather than a Google Fonts link, so there is no third-party network call and the app renders identically offline. |
| **oxlint** | Linting | A fast Rust-based linter to keep the code consistent. |
| **GitHub Pages + GitHub Actions** | Hosting and CI/CD | Free static hosting with an automated build-and-deploy pipeline. No servers to run, nothing to pay for, and the deploy is reproducible from the repository. |

The through-line: a modern, mainstream, Microsoft-and-web-friendly stack with no paid services and no bespoke infrastructure, chosen so the project is easy to run, easy to host and easy to review.

## Assumptions

- **The data is synthetic but realistic.** Records were authored to be internally consistent (POs reference real SKUs, bins reference real warehouses) so derived figures hold together. They model a plausible mid-size retailer, not any real one.
- **Single user, single session.** The app assumes one person looking at a dashboard, not concurrent users sharing state.
- **A snapshot in time.** Figures represent one moment (the "current" period), not a live feed. Dates and the six-month trend are fixed sample series.
- **Canadian retail context.** Currency is CAD and locations are Canadian; the scoring weights and reorder logic reflect general retail practice rather than one company's policy.
- **Read-only intent for the public.** In-app actions are demonstrations, so it is assumed no one needs their changes to persist.

## Pros of this approach

- **Everything is traceable.** One domain model and pure selector functions mean every number on screen has a single, findable source. That makes the app easy to verify and easy to trust.
- **Thin, consistent views.** Business logic sits in the model, not the UI, so views are short and share one vocabulary of charts and cards.
- **Zero cost, zero infrastructure.** Static hosting means no server, no database, no bill, and no operational surface to maintain or secure.
- **Safe to make public.** With no backend, no persistence and no secrets in the bundle, there is nothing for a visitor to break or extract.
- **Fast to run and review.** `npm install && npm run dev` is the whole setup; a reviewer can open the live link with no account or credentials.

## Cons and limitations

This is a front-end demonstration of a retail operations workflow. It is deliberately not a production system, and the gaps are worth stating plainly:

- **No persistence.** Data lives in memory and resets on refresh. Raising a PO or posting a GRN changes nothing durably. A real system needs a database and a write path.
- **No backend, API or authentication.** There is no server, no multi-user support, no roles or permissions, and no audit trail. Everything is client-side.
- **Static, snapshot data.** Nothing is live. A production version would ingest from an ERP / warehouse-management system, on a schedule or a stream, rather than shipping data inside the bundle.
- **Logic is illustrative, not calibrated.** The supplier scoring weights, reorder points and bin-capacity heuristics are sensible defaults chosen for a clear demo, not values tuned against a real business's history.
- **No automated tests yet.** Correctness currently rests on the fact that logic is centralised and readable. Because the selectors are pure functions, they are straightforward to unit test — that is the natural next step, not a rewrite.
- **Not a full accessibility or internationalisation pass.** Basic semantics and ARIA labels are present; a production build would need a proper audit and multi-currency / multi-locale support.
- **Single bundle, no code-splitting.** Fine at this size; a larger app would lazy-load views.

## What a production version would change

In priority order: add a backend and database with a real write path; connect to the source systems (ERP, WMS) instead of static data; introduce authentication, roles and an audit trail; add a unit-test suite over the selectors and component tests over the views; calibrate the scoring and reorder models against real history; and run full accessibility and internationalisation audits.

None of these require throwing the current work away. The domain-model-first structure is exactly what you would keep — the selectors become the contract a real data layer fills, and the views stay as they are.
