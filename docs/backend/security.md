# Security: threat model, controls and breach response

**Reviewed:** 02/11/2026 · **Scope:** public dashboard, read-only API, database, pipeline, CI/CD, both repositories.

## 1. What there is to protect

| Asset | Sensitivity | Why it matters |
|---|---|---|
| Database credentials (owner, `etl_runner`, `app_reader`) | High | Owner can change anything; the others are scoped (§3) |
| Deploy and dispatch tokens (`RENDER_DEPLOY_HOOK_URL`, `PAGES_DISPATCH_TOKEN`) | Medium | Could trigger deploys; cannot read or change code or data |
| Backend source code (private repo) | Medium | Intellectual property; not a security dependency (no secrets in code) |
| Data | **Low** | 100% synthetic, generated from a seed. No personal, customer or employer data exists anywhere in the system |
| Availability and free-tier allowance | Medium | Abuse could exhaust a free quota and suspend live data (never a bill: §4 of [cost.md](cost.md)) |
| Owner's GitHub, Neon and Render accounts | High | Control everything above |

Because the data is synthetic and reproducible, the worst realistic outcome of a breach is **defacement or downtime, not a data leak**. The design still treats the system as if the data mattered.

## 2. Threats (STRIDE) and how each is handled

| Threat | Example | Controls | Residual risk |
|---|---|---|---|
| **Spoofing** | Someone calls the API pretending to be the site | Nothing to spoof: the public API needs no identity and grants none. Admin routes are not mounted in production, and settings refuse to start if anyone enables them (`APP_ENV=prod` guard) | None material |
| **Tampering** | Altering stock data through the API | API is `GET`-only (CORS, routes, tests). Its DB role `app_reader` has `SELECT` on `analytics` views only, no access to `core`, and `default_transaction_read_only=on`. Verified: `DELETE`, `UPDATE`, `CREATE` as `app_reader` all fail | Requires stealing the owner or ETL credential (§5) |
| **Tampering** | SQL injection | All SQL text is constants; request values are bound parameters; inputs validated by type, regex and range (`422` on violation) | Low |
| **Tampering** | Malicious dependency or Action | Lockfiles (`uv.lock`, `package-lock.json`) with `--locked` installs; `pip-audit` and `npm audit` in CI; Dependabot; uv image pinned by version; Actions `permissions: contents: read` by default | Actions pinned by tag, not SHA (accepted; Dependabot tracks them) |
| **Repudiation** | Untraceable change | Every pipeline run is logged in `ops.job_run` with data-quality results; every API request logged as JSON with a request ID; all changes go through Git | Low |
| **Information disclosure** | Secret leaked in repo, bundle or logs | No secret in any file; `.env` git-ignored; gitleaks scan on every push (full history); the public repo holds **no secrets at all**; API error responses are problem+json with no stack traces (tested); passwords never printed | Owner error (e.g. pasting a secret into an issue). Mitigated by push protection + §5 |
| **Information disclosure** | Backend code exposed | Private repo; access only for the owner. The public site reaches the backend only through the read-only API ([ADR 0006](adr/0006-private-backend-repo.md)) | Low |
| **Denial of service / cost** | Bot floods the API to exhaust free quotas | Per-IP limit (60/min) **and** a global ceiling (120/min) that holds even if IPs are spoofed; 15-minute in-memory response cache (bounded LRU) so repeats never reach the database; gzip; statement timeout 15 s, idle-transaction timeout 30 s and connection limit 10 on `app_reader`; page size capped at 200 | A sustained, distributed attack can still exhaust a monthly free quota → live data pauses, the published snapshot keeps the site working. **No bill is possible** (no payment method on any account) |
| **Elevation of privilege** | `app_reader` gains broader rights | Roles created with SQL, never the Neon console (console roles join `neon_superuser`); migration 0003 aborts if either role inherits it; no `SUPERUSER/CREATEROLE/CREATEDB/BYPASSRLS` (verified) | None material |
| **Elevation of privilege** | Container compromise | Non-root user, slim image, no shell tools added, no write credentials in the environment | Low |
| **Browser-side** | XSS or injected scripts on the public site | React escapes all output; Content-Security-Policy restricts scripts to the site itself and network calls to the site plus the API; `referrer` disabled; no cookies, no login, no forms that send data | Low |

## 3. Least privilege, by credential

