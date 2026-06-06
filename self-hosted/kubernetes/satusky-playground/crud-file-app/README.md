# Convex Test 101 CRUD/File App

Small Next.js + Convex app for testing the self-hosted `convex-test-101` deployment.

It exercises:

- Convex queries and mutations
- Convex environment variables through `items.runtimeInfo`
- Convex Auth email/password sign-up and sign-in
- Convex cron jobs through `convex/crons.ts`
- Scheduled functions through `ctx.scheduler.runAfter()`
- File upload through `ctx.storage.generateUploadUrl()`
- File URL retrieval through `ctx.storage.getUrl()`
- File deletion through `ctx.storage.delete()`
- Item deletion that cascades storage deletes

Note: the patched playground backend is intended to physically delete Ceph RGW
objects when `CONVEX_DELETE_FILE_OBJECTS_ON_STORAGE_DELETE=true`. Validate that
behavior by uploading a file, recording the object in `convex-test-101-files`,
deleting it through the app, and confirming the object is gone from RGW.

## Deploy Convex Functions

```sh
export CONVEX_SELF_HOSTED_URL="$(kubectl get secret -n playground convex-test-101-admin -o jsonpath='{.data.CONVEX_SELF_HOSTED_URL}' | base64 --decode)"
export CONVEX_SELF_HOSTED_ADMIN_KEY="$(kubectl get secret -n playground convex-test-101-admin -o jsonpath='{.data.CONVEX_SELF_HOSTED_ADMIN_KEY}' | base64 --decode)"
npm run convex:deploy
```

Set Convex environment values from the dashboard or CLI:

```sh
npx convex env set TEST_APP_ENV playground
npx convex env set TEST_FEATURE_FLAG ceph-rgw-put-object
```

Convex Auth also requires `SITE_URL`, `JWT_PRIVATE_KEY`, and `JWKS`. Those have
already been set on `convex-test-101` for local testing.
The Next.js `middleware.ts` file is required because Convex Auth posts to the
local `/api/auth` route and the middleware proxies that request to Convex.

## Run UI Locally

```sh
cp .env.example .env.local
npm install
npm run dev
```

Open `http://localhost:3000`, create an account with email/password, then use
the same credentials to sign in again. No Clerk configuration is used.

Use the "Schedule delayed job" button to enqueue a one-off scheduled mutation.
Leave the page open for at least a minute to observe the cron heartbeat rows.

## Inspect Dedicated Ceph RGW Buckets

The Rook user CR lives in `rook-ceph` because the object store lives there:

```sh
kubectl get cephobjectstoreuser -n rook-ceph convex-test-101 -o yaml
```

The copied app-facing credentials live in `playground`:

```sh
kubectl get secret -n playground convex-test-101-s3
```

List objects without printing credentials locally:

```sh
AWS_ACCESS_KEY_ID="$(kubectl get secret -n playground convex-test-101-s3 -o jsonpath='{.data.AWS_ACCESS_KEY_ID}' | base64 --decode)"
AWS_SECRET_ACCESS_KEY="$(kubectl get secret -n playground convex-test-101-s3 -o jsonpath='{.data.AWS_SECRET_ACCESS_KEY}' | base64 --decode)"

kubectl run convex-test-101-s3-list \
  -n playground \
  --rm -i \
  --restart=Never \
  --image=amazon/aws-cli:2.17.37 \
  --env=AWS_ACCESS_KEY_ID="$AWS_ACCESS_KEY_ID" \
  --env=AWS_SECRET_ACCESS_KEY="$AWS_SECRET_ACCESS_KEY" \
  --env=AWS_DEFAULT_REGION=us-east-1 \
  --command -- sh -c '
    endpoint=http://rook-ceph-rgw-ceph-objectstore.rook-ceph.svc:80
    for b in convex-test-101-files convex-test-101-modules convex-test-101-search convex-test-101-exports convex-test-101-snapshot-imports; do
      echo "== $b =="
      aws --endpoint-url "$endpoint" s3api list-objects-v2 --bucket "$b" --query "Contents[].{Key:Key,Size:Size}" --output table
    done
  '
```
