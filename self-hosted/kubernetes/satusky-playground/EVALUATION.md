# Convex Test 101 Evaluation

## Environment

- Evaluation start: 2026-06-06
- Evaluation end:
- Evaluator: Codex with SatuSky operator
- Convex backend image: `registry.satusky.com/demo/convex-backend:satusky-ceph-putobject-delete-udf-77554060c-20260606064721`
- Convex dashboard image:
- Convex npm package: demo app local package lock; benchmark used repository `scenario-runner`
- Client location: local developer machine in Kuching, Malaysia
- Hosted Convex comparison deployment: `https://beaming-moose-973.convex.cloud` (`S256`)
- Dataset size: load-generator default setup, 500 rows
- File count and total size:
- Concurrent clients: 80 query workers and/or 80 mutation workers

## Functional Results

| Area | Result | Evidence or Notes |
| --- | --- | --- |
| CLI function deployment | Pass | Benchmark functions and demo app functions deployed successfully to self-hosted. |
| CRUD and indexes | Pass for benchmark path | Benchmark schema/index deployment worked; demo app CRUD remains the application-level test target. |
| Search | Pass for benchmark path | Text search index was deployed and queried by `query_index:queryMessagesWithSearch`. |
| Realtime subscriptions | Pending | |
| Actions and HTTP actions | Pending | |
| Crons and scheduled functions | Pending | |
| External JWT/OIDC auth | Pending | |
| Convex Auth | Pending | |
| File upload, download, and delete | Pending | |
| Backend restart persistence | Partial | Backend restarted after pre-tuning Postgres connection exhaustion and recovered with database state intact. |
| Logical export and restore | Pending | |

## Performance Results

Record p50, p95, p99, throughput, error rate, dataset size, and concurrency for
each operation. Run the same workload against hosted and self-hosted Convex from
the same client location.

| Operation | Hosted Result | Self-Hosted Result | Ratio | Notes |
| --- | --- | --- | --- | --- |
| Query | Managed `S256` mixed: 274.83 QPS, p95 308.10ms, p99 360.22ms | Tuned mixed: 313.73 QPS, p95 316.34ms, p99 398.20ms | Self-hosted 1.14x QPS, 1.03x p95, 1.11x p99 | Same 80+80 workload. |
| Mutation | Managed `S256` mixed: 169.00 QPS, p95 331.55ms, p99 436.33ms, 812 mutation timeouts | Tuned mixed: 250.53 QPS, p95 402.60ms, p99 608.30ms, no counted errors | Self-hosted 1.48x QPS, 1.21x p95, 1.39x p99 | Managed had lower latency for completed mutations but counted timeouts under mixed load. |
| Action | | | | |
| HTTP action | | | | |
| Subscription update | | | | |
| File upload | | | | |
| File download | | | | |

## Resource Results

| Resource | Idle | Representative Load | Peak | Notes |
| --- | --- | --- | --- | --- |
| Backend CPU | 1m after test | | | `kubectl top` after benchmark; not peak. |
| Backend memory | 2450Mi after test | | | Memory includes post-benchmark steady state after benchmark/demo deploy churn. |
| Backend temporary disk | | | | |
| PostgreSQL CPU | 5m after test | | | `kubectl top` after benchmark; not peak. |
| PostgreSQL memory | 408Mi after test | | | CNPG tuned to 2 CPU / 4Gi. |
| PostgreSQL connections | | | | Pre-tuning `max_connections=87` was too low for Convex default pool `128`; CNPG is tuned to `300` and the playground backend pool is capped with `POSTGRES_MAX_CONNECTIONS=64`. |
| PostgreSQL WAL growth | | | | |
| Ceph RGW latency | | | | |
| Ceph RGW bucket size | | | | |

## Reliability Events

| Timestamp | Event | User Impact | Recovery Time | Root Cause or Notes |
| --- | --- | --- | --- | --- |
| 2026-06-06 06:38 UTC | Backend restarted during mixed 80+80 benchmark | WebSocket reconnects and query/mutation timeouts | Pod restarted and became ready automatically | CNPG `max_connections=87` was below Convex default Postgres pool `128`; Postgres returned `remaining connection slots are reserved for roles with the SUPERUSER attribute`. |
| 2026-06-07 02:11 UTC | Backend entered CrashLoopBackOff at startup | API unavailable until stale sessions were cleared | Stale sessions from dead pod IP `10.244.3.22` were terminated and backend pool was capped at `64` | Postgres still had nearly all `300` slots consumed by multi-hour active `convex_test_101` sessions blocked on transaction locks, so the backend could not create its pool. |

## Backup and Restore

- Export command and duration:
- Export object size:
- Environment variable capture method:
- Restore target:
- Import duration:
- Table count comparison:
- `_storage` count comparison:
- File hash comparison:
- Measured recovery point:
- Measured recovery time:

## Known Issues

- `ceph-block-noreplica` does not tolerate loss of its backing OSD.
- CNPG is intentionally single-instance during the initial playground trial.
- The playground CNPG profile is now tuned for benchmark connection headroom,
  but it is still not a production HA database.
- `storage-main-03` is temporarily excluded until its RBD CSI mount/unmount
  behavior is validated.
- Cloudflare Access must be configured separately for the dashboard hostname.

## Decision

- Decision: Pending
- Approved application integration target: None
- Required remediation before integration: restore drill, file-storage soak,
  application-level auth/cron/scheduled/HTTP-action tests, and production CNPG HA
  design.
- Reviewer:
- Review date:
