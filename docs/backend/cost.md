# Cost: why running this costs $0, and what keeps it that way

**Reviewed:** 02/11/2026 against the providers' published free-plan limits (sources below).

## 1. The guarantee, in one line

No account in the system has a payment method, so **no provider can bill**. When a free allowance runs out, that service pauses until the month resets; the public site keeps working on its published snapshot.

## 2. Service by service

| Service | Free allowance | This project's use | Headroom | At the limit |
|---|---|---|---|---|
| **GitHub Pages** (public repo) | Free for public repos; 100 GB/month soft bandwidth | Static site, ~0.5 MB per first visit | Very large | n/a for this traffic |
| **GitHub Actions**, public repo | Unlimited minutes on standard runners | Pages deploy + front-end CI | Unlimited | n/a |
| **GitHub Actions**, private repo | 2,000 Linux minutes/month | No scheduled jobs (data frozen at the cut-off). CI ≈ 12 min per push; API release ≈ 3 min | ~160 backend pushes/month | Blocked (not billed) without a payment method |
| **Render** web service | 750 instance-hours, 100 GB outbound/month | One service; sleeps after 15 idle minutes, so typically far below 744 h. Dataset is ~15 KB gzipped | 100 GB ≈ 6.5 million dataset responses | Service suspended until month end |
| **Neon** Postgres | 0.5 GB storage, 100 CU-hours compute, 5 GB network transfer per month | 109 MB after 24 months of history. Storage is fixed: the data is frozen at the cut-off. Compute only wakes on cache misses, then scales to zero after 5 minutes | Storage: years. Compute: bounded (§3) | Compute suspended until month end |

## 3. Guardrails that bound usage, even under abuse

| Risk | Guardrail | Effect |
|---|---|---|
| Traffic keeps the database awake | 15-minute in-memory response cache; `/health` never touches the database | At most one query per URL per 15 minutes, however many visitors |
| Bot varies query strings to dodge the cache | Global rate cap 120/min (all clients) plus 60/min per IP; cache is a bounded LRU | Caps database load and memory regardless of IP spoofing |
| Large payloads burn bandwidth | gzip on every response (120 KB → 15 KB); ETag → `304 Not Modified` | ~8× less egress on Render and Neon |
| Runaway queries | `statement_timeout` 15 s, 10 connections max for the public role | A slow request can't hold compute |
| Hung or looping CI jobs | `timeout-minutes` on every job; superseded runs cancelled; docs-only changes skip CI | A stuck job can burn at most its timeout |
| Data growth | Data frozen at the cut-off; nothing is added unless the owner advances it | Storage stays at ~110 MB |

**Worst case**, a sustained distributed attack: a monthly allowance runs out, live data pauses, the snapshot keeps the site up. Cost remains $0.

## 4. Owner actions that preserve $0

1. Never add a payment method to Neon or Render. If either asks for one, stop and re-plan ([option-analysis.md](option-analysis.md) lists alternatives).
2. GitHub → Settings → Billing → Budgets: keep the Actions budget at **$0** with "stop usage" on. (If a card is on file for another GitHub product, this is what prevents overage.)
3. Keep the public repo public: free Pages depends on it.
4. Monthly glance at the Neon and Render usage pages (2 minutes; runbook).

## 5. Pros and cons of the free-tier approach

| Pros | Cons |
|---|---|
| Genuinely $0, with no possibility of a surprise bill | Cold start: the API sleeps after 15 idle minutes and takes 30-60 s to wake (the snapshot covers this) |
| Real managed services (Postgres, container hosting, CI), not mocks | Quotas are monthly hard stops: an attack causes downtime rather than cost |
| Same architecture scales to paid tiers with configuration changes only | No uptime SLA, no point-in-time restore beyond the free window (mitigated: data is reproducible from a seed) |
| | Private-repo CI minutes are finite (2,000/month): fine for a solo project, tight for heavy iteration |

## Sources

- [Neon plans and free-plan limits](https://neon.com/docs/introduction/plans) · [Neon free plan FAQ](https://neon.com/faqs/free-plan-limits-and-quotas)
- [Render: deploy for free (instance hours, bandwidth, suspension)](https://render.com/docs/free)
- [GitHub Actions billing](https://docs.github.com/en/billing/concepts/product-billing/github-actions) · [Included minutes with a $0 budget (community)](https://github.com/orgs/community/discussions/210874)
