#!/usr/bin/env bash
set -euo pipefail

NAMESPACE="${NAMESPACE:-playground}"
INSTANCE_NAME="${INSTANCE_NAME:-convex-test-101}"
ROOK_NAMESPACE="${ROOK_NAMESPACE:-rook-ceph}"
ROOK_SECRET="${ROOK_SECRET:-rook-ceph-object-user-ceph-objectstore-${INSTANCE_NAME}}"

instance_secret="$(openssl rand -hex 32)"
db_password="$(openssl rand -hex 32)"
postgres_uri="postgresql://${INSTANCE_NAME//-/_}:${db_password}@${INSTANCE_NAME}-pg-rw.${NAMESPACE}.svc:5432"

kubectl create secret generic "${INSTANCE_NAME}-runtime" \
  --namespace "${NAMESPACE}" \
  --from-literal=INSTANCE_SECRET="${instance_secret}" \
  --dry-run=client -o yaml | kubectl apply -f -

kubectl create secret generic "${INSTANCE_NAME}-db-creds" \
  --namespace "${NAMESPACE}" \
  --type=kubernetes.io/basic-auth \
  --from-literal=username="${INSTANCE_NAME//-/_}" \
  --from-literal=password="${db_password}" \
  --from-literal=uri="${postgres_uri}" \
  --dry-run=client -o yaml | kubectl apply -f -

kubectl wait \
  --namespace "${ROOK_NAMESPACE}" \
  --for=jsonpath='{.data.AccessKey}' \
  "secret/${ROOK_SECRET}" \
  --timeout=120s

access_key="$(kubectl get secret "${ROOK_SECRET}" -n "${ROOK_NAMESPACE}" -o jsonpath='{.data.AccessKey}' | base64 --decode)"
secret_key="$(kubectl get secret "${ROOK_SECRET}" -n "${ROOK_NAMESPACE}" -o jsonpath='{.data.SecretKey}' | base64 --decode)"

kubectl create secret generic "${INSTANCE_NAME}-s3" \
  --namespace "${NAMESPACE}" \
  --from-literal=AWS_ACCESS_KEY_ID="${access_key}" \
  --from-literal=AWS_SECRET_ACCESS_KEY="${secret_key}" \
  --from-literal=AWS_REGION=us-east-1 \
  --dry-run=client -o yaml | kubectl apply -f -

echo "Created ${INSTANCE_NAME} runtime, database, and S3 credential secrets in ${NAMESPACE}."

