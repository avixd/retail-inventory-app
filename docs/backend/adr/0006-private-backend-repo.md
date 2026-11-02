# 0006: Backend in a private repository, front end stays public

**Date:** 02/11/2026 · **Status:** Accepted

## Context

The backend was built inside the public `retail-inventory-app` repo, next to the front end. The owner wants the backend code (schema, pipeline, analytics engines, infrastructure config) kept private, while the dashboard stays public on GitHub Pages as a portfolio piece. GitHub Pages on a personal account is only free for public repositories, so making the whole repo private isn't an option.

## Decision

Split into two repositories:

| Repo | Visibility | Holds |
|---|---|---|
| `avixd/retail-inventory-app` | Public | React front end, `dataSource.js`, Pages deploy workflow |
| `avixd/retail-inventory-backend` | Private | `backend/`, `pipeline/`, `docs/`, CI, nightly, API release, bootstrap workflows, `render.yaml` |

The two meet only at the public, read-only API:

- The Pages build fetches its snapshot over HTTPS from the API (`/api/v1/dataset` and friends) instead of running the backend's exporter. The public repo therefore needs **no database credential at all**, only the API URL variable.
- The private nightly job, after a successful run, dispatches the public repo's `deploy.yml` using `PAGES_DISPATCH_TOKEN`, a fine-grained token limited to that one repo with *Actions: read and write*.

## Consequences

- Smaller attack surface on the public side: no secret there can reach the database.
- Actions in the private repo draw on the 2,000 free minutes a month. Nightly is ~5 minutes a day; CI is a few minutes per push. Comfortable, but watched (runbook).
- GitHub's 60-day inactivity shutdown of scheduled workflows applies to public repos only, so the nightly no longer needs a keep-alive.
- Reviewers can't read the backend code from the public repo. The public README links to the live API docs (`/docs`) and describes the architecture; code access is on request.
- One more secret to rotate: the dispatch token expires (fine-grained tokens have a maximum lifetime).
