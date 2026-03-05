#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)"
SUPABASE_CONFIG="${ROOT_DIR}/supabase/config.toml"
REPORT_SQL="${ROOT_DIR}/infra/selfhost/scripts/cross_tenant_integrity_report.sql"
REMEDIATE_SQL="${ROOT_DIR}/infra/selfhost/scripts/cross_tenant_integrity_remediate.sql"

if [[ ! -f "${SUPABASE_CONFIG}" ]]; then
  echo "ERROR: Missing Supabase config: ${SUPABASE_CONFIG}" >&2
  exit 1
fi

if [[ ! -f "${REPORT_SQL}" ]]; then
  echo "ERROR: Missing report SQL: ${REPORT_SQL}" >&2
  exit 1
fi

if [[ ! -f "${REMEDIATE_SQL}" ]]; then
  echo "ERROR: Missing remediation SQL: ${REMEDIATE_SQL}" >&2
  exit 1
fi

PROJECT_ID="$(sed -n 's/^project_id[[:space:]]*=[[:space:]]*"\(.*\)"/\1/p' "${SUPABASE_CONFIG}" | head -n 1)"
if [[ -z "${PROJECT_ID}" ]]; then
  echo "ERROR: Could not read project_id from ${SUPABASE_CONFIG}" >&2
  exit 1
fi

DB_CONTAINER="supabase_db_${PROJECT_ID}"
if ! docker ps --format '{{.Names}}' | grep -qx "${DB_CONTAINER}"; then
  echo "ERROR: Local Supabase DB container not running: ${DB_CONTAINER}" >&2
  echo "Start local stack first (for example: npx supabase start or infra/selfhost/scripts/start_stack.sh)." >&2
  exit 1
fi

mode="report"
if [[ "${1:-}" == "--remediate" ]]; then
  mode="remediate"
fi

run_sql_file() {
  local sql_file="$1"
  docker exec -i "${DB_CONTAINER}" \
    psql -v ON_ERROR_STOP=1 -U postgres -d postgres < "${sql_file}"
}

echo "Running cross-tenant integrity ${mode} on ${DB_CONTAINER}..."

if [[ "${mode}" == "report" ]]; then
  run_sql_file "${REPORT_SQL}"
  exit 0
fi

echo "WARNING: remediation mode will mutate data and quarantine rows."
run_sql_file "${REMEDIATE_SQL}"
echo "Remediation complete. Updated integrity report:"
run_sql_file "${REPORT_SQL}"
