# Convex Playground Benchmarking

This note records the first SatuSky self-hosted Convex benchmark against the
managed Convex `S256` deployment class.

## Summary

For production applications, managed Convex is still the safer default when the
customer wants the lowest operational risk and does not need SatuSky-controlled
storage, backup, domain, or data residency behavior.

SatuSky self-hosted Convex is the better product direction when we are selling a
managed application platform on top of SatuSky infrastructure. It gives us
dedicated Ceph buckets, internal PostgreSQL, custom domains, migration control,
backup policy control, and room to package margin into a customer-facing tier.
After tuning PostgreSQL, the playground instance was competitive with managed
Convex `S256` on this synthetic read/write benchmark, but it should not be sold
as production-ready until the restore drill, file-storage soak test, and
application-level testing are complete.

## Test Setup

- Date: 2026-06-06
- Client location: local developer machine in Kuching, Malaysia
- Self-hosted API: `https://api-convex-test-101.satusky.com`
- Managed API: `https://beaming-moose-973.convex.cloud`
- Managed deployment class: `S256`
- Benchmark tool: `crates/load_generator`
- Workload duration: 60 seconds
- Dataset setup: default `load_generator` setup with 500 rows
- Query workload: `query_index:queryMessagesWithSearch`
- Mutation workload: `insert:insertMessageWithSearch`

The benchmark temporarily deploys `npm-packages/scenario-runner` functions to
the target Convex deployment. Do not run it against a production application
deployment because it replaces the deployed Convex functions and schema.

## Commands

Deploy benchmark functions to self-hosted:

```sh
cd npm-packages/scenario-runner
convex deploy \
  --typecheck=disable \
  --admin-key="$CONVEX_SELF_HOSTED_ADMIN_KEY" \
  --url="$CONVEX_SELF_HOSTED_URL"
```

Run mixed read/write benchmark:

```sh
target/release/load-generator \
  --stats-report \
  --once \
  --skip-build \
  --skip-actions-deploy \
  --duration 60 \
  crates/load_generator/workloads/benchmark_query_and_insert.json \
  --existing-instance-url "$CONVEX_SELF_HOSTED_URL" \
  --existing-instance-admin-key "$CONVEX_SELF_HOSTED_ADMIN_KEY"
```

After benchmarking, redeploy the demo application functions:

```sh
cd self-hosted/kubernetes/satusky-playground/crud-file-app
convex deploy \
  --admin-key="$CONVEX_SELF_HOSTED_ADMIN_KEY" \
  --url="$CONVEX_SELF_HOSTED_URL"
```

## Initial Failure

The first mixed run failed operationally because the Convex backend defaulted to
a PostgreSQL pool size of `128`, but the CNPG instance was configured with only
`max_connections=87`.

The backend log showed:

```text
FATAL: remaining connection slots are reserved for roles with the SUPERUSER attribute
```

Convex then shut down and Kubernetes restarted the backend pod. This was a real
capacity mismatch, not a benchmark-client artifact.

## Tuning Applied

The playground CNPG profile was changed from a small 1 CPU / 1 GiB profile to:

- CPU: `2`
- Memory: `4Gi`
- `max_connections=300`
- `shared_buffers=1GB`
- `effective_cache_size=3GB`
- `work_mem=4MB`
- `maintenance_work_mem=256MB`
- `wal_buffers=16MB`
- Backend `POSTGRES_MAX_CONNECTIONS=64`

This leaves headroom for CNPG/operator/admin connections while retaining a
single backend replica and a single CNPG instance for the playground trial. The
backend pool is capped below Convex's default of `128` because this playground
cluster is meant for functional and controlled benchmark testing, not maximum
connection fan-out.

## Results

### Mixed Query + Mutation

Workload: `benchmark_query_and_insert.json`, 80 query workers and 80 mutation
workers.

