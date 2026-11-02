# Setup guide: Neon, Render and GitHub (milestone M0.2)

About 20 minutes, all in the browser. No local Python, no terminal, no payment card. If either Neon or Render asks for a card at any point, **stop**: the plan assumes free tiers with no billing details, and we re-plan rather than add one.

You'll end up with six secrets in the private `retail-inventory-backend` repo and one variable in the public `retail-inventory-app` repo. Nothing secret goes in either repo, and the public repo holds no secret at all ([ADR 0006](adr/0006-private-backend-repo.md)).

## 1. Neon (database)

1. Sign up at [neon.com](https://neon.com) (GitHub login is fine). Choose the **Free** plan.
2. Create a project: name `retail-inventory`, region **AWS US East 2 (Ohio)**, default Postgres version.
3. Open **Connect** on the project dashboard. You need the connection string for the default owner role (usually `neondb_owner`) on the `main` branch.
   - Turn **Connection pooling off** and copy that string: this is the **direct** connection, used for migrations and data loads.
   - Note the **pooled** host as well (same host with `-pooler` added after the endpoint ID). The API uses it.
4. **Don't create any roles in the Neon console.** Console-created roles automatically join `neon_superuser`, which would give the "read-only" API account far more power than intended. The bootstrap workflow creates the two app roles with SQL instead, and the migration refuses to run if it detects console-style roles.

## 2. Generate two passwords

In your password manager, generate two passwords: **32 characters, letters and numbers only** (no symbols, so they drop into connection strings without escaping). Label them `app_reader` and `etl_runner`.

## 3. GitHub secrets and variable

**Private** repo `retail-inventory-backend` → **Settings → Secrets and variables → Actions**.

**Secrets** (New repository secret):

| Name | Value |
|---|---|
| `DATABASE_URL_MIGRATOR` | Neon owner connection string, **direct** host (step 1.3) |
| `APP_READER_PASSWORD` | the `app_reader` password |
| `ETL_RUNNER_PASSWORD` | the `etl_runner` password |
| `DATABASE_URL_ETL` | `postgresql://etl_runner:<etl password>@<direct host>/neondb?sslmode=require` |
| `DATABASE_URL_READER` | `postgresql://app_reader:<reader password>@<pooled host>/neondb?sslmode=require` |
| `PAGES_DISPATCH_TOKEN` | Fine-grained personal access token: GitHub → **Settings → Developer settings → Fine-grained tokens → Generate**. Repository access: *Only* `retail-inventory-app`. Permissions: **Actions: Read and write** (nothing else). Lets the nightly job republish the public site. |

Use the database name Neon shows if it isn't `neondb`.

## 4. Load the database (one click)

Repo → **Actions → Bootstrap database → Run workflow**. Leave action as `bootstrap`, type `SEED`, run. It creates the two roles, applies the migrations, generates 24 months of synthetic history, runs the forecasting and replenishment engines and checks data quality. Expect a few minutes. A green run means the database is ready.

## 5. Render (API)

1. Sign up at [render.com](https://render.com) with GitHub. Free plan.
2. **New → Blueprint**, pick the private `retail-inventory-backend` repository (grant Render access to it when asked). Render reads `render.yaml` and proposes one free web service, `retail-inventory-api`, in Ohio.
3. When prompted for `DATABASE_URL`, paste the **`DATABASE_URL_READER`** value (the pooled `app_reader` string). This is the only credential the API ever gets.
4. Apply. When the first deploy finishes, open the service:
   - Copy its URL (e.g. `https://retail-inventory-api.onrender.com`) and check `<url>/health` returns `{"status":"ok"}`.
   - **Settings → Build & Deploy**: confirm **Auto-Deploy is Off** (deploys are triggered by GitHub after migrations).
   - **Settings → Deploy Hook**: copy the hook URL.

Back in GitHub (deploy hook in the **private** repo, API URL in the **public** one):

| Type | Name | Value |
|---|---|---|
| Secret | `RENDER_DEPLOY_HOOK_URL` | the deploy hook URL (anyone holding it can trigger a deploy, so it's a secret) |
| Variable (Variables tab), **both** repos | `API_BASE_URL` | the Render service URL, no trailing slash |

## 6. Publish

**Public** repo `retail-inventory-app` → **Actions → Deploy to GitHub Pages → Run workflow**. The build pulls a snapshot from the API and bakes in the API URL. Open the site: the header badge shows **Snapshot · as of …** immediately, then switches to **Live** once the API has woken up (up to a minute on the free tier).

From then on nothing changes the data unless you ask: the dataset is frozen at the cut-off. To publish a newer period, move `DATA_CUTOFF` and run **Advance data (manual)**, which also republishes the site. Pushes that touch `backend/` run migrations and redeploy the API; they never change data.

## 7. Check it's locked down

- `<api url>/docs` shows only `GET` endpoints.
- `curl -X POST <api url>/api/v1/dataset` returns `405`.
- In Neon's SQL editor (as the owner), confirm the app roles have no inherited powers:
  `SELECT rolname, rolsuper, rolcreaterole, rolcreatedb, rolbypassrls FROM pg_roles WHERE rolname IN ('app_reader','etl_runner');` → all `false`.

## Sources

- [Neon: managing roles](https://neon.com/docs/manage/roles/) (console roles join `neon_superuser`; SQL roles don't)
- [Neon: finding connection details and pooled hosts](https://neon.com/faqs/find-connection-details-neon-console)
- [Render regions](https://render.com/docs/regions)
