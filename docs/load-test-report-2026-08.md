# WGY Creator Platform — Staging & Load Test Report (Aug 2026)

Prepared for engineering handoff. All work validated on a dedicated staging
environment before anything touched production.

## Environment

- **Staging**: separate Vercel project (`wgy-creator-staging`, deploys the
  `staging` branch) + separate Supabase project (`ffbaencyqdcmawgueztf`,
  eu-west-1). Fresh `FIELD_ENCRYPTION_KEY` / `NEXTAUTH_SECRET` / `CRON_SECRET`
  (production keys never reused). Upstash shared with prod but namespaced via
  `UPSTASH_RATELIMIT_PREFIX=wgy-rl-staging`.
- **Seed data**: `scripts/seed-staging.ts` (idempotent, TRUNCATE+rebuild;
  hard-guarded to refuse any DB URL not containing the staging project ref).
  1,000 members (80% active / 8% payment_failed / 7% cancelled / 5% paused),
  3 admins, 4 chat rooms × 300 messages, 30 campaigns, 15 content items,
  60 DM threads. Test creds: `owner@staging.test` / `StagingAdmin1!`,
  `memberNNNN@staging.test` / `StagingMember1!`.
- **Load tool**: `scripts/load-test-staging.mjs` — logs in seeded sessions via
  the NextAuth credentials flow, fires a weighted mix of real authenticated GET
  endpoints, reports per-endpoint p50/p95/p99 + error rates. Refuses non-staging
  hosts without `--force`.

## Tests run & findings (chronological)

1. **Baseline, 15 concurrent, 30s** — 2.6–2.8 req/s, 0% errors. DB-heavy
   endpoints 8–20s p50 (chat room messages 10.5s, DMs 7.8s); cached
   `/api/campaigns` stayed ~125ms. Throughput flat from conc 5→15 (queueing).
2. **Concurrency-1 control** — everything sub-second (room messages 894ms).
   Conclusion: per-request path healthy; pure concurrency-scaling problem.
3. **Isolated DB probes** (direct from local, via transaction pooler :6543):
   - Raw ceiling: **261 simple / 73 heavy queries/sec** → Supabase not the
     bottleneck (~20× headroom vs app throughput).
   - Pool depth: 15 concurrent room-message queries, `max:1` = 2,972ms vs
     `max:8` = 475ms (**6.3×**) → in-process serialization confirmed.
   - Session pooler (:5432) errored `EMAXCONNSESSION` at pool_size 15 →
     **must stay on :6543 (transaction pooler) for runtime**; :5432 is
     migrations/scripts only.
4. **Root causes identified**:
   - `lib/prisma.ts` had `max: 1` — whole app serialized through one connection.
   - **Vercel functions ran in `iad1` (US) against an eu-west-1 database** —
     ~180ms RTT per query, ~5 queries per chat request.
   - `GET /api/campaigns/[id]` (opportunity detail — the push-notification
     burst target) was uncached: N viewers = N identical DB reads.
5. **After region fix (London) + pool (DB_POOL_MAX=10) + detail caching**:
   15 conc → **13.9 req/s (5.3×)**, chat p50 1.6s, DM inbox 716ms, 0% errors.
6. **After Vercel Pro upgrade**: 20 conc, 30s → **188.8 req/s (13.6× further)**,
   5,702 requests, medians 40–130ms, p99 ≲ 0.5s, **0 real errors**. (One
   endpoint showed 429s: single test admin hitting `/api/admin/analytics` 263×
   in 30s tripped its rate limit — limiter working as designed, not a defect.)
   - Note: an earlier 30-conc run showed ~53% errors, but that was a test
     artifact — 6 accounts/1 IP tripping per-user+per-IP limits (incl. the
     20/15min login cap). Real traffic spreads across users/IPs.

## Changes shipped to production (merge `642cb6f`)

- `lib/prisma.ts`: pool `max` 1 → `DB_POOL_MAX` env (default 5; staging runs 10).
  Safe on the transaction pooler (multiplexed client connections).
- `app/api/campaigns/[id]/route.ts`: campaign body wrapped in `unstable_cache`
  (60s, tag `campaigns` — already invalidated by admin edits). Draft/scheduled
  admin-only visibility and `likedByMe` deliberately stay per-request/outside
  the cache.
- Staging-only scripts (seed + load test), both guarded.
- **Infra (dashboard, not code)**: both Vercel projects moved `iad1` → London;
  account upgraded to Pro; `DB_POOL_MAX=10` set on staging (prod on default 5).

## Current posture

- 200-person push-notification burst (view + apply): comfortable — detail view
  is cache-served (~1 DB read per 60s per campaign), sustained capacity measured
  at ~189 req/s, DB ceiling ~20× above observed load.
- Watch-items: if prod logs ever show pooler `max clients` errors, lower
  `DB_POOL_MAX` (10 → 5). If Upstash free-tier quota errors appear at launch,
  split staging onto its own Redis or upgrade. Supabase needs no upgrade.

## Repro

```bash
node scripts/load-test-staging.mjs --concurrency 20 --duration 30
# staging-only by default; per-endpoint p50/p95/p99 + err% table on stdout
```
