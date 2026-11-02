# Running the whole stack on one machine

Postgres, the pipeline, the API and the dashboard, locally, with no cloud accounts. Verified on Windows 11 (02/11/2026); the same commands work on macOS/Linux with `/` paths.

**Prerequisites:** [uv](https://docs.astral.sh/uv/) (installs Python 3.12 for you), Node 20+. Postgres comes from PyPI below, so no installer or Docker is needed.

## 1. Postgres

```bash
uv venv .local/pgenv --python 3.12
uv pip install --python .local/pgenv pgserver   # bundles Postgres 16 binaries
```

The binaries are in `.local/pgenv/Lib/site-packages/pgserver/pginstall/bin` (Windows) or `.../lib/python3.12/site-packages/...` (macOS/Linux). Initialise and start a throwaway cluster on port 5433, outside synced folders such as OneDrive:

```bash
initdb -D <data dir> -U postgres -A scram-sha-256 --pwprompt -E UTF8 --locale=C
pg_ctl -D <data dir> -o "-p 5433" -l <data dir>/../pg.log start
```

On Windows the bundled build lacks timezone data: copy `backend/.venv/Lib/site-packages/tzdata/zoneinfo` to `pginstall/share/postgresql/timezone` and restart, or queries using `America/Toronto` fail.

## 2. Roles, schema, 24 months of history

```bash
export DATABASE_URL_MIGRATOR=postgresql://postgres:<pw>@localhost:5433/postgres
export APP_READER_PASSWORD=<16+ chars> ETL_RUNNER_PASSWORD=<16+ chars>
cd backend  && uv sync && uv run python -m app.bootstrap_roles && uv run alembic upgrade head
cd ../pipeline && uv sync && uv run python -m retail_pipeline.seed     # ~3 minutes
```

## 3. API

`backend/.env` (git-ignored):

```
APP_ENV=local
DATABASE_URL=postgresql://app_reader:<reader pw>@localhost:5433/postgres
CORS_ORIGINS=http://localhost:5174
RESPONSE_CACHE_SECONDS=5
```

```bash
cd backend && uv run uvicorn app.asgi:app --port 8000     # docs at http://localhost:8000/docs
```

## 4. Dashboard (public repo `retail-inventory-app`)

`.env.local`: `VITE_API_BASE_URL=http://localhost:8000`, then `npm run dev -- --port 5174` and open `http://localhost:5174/retail-inventory-app/`. The header badge reads **Live · as of …**.

## 5. Watch it move

```bash
export DATABASE_URL_ETL=postgresql://etl_runner:<etl pw>@localhost:5433/postgres
cd pipeline && uv run python -m retail_pipeline.nightly --until <next day>
```

Reload the dashboard after about a minute (the API caches the as-of date for 60 s; browsers cache responses for 5 minutes): the as-of date, stock, movements and replenishment figures advance by a day.

## 6. Tests

| Command | What it proves |
|---|---|
| `cd backend && uv run pytest` (with `DATABASE_URL` set) | 40 API tests: unit + integration against the seeded database |
| `cd pipeline && uv run pytest -m "not integration"` | 29 generator and analytics tests |
| `npm run test:api` in the front-end repo | 21 contract tests: live data has every field the views use, every selector computes finite numbers, the API is read-only, security headers and CORS are correct |
