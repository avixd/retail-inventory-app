# Runbook

What can go wrong, what visitors see, and what to do. Visitors never see an error page: when anything behind the site is unavailable, the dashboard keeps showing the last published snapshot with a grey **Snapshot** badge.

## Day-to-day

| Workflow | When | What it does |
|---|---|---|
| CI | every push / PR | lint, unit tests, end-to-end on a throwaway Postgres, secret scan |
| Advance data (manual) | on demand only; data is frozen at `DATA_CUTOFF` | simulate up to the cut-off → refresh facts → forecasts and replenishment → data-quality checks → republish site |
| Release API | push to `master` touching `backend/` | migrate → trigger Render deploy → wait for `/health` |
| Deploy to GitHub Pages (public repo) | push to `master`, dispatched after a data advance | fetch snapshot from API → build → publish |
| Bootstrap database | manual | first-time load, or password rotation |

## Incidents

| Symptom | Likely cause | Action |
|---|---|---|
| Badge stays on **Snapshot** for more than 2 minutes | Render free instance waking slowly, or the monthly free hours are used up | Check the Render dashboard. If hours are exhausted the service resumes next month; the site keeps working on the snapshot |
| API returns 503 "Live data is temporarily unavailable" | Neon compute suspended and slow to resume, or monthly compute quota reached | Neon dashboard → usage. Quota resets monthly |
| Data advance failed | Code error, or a data-quality check failed (the whole day was rolled back) | Open the failed run's log; then query `SELECT * FROM ops.dq_result ORDER BY checked_at DESC LIMIT 20;` and `SELECT * FROM ops.job_run ORDER BY started_at DESC LIMIT 5;`. Fix, then **Actions → Nightly pipeline → Run workflow**. It catches up missed days (up to 7) automatically |
| Data advanced but the site didn't refresh | `PAGES_DISPATCH_TOKEN` missing or expired (fine-grained tokens expire) | Regenerate it (setup guide §3), update the secret, re-run the nightly's publish job |
| Release API failed at "Wait until healthy" | Bad deploy | Render dashboard → service → roll back to the previous deploy. Migrations are additive, so the old version still works |
| Secret scan failed in CI | Something credential-shaped was committed | Treat it as real until proven otherwise: rotate the credential first (below), then remove it from history |

## Rotate credentials

1. Generate new passwords in your password manager.
2. Update the GitHub secrets `APP_READER_PASSWORD` / `ETL_RUNNER_PASSWORD`, and rebuild `DATABASE_URL_READER` / `DATABASE_URL_ETL` with them.
3. **Actions → Bootstrap database → Run workflow**, action `rotate-passwords`, type `SEED`. Only the role passwords change.
4. Render → service → Environment: update `DATABASE_URL` with the new reader password (Render redeploys).
5. Owner password: reset it in Neon (Roles → owner → Reset password) and update `DATABASE_URL_MIGRATOR`.
6. Deploy hook: Render → Settings → Deploy Hook → regenerate, then update `RENDER_DEPLOY_HOOK_URL`.

## Reset the data (dev branches only)

Never on production. On a Neon dev branch, run the seed with `--reset` using that branch's owner connection string: `python -m retail_pipeline.seed --reset`.

## Useful queries (owner role, Neon SQL editor)

```sql
-- Free-tier headroom: database size
SELECT pg_size_pretty(pg_database_size(current_database()));

-- Latest data and pipeline state
SELECT * FROM analytics.v_meta;
SELECT simulated_through, updated_at FROM ops.sim_config;

-- Forecast accuracy of the latest run, by chosen model
SELECT a.model, count(*) AS series, round(avg(a.wape), 3) AS avg_wape
FROM analytics.forecast_accuracy a
JOIN analytics.v_latest_run r ON r.run_id = a.run_id AND r.model = 'forecast'
WHERE a.chosen
GROUP BY a.model;
```
