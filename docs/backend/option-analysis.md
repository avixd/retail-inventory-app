# Backend option analysis

Status: **decided 02/11/2026: Option B** · Author: Avinash Dudani

> **Decision.** Option B (Python FastAPI on Render + Neon Postgres) was selected. Option A scored higher, but it requires a payment card on an Azure subscription, which is a hard no for this project; section 6 already named B as the fallback for exactly that case. Scope is Phases 1 and 2, and public visitors are **strictly read-only**: the production API holds only a read-only database credential and exposes no write endpoints. Additional free-tier facts checked for B on 02/11/2026: Render's free tier officially needs no card (512 MB RAM, 0.1 CPU, suspended at the monthly limit); Neon's minimum compute is 0.25 CU, so 100 CU-hours ≈ 400 hours awake a month, with 10 branches per project. Design detail is in [high-level-design.md](high-level-design.md) and [low-level-design.md](low-level-design.md).

## 1. What the backend has to achieve

The current app is a front-end proof of concept: all data is hard-coded in `src/data/inventory.js` and every action resets on refresh. The backend should turn it into a working system without breaking the constraints that made the POC safe to publish.

| # | Requirement | Why it matters |
|---|---|---|
| R1 | **$0 running cost**, with a hard stop rather than a surprise bill | Personal portfolio, no budget |
| R2 | **Public, read-only by default.** Visitors can explore; nobody can damage data or reach credentials | Recruiters must be able to open it with no login |
| R3 | **No secrets in the browser bundle or the repo** | Same compliance bar as the current release |
| R4 | **Interview value on both axes**: real engineering (API, database, CI/CD, tests, IaC) *and* real retail analytics (replenishment maths, forecasting, supplier economics) | The point of the project |
| R5 | **Fits a Microsoft-first data stack** (Azure, SQL, Python, Power BI) | That's where the target roles are, and what you can defend in depth |
| R6 | Feasible to build and maintain solo | Has to be finished, not abandoned at 70% |

## 2. Options considered

**A. Azure serverless.** Azure Static Web Apps (Free) hosts the React app and a managed Python Azure Functions API under `/api`; Azure SQL Database free offer is the data store. Power BI connects to the same database.

**B. Container API + Postgres.** Python FastAPI on Render's free web service, Neon free Postgres, front end stays on GitHub Pages and calls the API cross-origin.

**C. Backend-as-a-service.** Supabase: Postgres with auto-generated REST endpoints, auth and row-level security.

**D. Microsoft Fabric.** SQL database in Fabric with a GraphQL API, Power BI in the same workspace.

**E. Mock backend.** Keep it static and fake the API (JSON fixtures / Mock Service Worker).

## 3. Verified facts behind the scoring

Free-tier terms change often, so these were checked against current documentation on 02/11/2026.

| Platform | Free terms that matter here |
|---|---|
| Azure Static Web Apps Free | Hosting plus **managed Azure Functions API** included; HTTP triggers only; Python up to 3.11; 45-second max request; 250 MB app size; no SLA. Managed functions **cannot use managed identity or Key Vault**, so the DB credential lives in server-side app settings. Linking your own Functions/App Service backend needs the paid Standard plan. |
| Azure SQL Database free offer | **Not time-limited.** Per database per month: 100,000 vCore-seconds, 32 GB data, 32 GB backup; up to 10 free databases per subscription. With *Auto-pause until next month*, hitting the limit pauses the DB instead of billing. Auto-pauses after a fixed 15 minutes idle; **resume takes about one minute** and the first connection fails with error 40613, so the API must retry. No SLA. |
| Neon Free | 100 CU-hours/month, 0.5 GB storage, auto-suspends after 5 minutes idle, compute suspends at the limit. |
| Render Free | Spins down after 15 minutes idle; **cold start 30–60 seconds**; 750 instance-hours/month per workspace. |
| Microsoft Fabric | Needs a Fabric capacity. Trial capacity is time-limited; ongoing use is paid. |

**Budget maths for Azure SQL** (assumption: free database idles at 0.5 minimum vCores). 100,000 ÷ 0.5 = 200,000 seconds ≈ **55 hours online per month**. Every wake keeps it online for at least the 15-minute idle delay plus time to pause, roughly 20 minutes, so that's on the order of **150 visitor sessions a month** before the DB pauses for the rest of the month. That's plenty for recruiter traffic but small enough that crawlers could burn it, which is why the design below doesn't let every page view touch the database.

## 4. Scoring

Scores out of 5 (5 = best). Weights reflect the requirements above.

