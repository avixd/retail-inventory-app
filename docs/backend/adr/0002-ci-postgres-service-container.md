# 0002 · Integration tests on a Postgres service container

Date: 02/11/2026 · Status: accepted (supersedes LLD §8's Neon-branch approach)

## Context

The LLD planned to create a short-lived Neon branch per CI run. That needs a Neon API key in GitHub, ties CI to the production project's branch quota (10 on the free plan), and means CI can't run until the Neon account exists.

## Decision

CI starts a `postgres:17` service container for the end-to-end job: create roles with the production bootstrap script, run migrations, seed 14 months, run one nightly job as the least-privilege `etl_runner`, run the API tests as `app_reader`, export a snapshot.

## Consequences

- CI works from the first push, with no cloud account and no extra secrets.
- Every run exercises the full path, including role privileges, on a clean database.
- Trade-off: Neon-specific behaviour (pooler, `neon_superuser`) isn't covered in CI. The migration's role guard and the bootstrap workflow cover the part that matters for security.