| Credential | Lives in | Can | Cannot |
|---|---|---|---|
| Neon owner | Private repo secret `DATABASE_URL_MIGRATOR` | Migrate schema, create roles | Used only by manual bootstrap and the API release job |
| `etl_runner` | Private repo secret | Insert/update operational and analytics tables | DDL, role changes, read secrets; 3 connections, 10-min statement cap |
| `app_reader` | Render environment (only credential the API has) | `SELECT` on `analytics` views | Any write, any `core` table, more than 10 connections, queries over 15 s |
| `PAGES_DISPATCH_TOKEN` | Private repo secret | Start the public repo's workflows | Read or push code, change settings, touch any other repo |
| `RENDER_DEPLOY_HOOK_URL` | Private repo secret | Redeploy the current API commit | Change code, env vars or data |

## 4. Detection

- **Pipeline:** a failed data load or data-quality check → GitHub emails the owner on workflow failure. With the data frozen at the cut-off, **any** change to `ops.job_run` after the last deliberate run is itself a red flag.
- **Secrets:** gitleaks fails CI on any committed secret; enable **secret scanning + push protection** on the public repo (free for public repos) so a secret is blocked before it lands.
- **Dependencies:** Dependabot alerts and weekly update PRs; `pip-audit` / `npm audit` fail CI on known vulnerabilities.
- **Usage:** Neon and Render dashboards show compute, storage and bandwidth; check monthly (runbook). A sudden spike is the signal for §5.

## 5. Breach response playbook

Run the section that matches what happened. Each step is in the browser; none needs local tools.

**A. A database password may be exposed** (in a log, screenshot, commit, or unknown leak)
1. Neon → Roles → reset the **owner** password if it's the owner; update `DATABASE_URL_MIGRATOR`.
2. For `app_reader` / `etl_runner`: generate new passwords, update `APP_READER_PASSWORD`, `ETL_RUNNER_PASSWORD`, `DATABASE_URL_READER`, `DATABASE_URL_ETL` secrets, then **Actions → Bootstrap database → rotate-passwords** (`SEED`).
3. Update `DATABASE_URL` in Render and redeploy. Old passwords stop working immediately.
4. If it was committed: rotating is the fix; rewriting Git history is optional after rotation.

**B. A token may be exposed** — GitHub → Developer settings → revoke `PAGES_DISPATCH_TOKEN`, create a new one, update the secret. Render → Settings → regenerate the deploy hook, update `RENDER_DEPLOY_HOOK_URL`.

**C. Data looks wrong or tampered with**
1. Pause: disable the *Advance data* workflow and revoke `DATABASE_URL_ETL` (rotate, §A).
2. Check `ops.job_run` and `ops.dq_result` for the run that changed it.
3. Recover: Neon point-in-time restore to before the change (free plan keeps a short history window), **or** rebuild from scratch: the data is deterministic, so `seed --reset` reproduces it exactly. Then rotate credentials (A).

**D. The API is being flooded** — nothing to do for cost (no bill is possible). For availability: Render → Suspend the service; the site falls back to the published snapshot automatically. Resume later. If needed, lower `GLOBAL_RATE_LIMIT` in Render.

**E. GitHub, Neon or Render account compromised** — recover the account through the provider, then run A and B for every credential, review recent commits, Actions runs and deploys, and redeploy from a known-good commit.

**After any incident:** note date, cause and fix in this file's change log, and add a test or control that would have caught it.

## 6. Owner checklist (one-off, in the browser)

- [ ] 2FA on GitHub, Neon and Render (passkey or authenticator app).
- [ ] No payment method on Neon or Render; GitHub Actions budget $0 (Settings → Billing → Budgets).
- [ ] Public repo: Settings → Code security → enable **Secret scanning** and **Push protection**; enable **Dependabot alerts** on both repos.
- [ ] `PAGES_DISPATCH_TOKEN`: fine-grained, one repo, Actions read/write only, expiry ≤ 1 year (calendar reminder to rotate).
- [ ] Render: Auto-Deploy off (deploys only after migrations).

## Change log

| Date | Change |
|---|---|
| 02/11/2026 | Backend moved to a private repo; public repo holds no secrets. Added response cache, global rate cap, gzip, role-level timeouts and connection limits (migration 0004), CSP on the site, dependency audits, Dependabot, CI job timeouts, pinned uv image. |
