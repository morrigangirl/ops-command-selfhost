#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)"
SELFHOST_DIR="${ROOT_DIR}/infra/selfhost"
STATE_DIR="${SELFHOST_DIR}/state"
LOCK_FILE="${STATE_DIR}/stack.lock"
ENV_FILE="${SELFHOST_DIR}/.env"
SUPABASE_CONFIG_FILE="${ROOT_DIR}/supabase/config.toml"

die() {
  echo "ERROR: $*" >&2
  exit 1
}

get_project_id() {
  sed -n 's/^project_id[[:space:]]*=[[:space:]]*"\(.*\)"/\1/p' "${SUPABASE_CONFIG_FILE}" | head -n 1
}

load_env_if_present() {
  if [[ -f "${ENV_FILE}" ]]; then
    set -a
    # shellcheck disable=SC1090
    source "${ENV_FILE}"
    set +a
  fi
}

load_lock() {
  # shellcheck disable=SC1090
  source "${LOCK_FILE}"
}

validate_lock_or_fail() {
  if [[ ! -f "${LOCK_FILE}" ]]; then
    die "Missing stack lock (${LOCK_FILE}). Refusing to stop an untracked stack."
  fi
  load_lock
  if [[ "${LOCK_PROJECT_ID:-}" != "${PROJECT_ID}" ]]; then
    die "Lock project mismatch. Expected ${PROJECT_ID}, got ${LOCK_PROJECT_ID:-<unset>}."
  fi
  if [[ "${LOCK_REPO_ROOT:-}" != "${ROOT_DIR}" ]]; then
    die "Lock repo mismatch. Expected ${ROOT_DIR}, got ${LOCK_REPO_ROOT:-<unset>}."
  fi
  if [[ "${LOCK_WEB_PORT:-}" != "${WEB_PORT:-}" ]]; then
    die "Lock WEB_PORT mismatch. Expected ${WEB_PORT:-<unset>}, got ${LOCK_WEB_PORT:-<unset>}."
  fi
  if [[ "${LOCK_SUPABASE_API_PORT:-}" != "${SUPABASE_API_PORT:-}" ]]; then
    die "Lock SUPABASE_API_PORT mismatch. Expected ${SUPABASE_API_PORT:-<unset>}, got ${LOCK_SUPABASE_API_PORT:-<unset>}."
  fi
}

if [[ ! -f "${SUPABASE_CONFIG_FILE}" ]]; then
  die "Missing ${SUPABASE_CONFIG_FILE}."
fi
PROJECT_ID="$(get_project_id)"
if [[ -z "${PROJECT_ID}" ]]; then
  die "Could not read project_id from ${SUPABASE_CONFIG_FILE}."
fi

load_env_if_present
if [[ "${WEB_PORT:-}" != "8200" ]]; then
  die "WEB_PORT must be exactly 8200 for this project. Current value: ${WEB_PORT:-<unset>}"
fi
if [[ -z "${SUPABASE_API_PORT:-}" ]]; then
  die "SUPABASE_API_PORT is required in ${ENV_FILE}."
fi

validate_lock_or_fail

"${SELFHOST_DIR}/scripts/stop_frontend.sh"

cd "${SELFHOST_DIR}"
docker-compose down || true

cd "${ROOT_DIR}"
npx supabase stop

rm -f "${LOCK_FILE}"

echo "Selfhost stack stopped."