| Target | Query QPS | Query p95 | Query p99 | Mutation QPS | Mutation p95 | Mutation p99 | Errors |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| Self-hosted before tuning | 129.88 | 346.12ms | 464.62ms | 107.78 | 412.16ms | 716.93ms | ~1280 query timeouts, ~1280 mutation timeouts, backend restart |
| Self-hosted after tuning | 313.73 | 316.34ms | 398.20ms | 250.53 | 402.60ms | 608.30ms | None |
| Managed Convex `S256` | 274.83 | 308.10ms | 360.22ms | 169.00 | 331.55ms | 436.33ms | 812 mutation timeouts |

### Managed Single-Workload Baselines

| Managed `S256` workload | QPS | Mean | p95 | p99 | Errors |
| --- | ---: | ---: | ---: | ---: | --- |
| Query-only, 80 workers | 274.18 | 289.10ms | 304.87ms | 389.38ms | None |
| Insert-only, 80 workers | 260.55 | 305.34ms | 330.66ms | 422.92ms | None |

### Earlier Self-Hosted Single-Workload Baselines

These were collected before the PostgreSQL tuning. They did not hit the
connection exhaustion path because each run used only one workload type.

| Self-hosted workload | QPS | Mean | p95 | p99 | Errors |
| --- | ---: | ---: | ---: | ---: | --- |
| Query-only, 80 workers | 1055.25 | 75.09ms | 106.69ms | 128.91ms | None |
| Insert-only, 80 workers | 734.62 | 108.04ms | 183.07ms | 292.42ms | None |

## Interpretation

The tuned SatuSky instance handled the mixed workload without counted errors,
while managed `S256` reported mutation timeouts at the same 80+80 worker load.
This does not prove SatuSky is universally faster than managed Convex. It proves
that, for this synthetic workload from this client location, a tuned SatuSky
playground deployment can be competitive with managed `S256`.

Managed Convex remains stronger on operational maturity:

- vendor-operated scaling and incident response;
- managed daily backups on Professional;
- official support and compliance artifacts;
- no SatuSky on-call burden for the Convex control plane.

SatuSky self-hosted is stronger for product packaging:

- dedicated Ceph RGW buckets per customer or app;
- internal CNPG and storage isolation;
- custom domain and ingress control;
- backup and retention policy control;
- ability to bundle Convex into a SatuSky application hosting tier;
- margin control over CPU, memory, storage, egress, and support.

## Charging Model

Charge customers for a capacity tier plus metered overages. Do not sell raw CPU
alone, because Convex value comes from the complete backend platform.

Recommended billable dimensions:

- reserved app tier: backend CPU/memory and PostgreSQL CPU/memory;
- function calls;
- database storage;
- database I/O;
- file storage;
- file egress;
- search storage and query usage;
- backup retention;
- custom domain and TLS management;
- migration and managed support.

Initial SatuSky tiers should be conservative:

| Tier | Intended customer | Suggested reserved resources | Notes |
| --- | --- | --- | --- |
| Playground | internal testing only | 1 backend replica, 4 CPU / 4Gi; 1 CNPG instance, 2 CPU / 4Gi | Current tested shape. Not production HA. |
| Starter Dedicated | small production app | same as playground, plus backup/restore SLO and monitoring | Sell only after restore drill and app soak pass. |
| Production Dedicated | revenue app | backend 4-8 CPU / 8Gi; CNPG 3 instances; larger Ceph buckets | Requires CNPG HA, backup automation, alerting, and runbook. |

## Current Decision

For TGC, WeddingKnot, and Strikezone migration planning:

1. Keep managed Convex as the fallback and benchmark reference.
2. Continue SatuSky self-hosted evaluation because it is viable and strategically
   useful.
3. Do not sell self-hosted Convex as a production customer tier until:
   - logical export and restore with file storage passes;
   - CRUD, auth, file upload/delete, crons, scheduled jobs, and HTTP actions
     pass under the demo app;
   - at least one multi-hour soak test passes without backend restart;
   - Ceph bucket object counts and delete behavior are verified after load;
   - CNPG HA and backup policy are defined for production tiers.

## Sources

- Convex pricing: https://www.convex.dev/pricing
- Convex limits and deployment classes: https://docs.convex.dev/production/state/limits
