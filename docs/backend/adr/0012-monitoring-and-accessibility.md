# 0012: Free production monitoring; accessibility enforced in CI

**Date:** 04/11/2026 · **Status:** Accepted

## Context

Nothing told anyone if the site broke, the published data was corrupted, or a portfolio link died. Accessibility had never been audited.

## Decision

- **Monitoring:** a read-only check (`scripts/monitor.mjs`) runs every 6 hours in the **public** repo, where Actions minutes are free. It checks the site and its CSP, the month index, **every published file against its manifest SHA-256**, the blocking data-quality checks, the portfolio links and demo video, and (once deployed) API health and as-of consistency. A failure opens or updates a "Production monitor" issue, which emails the owner; recovery closes it.
- **Accessibility:** an axe-core audit (WCAG 2.0/2.1 A + AA, the level AODA references) runs on every view of the production build in CI and fails on any violation. Initial audit: 5 rule types across 889 elements, fixed at the source (colour tokens, accessible names, focusable scroll regions, correct ARIA), now 0.

## Consequences

- GitHub pauses scheduled workflows in public repositories after 60 days without activity (it emails first); the runbook covers re-enabling.
- Automated audits catch about half of WCAG issues; a manual screen-reader pass is still recommended before real users depend on it.