| Criterion | Weight | A. Azure serverless | B. FastAPI + Neon | C. Supabase | D. Fabric | E. Mock |
|---|---|---|---|---|---|---|
| $0 with hard stop (R1) | 20% | 5 | 4 | 4 | 1 | 5 |
| Public + safe (R2, R3) | 20% | 5 | 3 | 4 | 3 | 5 |
| Engineering interview value (R4) | 20% | 4 | 5 | 2 | 3 | 1 |
| Business/analytics interview value (R4) | 15% | 5 | 4 | 3 | 5 | 2 |
| Microsoft-stack fit (R5) | 15% | 5 | 2 | 1 | 5 | 2 |
| Solo feasibility (R6) | 10% | 4 | 3 | 5 | 2 | 5 |
| **Weighted total** | | **4.75** | **3.60** | **3.05** | **3.05** | **3.30** |

Reasoning behind the scores that aren't obvious:

- **A on safety (5):** the front end and API sit on one origin, so there's no CORS to misconfigure; the DB credential never leaves Azure; public routes can be locked to `GET` with platform route rules; built-in auth (GitHub / Entra ID) protects write endpoints.
- **B on safety (3):** two hosts means CORS configuration, a separately exposed API URL, and secrets managed on a third-party platform. All solvable, but more surface for a solo builder.
- **B on engineering (5):** a containerised FastAPI service is the most portable "real API" story. A gets a 4 because managed Functions hide some of the server, but it gains serverless, IaC and platform-integration talking points instead.
- **C on engineering (2):** auto-generated endpoints mean less of the backend is yours to explain.
- **D:** strongest on paper for a data role, but it fails the $0 requirement, which is a hard constraint.
- **E:** fails the brief. It's a backend in name only and won't survive one interview question.

## 5. Recommendation: Option A, with a resilient read path

Build on **Azure Static Web Apps (Free) + Python Azure Functions + Azure SQL Database (free offer)**, with Power BI on the same database.

Three design choices turn the free-tier limits into talking points instead of weaknesses:

1. **Read-through snapshot.** A nightly GitHub Action queries the database and publishes a static JSON snapshot with the site. Page loads read the snapshot (instant, no DB wake-up); the API is called for live queries and actions. If the DB is paused or the monthly allowance is spent, the app falls back to the snapshot and shows a "live data paused" banner. That's graceful degradation, which is a production pattern in its own right.
2. **Public reads, sandboxed writes.** Anyone can `GET`. Demo actions (raise a PO, post a goods receipt) write to a sandbox schema that a scheduled job resets nightly, with server-side validation and rate limiting. Real writes need the `admin` role via built-in login.
3. **One database, two consumers.** A normalised transactional schema feeds the API; a star-schema analytics layer of views feeds both the API's KPI endpoints and a Power BI report. "The same model powers the app and the BI layer" is the line that connects this project to your day job.

### Honest drawbacks of the recommendation

- An **Azure account needs a payment card** at sign-up, even though every resource here is $0. Mitigation: free tiers only, *Auto-pause until next month*, and a budget alert at $1.
- **Cold start**: the first live query after 15 idle minutes waits about a minute. The snapshot path hides this for normal browsing.
- Managed Functions on the Free plan **can't use managed identity**, so the API uses a least-privilege SQL login stored in server-side app settings. That's secure against browser exposure but isn't the gold standard; the docs will state that production would use the Standard plan with managed identity and Key Vault.
- **No SLA** on any free tier. Fine for a portfolio, and stated plainly.
- The live URL moves from GitHub Pages to `*.azurestaticapps.net` (a custom domain is free on the SWA Free plan if you want one later).

## 6. What would change this recommendation

- If you'd rather not put a card on an Azure account, **Option B** is the fallback: same architecture ideas, Postgres instead of SQL Server, and a 30–60 second cold start to design around.
- If an employer you're targeting is Fabric-heavy and you have Fabric capacity through work or a trial, a **Phase 3 Fabric mirror** of the analytics layer is an add-on, not a replacement.

## Sources

- [Azure Static Web Apps hosting plans](https://learn.microsoft.com/azure/static-web-apps/plans)
- [API support in Azure Static Web Apps with Azure Functions](https://learn.microsoft.com/azure/static-web-apps/apis-functions)
- [Static Web Apps API constraints](https://learn.microsoft.com/azure/static-web-apps/apis-overview)
- [Supported languages and runtimes in Static Web Apps](https://learn.microsoft.com/azure/static-web-apps/languages-runtimes)
- [Deploy Azure SQL Database for free](https://learn.microsoft.com/azure/azure-sql/database/free-tier)
- [Azure SQL Database free tier FAQ](https://learn.microsoft.com/azure/azure-sql/database/free-tier-faq)
- [Serverless auto-pause and auto-resume latency](https://learn.microsoft.com/azure/azure-sql/database/serverless-tier-auto-pause-resume)
- [Neon pricing](https://neon.com/pricing)
- [Render pricing and free-tier spin-down](https://livemy.app/blog/render-pricing)
