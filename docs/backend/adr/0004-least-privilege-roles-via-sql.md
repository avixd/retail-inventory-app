# 0004 · Create database roles with SQL, never the Neon console

Date: 02/11/2026 · Status: accepted (corrects LLD §3.4)

## Context

The LLD said to create `app_reader` and `etl_runner` in the Neon console. Neon's documentation states that roles created in the console, CLI or API are automatically granted membership of `neon_superuser` (CREATEDB, CREATEROLE, BYPASSRLS, REPLICATION). The "read-only" API account would have inherited far more than read access, and nothing in the original design would have noticed.

## Decision

- `python -m app.bootstrap_roles` creates both roles with plain SQL (`CREATE ROLE ... LOGIN PASSWORD`), taking passwords from GitHub secrets. SQL-created roles get only default privileges.
- Migration 0003 grants exactly what each role needs and **refuses to run** if either role is a member of `neon_superuser`, `pg_read_all_data` or `pg_write_all_data`, or has superuser, createrole, createdb, bypassrls or replication.
- The same script creates the roles in CI, so the path is tested on every push.

## Consequences

- Least privilege is enforced by the database and verified at migration time, not assumed.
- Setup stays click-only for the owner (the bootstrap workflow runs the script).
- Password rotation reuses the same workflow (`rotate-passwords`).
