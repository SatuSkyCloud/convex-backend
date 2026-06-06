# Convex Test 101 Evaluation

## Environment

- Evaluation start:
- Evaluation end:
- Evaluator:
- Convex backend image:
- Convex dashboard image:
- Convex npm package:
- Client location:
- Hosted Convex comparison deployment:
- Dataset size:
- File count and total size:
- Concurrent clients:

## Functional Results

| Area | Result | Evidence or Notes |
| --- | --- | --- |
| CLI function deployment | Pending | |
| CRUD and indexes | Pending | |
| Search | Pending | |
| Realtime subscriptions | Pending | |
| Actions and HTTP actions | Pending | |
| Crons and scheduled functions | Pending | |
| External JWT/OIDC auth | Pending | |
| Convex Auth | Pending | |
| File upload, download, and delete | Pending | |
| Backend restart persistence | Pending | |
| Logical export and restore | Pending | |

## Performance Results

Record p50, p95, p99, throughput, error rate, dataset size, and concurrency for
each operation. Run the same workload against hosted and self-hosted Convex from
the same client location.

| Operation | Hosted Result | Self-Hosted Result | Ratio | Notes |
| --- | --- | --- | --- | --- |
| Query | | | | |
| Mutation | | | | |
| Action | | | | |
| HTTP action | | | | |
| Subscription update | | | | |
| File upload | | | | |
| File download | | | | |

## Resource Results

| Resource | Idle | Representative Load | Peak | Notes |
| --- | --- | --- | --- | --- |
| Backend CPU | | | | |
| Backend memory | | | | |
| Backend temporary disk | | | | |
| PostgreSQL CPU | | | | |
| PostgreSQL memory | | | | |
| PostgreSQL connections | | | | |
| PostgreSQL WAL growth | | | | |
| Ceph RGW latency | | | | |
| Ceph RGW bucket size | | | | |

## Reliability Events

| Timestamp | Event | User Impact | Recovery Time | Root Cause or Notes |
| --- | --- | --- | --- | --- |
| | | | | |

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
- `storage-main-03` is temporarily excluded until its RBD CSI mount/unmount
  behavior is validated.
- Cloudflare Access must be configured separately for the dashboard hostname.

## Decision

- Decision: Pending
- Approved application integration target: None
- Required remediation before integration:
- Reviewer:
- Review date:

