# SatuSky Playground Convex Proof of Concept

This bundle deploys an isolated self-hosted Convex instance named
`convex-test-101` into the existing `playground` namespace.

It reuses the cluster's shared Rook Ceph RGW service, but creates a dedicated
RGW user and five dedicated buckets. It does not reuse or delete any existing
`convex-*` Secrets or the old `postgres-data-convex-postgres-0` PVC.

## Architecture

- One Convex backend replica with PostgreSQL and S3 storage.
- One Convex dashboard replica.
- One CloudNativePG PostgreSQL 17 instance for the playground trial.
- `ceph-block-noreplica` RWO volumes for PostgreSQL data and WAL.
- CNPG excludes `storage-main-03` while its RBD CSI node plugin has stale,
  busy mappings; remove this exclusion after the node-level issue is resolved.
- Dedicated Ceph RGW buckets for files, modules, search, exports, and snapshot
  imports.
- PostgreSQL is internal-only through the CNPG `-rw`, `-ro`, and `-r`
  Services. No PostgreSQL ingress is created.
- The backend verifies the internal PostgreSQL TLS certificate using the
  CNPG-generated CA Secret through `PG_CA_FILE`.
- Public HTTPS through `ingress-nginx-my-kul-1a`:
  - `https://api-convex-test-101.satusky.com`
  - `https://convex-test-101.satusky.com`
  - `https://dashboard-convex-test-101.satusky.com`

Cloudflare Access must be configured separately for the dashboard hostname.
The API and HTTP-action hostnames must not be placed behind an Access policy.

## Image Pinning

The backend and dashboard are pinned to the multi-architecture digests that
were published as `latest` when this PoC bundle was created. Keep the images
paired when upgrading and run an export before changing them.

The playground currently carries a local backend patch for Ceph RGW
compatibility. Convex's upstream S3 upload implementation uses multipart
uploads for server-side module and file writes. The SatuSky RGW endpoint accepts
normal `PutObject` writes and ranged reads, but returns `InvalidRange` during
Convex's multipart-backed module and file upload path. The patched backend
honors `AWS_S3_USE_PUT_OBJECT_UPLOADS=true` and uses `PutObject` for
server-side uploads so the PoC can validate functions and normal file uploads
against Ceph. Build and push a patched backend image before applying this
bundle with that flag enabled.

## Deploy

Prerequisites:

- Current `kubectl` context points to the SatuSky cluster.
- `playground`, `rook-ceph`, the Rook object store, CloudNativePG, cert-manager,
  external-dns, and `ingress-nginx-my-kul-1a` already exist.
- DNS for `satusky.com` is managed by the cluster's external-dns integration.

Apply the RGW user first so Rook can generate credentials:

```sh
kubectl apply -f ceph-object-user.yaml
```

Generate fresh runtime/database Secrets and copy the generated Rook credentials
into a separate `playground` Secret:

```sh
chmod +x bootstrap-secrets.sh verify.sh
./bootstrap-secrets.sh
```

Apply the complete bundle:

```sh
kubectl apply -k .
./verify.sh
```

Build the patched backend image when Docker/CI is available:

```sh
docker build \
  -t <registry>/convex-backend:satusky-ceph-putobject \
  -f ../../docker-build/Dockerfile.backend ../../..
docker push <registry>/convex-backend:satusky-ceph-putobject
```

Then update `backend.yaml` to use that image and roll the backend deployment.

Generate the admin key after the backend is ready:

```sh
kubectl exec -n playground deploy/convex-test-101-backend -- \
  ./generate_admin_key.sh
```

Store the returned admin key in the approved secret manager. Do not commit it.

## Synthetic Workload

Use `npm-packages/demos/convex-test` as the initial CRUD, auth, scheduler, and
HTTP-action workload. Use `npm-packages/demos/file-storage` for storage tests.

Set these values outside git:

```sh
export CONVEX_SELF_HOSTED_URL=https://api-convex-test-101.satusky.com
export CONVEX_SELF_HOSTED_ADMIN_KEY='<admin-key>'
```

Deploy functions with a Convex npm package compatible with the pinned backend.
Configure one external JWT/OIDC provider representative of the applications,
then separately follow the manual self-hosted Convex Auth setup.

## Required Functional Tests

Record the result and duration of each test:

1. Push functions, schema, indexes, crons, and environment variables.
2. Create, read, update, delete, paginate, and search test documents.
3. Open multiple realtime subscriptions and measure update/reconnect latency.
4. Call actions and HTTP actions through the public site hostname.
5. Verify scheduled functions and crons execute after backend restarts.
6. Validate authenticated, unauthenticated, expired-token, and denied requests.
7. Upload, resolve, download, hash-check, and delete files at representative
   sizes, including a near-limit file.
8. Confirm objects are stored only in the dedicated RGW buckets.
9. Restart the backend and verify data, functions, and files remain available.
10. After the storage-node issue is resolved and CNPG is expanded, perform a
    CNPG switchover and measure application errors and recovery time.

## Monitoring

The backend enables `/metrics` and includes annotations for the existing
Prometheus Kubernetes pod scrape job. The API ingress blocks the exact
`/metrics` path so it is not exposed publicly. The cluster already collects
ingress-nginx, CNPG, Rook Ceph, kube-state-metrics, and container metrics.

Capture at least:

- Query, mutation, action, HTTP-action, upload, and download p50/p95/p99.
- WebSocket connection time, reconnect time, subscription update latency,
  throughput, and error rate.
- Backend CPU, memory, restarts, concurrency, and temporary disk usage.
- PostgreSQL connections, transaction latency, replication lag, failover time,
  and WAL growth.
- RGW request latency, error rate, capacity growth, and bucket object counts.
- Ingress latency, HTTP status rates, certificate readiness, and availability.

Run the same synthetic workload against hosted Convex and self-hosted Convex
from the same client location. Record dataset size, concurrency, client
location, test duration, and raw results.

The first self-hosted versus managed Convex `S256` benchmark and PostgreSQL
tuning notes are recorded in `BENCHMARKING.md`.

## Backup and Restore Drill

This PoC intentionally deploys raw CNPG without Barman plugin integration or a
CNPG backup schedule. Convex logical exports are the backup and restore method
being evaluated because they cover Convex data and file storage together.

During the seven-day evaluation:

1. Run a Convex logical export with file storage included.
2. Save environment variables separately with `npx convex env list`.
3. Restore into a separately named instance, database, RGW user, and buckets.
4. Compare table counts, `_storage` counts, file hashes, functions, auth,
   HTTP actions, and scheduled behavior.
5. Record recovery point and recovery time measurements.

Do not use the production PoC buckets for the restore target.

## Seven-Day Go/No-Go Evaluation

The PoC is ready for an application integration review only when:

- No data or file loss occurs after backend restart or the restore drill.
- All three HTTPS origins, TLS, WebSockets, uploads, downloads, auth flows,
  crons, and scheduled functions work consistently.
- Steady-state error rate remains below 1%.
- Self-hosted p95 latency is no worse than 2x the hosted baseline for equivalent
  operations from the same client location.
- Query and mutation p95 latency remains below 500 ms and realtime updates
  remain below 1 second under the agreed representative load.
- The report explicitly accepts or rejects the durability risk of
  `ceph-block-noreplica`.

## Cleanup

Do not delete the Ceph user, buckets, CNPG cluster, PVCs, or export objects
until the restore drill and evaluation report are complete. Cleanup is
intentionally manual because these resources contain the evidence needed for
the decision.
