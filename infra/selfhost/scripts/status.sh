#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)"
SELFHOST_DIR="${ROOT_DIR}/infra/selfhost"
STATE_DIR="${SELFHOST_DIR}/state"
LOCK_FILE="${STATE_DIR}/stack.lock"
PID_FILE="${STATE_DIR}/frontend.pid"
ENV_FILE="${SELFHOST_DIR}/.env"
SUPABASE_CONFIG_FILE="${ROOT_DIR}/supabase/config.toml"

FAILURES=0

ok() {
  echo "[OK] $*"
}

warn() {
  echo "[WARN] $*"
}

fail() {
  echo "[FAIL] $*"
  FAILURES=$((FAILURES + 1))
}

get_project_id() {
  sed -n 's/^project_id[[:space:]]*=[[:space:]]*"\(.*\)"/\1/p' "${SUPABASE_CONFIG_FILE}" | head -n 1
}

is_expected_frontend_process() {
  local pid="$1"
  local cmd
  cmd="$(ps -p "${pid}" -o command= 2>/dev/null || true)"
  [[ -n "${cmd}" ]] || return 1
  [[ "${cmd}" == *"${ROOT_DIR}"* ]] || return 1
  [[ "${cmd}" == *"vite preview"* || "${cmd}" == *"npm run preview"* || "${cmd}" == *"/node_modules/.bin/vite"* ]]
}

listener_pids_for_port() {
  local port="$1"
  lsof -tiTCP:"${port}" -sTCP:LISTEN 2>/dev/null || true
}

echo "Selfhost Status"
echo "Repo: ${ROOT_DIR}"
echo

if [[ ! -f "${ENV_FILE}" ]]; then
  fail "Missing ${ENV_FILE}"
else
  # shellcheck disable=SC1090
  source "${ENV_FILE}"
  ok "Loaded ${ENV_FILE}"
fi

if [[ ! -f "${SUPABASE_CONFIG_FILE}" ]]; then
  fail "Missing ${SUPABASE_CONFIG_FILE}"
  PROJECT_ID=""
else
  PROJECT_ID="$(get_project_id)"
  if [[ -n "${PROJECT_ID}" ]]; then
    ok "project_id=${PROJECT_ID}"
  else
    fail "Could not parse project_id from ${SUPABASE_CONFIG_FILE}"
  fi
fi

if [[ "${WEB_PORT:-}" == "8200" ]]; then
  ok "WEB_PORT=8200"
else
  fail "WEB_PORT must be 8200, got ${WEB_PORT:-<unset>}"
fi

if [[ -n "${SUPABASE_API_PORT:-}" ]]; then
  ok "SUPABASE_API_PORT=${SUPABASE_API_PORT}"
else
  fail "SUPABASE_API_PORT is unset"
fi

echo
if [[ -f "${LOCK_FILE}" ]]; then
  # shellcheck disable=SC1090
  source "${LOCK_FILE}"
  ok "Lock file present: ${LOCK_FILE}"
  echo "  LOCK_PROJECT_ID=${LOCK_PROJECT_ID:-<unset>}"
  echo "  LOCK_REPO_ROOT=${LOCK_REPO_ROOT:-<unset>}"
  echo "  LOCK_WEB_PORT=${LOCK_WEB_PORT:-<unset>}"
  echo "  LOCK_SUPABASE_API_PORT=${LOCK_SUPABASE_API_PORT:-<unset>}"
  echo "  LOCK_STARTED_AT=${LOCK_STARTED_AT:-<unset>}"

  if [[ -n "${PROJECT_ID:-}" && "${LOCK_PROJECT_ID:-}" != "${PROJECT_ID}" ]]; then
    fail "Lock project mismatch"
  fi
  if [[ "${LOCK_REPO_ROOT:-}" != "${ROOT_DIR}" ]]; then
    fail "Lock repo root mismatch"
  fi
  if [[ "${LOCK_WEB_PORT:-}" != "${WEB_PORT:-}" ]]; then
    fail "Lock WEB_PORT mismatch"
  fi
  if [[ "${LOCK_SUPABASE_API_PORT:-}" != "${SUPABASE_API_PORT:-}" ]]; then
    fail "Lock SUPABASE_API_PORT mismatch"
  fi
else
  warn "Lock file missing: ${LOCK_FILE}"
fi

echo
RUNNING_SUPABASE_CONTAINERS="$(docker ps --format '{{.Names}}' | grep '^supabase_' || true)"
if [[ -z "${RUNNING_SUPABASE_CONTAINERS}" ]]; then
  warn "No running Supabase containers detected"
else
  echo "Supabase containers:"
  printf '%s\n' "${RUNNING_SUPABASE_CONTAINERS}"
  if [[ -n "${PROJECT_ID:-}" ]]; then
    FOREIGN="$(printf '%s\n' "${RUNNING_SUPABASE_CONTAINERS}" | grep -v "_${PROJECT_ID}$" || true)"
    if [[ -n "${FOREIGN}" ]]; then
      fail "Foreign Supabase containers detected"
    else
      ok "All running Supabase containers match ${PROJECT_ID}"
    fi
  fi
fi

echo
if [[ -f "${PID_FILE}" ]]; then
  FRONTEND_PID="$(cat "${PID_FILE}" 2>/dev/null || true)"
  if [[ -n "${FRONTEND_PID}" ]] && kill -0 "${FRONTEND_PID}" >/dev/null 2>&1; then
    if is_expected_frontend_process "${FRONTEND_PID}"; then
      ok "Frontend PID file points to expected process (${FRONTEND_PID})"
    else
      fail "Frontend PID file points to unexpected process (${FRONTEND_PID})"
    fi
  else
    fail "Frontend PID file exists but process is not running"
  fi
else
  warn "Frontend PID file missing: ${PID_FILE}"
fi

if [[ -n "${WEB_PORT:-}" ]]; then
  WEB_LISTENERS="$(listener_pids_for_port "${WEB_PORT}")"
  if [[ -z "${WEB_LISTENERS}" ]]; then
    warn "No listener on WEB_PORT ${WEB_PORT}"
  else
    echo "WEB_PORT ${WEB_PORT} listeners: ${WEB_LISTENERS}"
    if curl -fsS --max-time 3 "http://127.0.0.1:${WEB_PORT}/" >/dev/null 2>&1; then
      ok "Frontend HTTP health check passed"
    else
      fail "Frontend HTTP health check failed"
    fi
  fi
fi

if [[ -n "${SUPABASE_API_PORT:-}" ]]; then
  API_LISTENERS="$(listener_pids_for_port "${SUPABASE_API_PORT}")"
  if [[ -z "${API_LISTENERS}" ]]; then
    warn "No listener on SUPABASE_API_PORT ${SUPABASE_API_PORT}"
  else
    echo "SUPABASE_API_PORT ${SUPABASE_API_PORT} listeners: ${API_LISTENERS}"
    if curl -fsS --max-time 3 "http://127.0.0.1:${SUPABASE_API_PORT}/auth/v1/health" >/dev/null 2>&1; then
      ok "Supabase API health check passed"
    else
      fail "Supabase API health check failed"
    fi
  fi
fi

echo
if (( FAILURES > 0 )); then
  echo "Status result: FAIL (${FAILURES} issue(s))"
  exit 1
fi
echo "Status result: OK"
