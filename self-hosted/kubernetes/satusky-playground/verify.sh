#!/usr/bin/env bash
set -euo pipefail

NAMESPACE="${NAMESPACE:-playground}"
INSTANCE_NAME="${INSTANCE_NAME:-convex-test-101}"

kubectl wait \
  --namespace "${NAMESPACE}" \
  --for=condition=Ready \
  "cluster.postgresql.cnpg.io/${INSTANCE_NAME}-pg" \
  --timeout=15m

kubectl wait \
  --namespace "${NAMESPACE}" \
  --for=condition=complete \
  "job/${INSTANCE_NAME}-create-buckets" \
  --timeout=5m

kubectl rollout status \
  --namespace "${NAMESPACE}" \
  "deployment/${INSTANCE_NAME}-backend" \
  --timeout=10m

kubectl rollout status \
  --namespace "${NAMESPACE}" \
  "deployment/${INSTANCE_NAME}-dashboard" \
  --timeout=10m

for url in \
  "https://api-${INSTANCE_NAME}.satusky.com/version" \
  "https://dashboard-${INSTANCE_NAME}.satusky.com/"
do
  echo "Checking ${url}"
  curl --fail --show-error --silent --location --max-time 30 "${url}" >/dev/null
done

echo "Checking https://${INSTANCE_NAME}.satusky.com/ connectivity"
curl --show-error --silent --location --max-time 30 \
  "https://${INSTANCE_NAME}.satusky.com/" >/dev/null

echo "${INSTANCE_NAME} passed basic Kubernetes and public endpoint checks."
