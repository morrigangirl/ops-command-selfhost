#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)"
SELFHOST_DIR="${ROOT_DIR}/infra/selfhost"
SELFHOST_ENV="${SELFHOST_DIR}/.env"
STATE_DIR="${SELFHOST_DIR}/state"
STAMP_FILE="${STATE_DIR}/frontend-build.env"
SUPABASE_CONFIG_FILE="${ROOT_DIR}/supabase/config.toml"

die() {
  echo "ERROR: $*" >&2
  exit 1
}

get_project_id() {
  sed -n 's/^project_id[[:space:]]*=[[:space:]]*"\(.*\)"/\1/p' "${SUPABASE_CONFIG_FILE}" | head -n 1
}

if [[ ! -f "${SELFHOST_ENV}" ]]; then
  die "Missing ${SELFHOST_ENV}. Copy infra/selfhost/.env.example first."
fi

set -a
# shellcheck disable=SC1090
source "${SELFHOST_ENV}"
set +a

if [[ ! -f "${SUPABASE_CONFIG_FILE}" ]]; then
  die "Missing ${SUPABASE_CONFIG_FILE}."
fi

PROJECT_ID="$(get_project_id)"
if [[ -z "${PROJECT_ID}" ]]; then
  die "Could not read project_id from ${SUPABASE_CONFIG_FILE}."
fi

if [[ "${WEB_PORT:-}" != "8200" ]]; then
  die "WEB_PORT must be exactly 8200 for this project. Current value: ${WEB_PORT:-<unset>}"
fi

if [[ -z "${SUPABASE_API_PORT:-}" ]]; then
  die "SUPABASE_API_PORT is required in ${SELFHOST_ENV}."
fi

if [[ -z "${VITE_SUPABASE_URL:-}" || -z "${VITE_SUPABASE_PUBLISHABLE_KEY:-}" ]]; then
  die "VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY must be set in ${SELFHOST_ENV}."
fi

EXPECTED_SUPABASE_URL="http://127.0.0.1:${SUPABASE_API_PORT}"
if [[ "${VITE_SUPABASE_URL}" != "${EXPECTED_SUPABASE_URL}" ]]; then
  die "VITE_SUPABASE_URL must be ${EXPECTED_SUPABASE_URL}. Current value: ${VITE_SUPABASE_URL}"
fi

if [[ ! -x "${ROOT_DIR}/node_modules/.bin/vite" ]]; then
  die "Missing local vite binary. Install dependencies first (npm ci)."
fi

cd "${ROOT_DIR}"
VITE_SUPABASE_URL="${VITE_SUPABASE_URL}" \
VITE_SUPABASE_PUBLISHABLE_KEY="${VITE_SUPABASE_PUBLISHABLE_KEY}" \
npm run build

if [[ ! -d "${ROOT_DIR}/dist/assets" ]]; then
  die "Build finished without dist/assets."
fi

if ! rg -q --fixed-strings "${VITE_SUPABASE_URL}" "${ROOT_DIR}/dist/assets"; then
  die "Built assets do not contain expected Supabase URL (${VITE_SUPABASE_URL})."
fi

if ! rg -q --fixed-strings "${VITE_SUPABASE_PUBLISHABLE_KEY}" "${ROOT_DIR}/dist/assets"; then
  die "Built assets do not contain expected Supabase publishable key."
fi

if rg -q --fixed-strings ".supabase.co" "${ROOT_DIR}/dist/assets"; then
  die "Built assets still reference hosted Supabase (*.supabase.co)."
fi

mkdir -p "${STATE_DIR}"
PUBLISHABLE_KEY_SHA256="$(printf '%s' "${VITE_SUPABASE_PUBLISHABLE_KEY}" | shasum -a 256 | awk '{print $1}')"
cat > "${STAMP_FILE}" <<EOF
BUILD_PROJECT_ID="${PROJECT_ID}"
BUILD_WEB_PORT="${WEB_PORT}"
BUILD_SUPABASE_API_PORT="${SUPABASE_API_PORT}"
BUILD_SUPABASE_URL="${VITE_SUPABASE_URL}"
BUILD_PUBLISHABLE_KEY_SHA256="${PUBLISHABLE_KEY_SHA256}"
BUILD_CREATED_AT="$(date -u '+%Y-%m-%dT%H:%M:%SZ')"
EOF

echo "Frontend build complete. dist/ is ready for vite preview."
echo "Build stamp written: ${STAMP_FILE}"
