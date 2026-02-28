#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)"
SELFHOST_DIR="${ROOT_DIR}/infra/selfhost"
ENV_FILE="${SELFHOST_DIR}/.env"
STATE_DIR="${SELFHOST_DIR}/state"
STAMP_FILE="${STATE_DIR}/frontend-build.env"
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

show_listener_details() {
  local pids="$1"
  local pid
  local cmd
  for pid in ${pids}; do
    cmd="$(ps -p "${pid}" -o command= 2>/dev/null || true)"
    echo "  pid ${pid}: ${cmd}"
  done
}

echo "Selfhost Doctor"
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
  if [[ -z "${PROJECT_ID}" ]]; then
    fail "Could not read project_id from ${SUPABASE_CONFIG_FILE}"
  else
    ok "project_id=${PROJECT_ID}"
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

EXPECTED_SUPABASE_URL=""
if [[ -n "${SUPABASE_API_PORT:-}" ]]; then
  EXPECTED_SUPABASE_URL="http://127.0.0.1:${SUPABASE_API_PORT}"
fi
if [[ -n "${VITE_SUPABASE_URL:-}" ]]; then
  if [[ "${VITE_SUPABASE_URL}" == "${EXPECTED_SUPABASE_URL}" ]]; then
    ok "VITE_SUPABASE_URL matches API port"
  else
    fail "VITE_SUPABASE_URL mismatch. Expected ${EXPECTED_SUPABASE_URL}, got ${VITE_SUPABASE_URL}"
  fi
else
  fail "VITE_SUPABASE_URL is unset"
fi

if [[ -n "${VITE_SUPABASE_PUBLISHABLE_KEY:-}" ]]; then
  ok "VITE_SUPABASE_PUBLISHABLE_KEY is set"
else
  fail "VITE_SUPABASE_PUBLISHABLE_KEY is unset"
fi

echo
if [[ -f "${STAMP_FILE}" ]]; then
  # shellcheck disable=SC1090
  source "${STAMP_FILE}"
  ok "Build stamp present (${STAMP_FILE})"
  if [[ -n "${PROJECT_ID:-}" && "${BUILD_PROJECT_ID:-}" != "${PROJECT_ID}" ]]; then
    fail "Build stamp project mismatch: ${BUILD_PROJECT_ID:-<unset>} != ${PROJECT_ID}"
  fi
  if [[ "${BUILD_WEB_PORT:-}" != "${WEB_PORT:-}" ]]; then
    fail "Build stamp WEB_PORT mismatch: ${BUILD_WEB_PORT:-<unset>} != ${WEB_PORT:-<unset>}"
  fi
  if [[ "${BUILD_SUPABASE_API_PORT:-}" != "${SUPABASE_API_PORT:-}" ]]; then
    fail "Build stamp API port mismatch: ${BUILD_SUPABASE_API_PORT:-<unset>} != ${SUPABASE_API_PORT:-<unset>}"
  fi
  if [[ "${BUILD_SUPABASE_URL:-}" != "${VITE_SUPABASE_URL:-}" ]]; then
    fail "Build stamp URL mismatch: ${BUILD_SUPABASE_URL:-<unset>} != ${VITE_SUPABASE_URL:-<unset>}"
  fi
  if [[ -n "${VITE_SUPABASE_PUBLISHABLE_KEY:-}" && -n "${BUILD_PUBLISHABLE_KEY_SHA256:-}" ]]; then
    CURRENT_KEY_SHA256="$(printf '%s' "${VITE_SUPABASE_PUBLISHABLE_KEY}" | shasum -a 256 | awk '{print $1}')"
    if [[ "${BUILD_PUBLISHABLE_KEY_SHA256}" == "${CURRENT_KEY_SHA256}" ]]; then
      ok "Build stamp publishable key hash matches current env"
    else
      fail "Build stamp publishable key hash mismatch"
    fi
  else
    fail "Build stamp is missing publishable key hash"
  fi
else
  fail "Missing build stamp: ${STAMP_FILE}"
fi

echo
if [[ -d "${ROOT_DIR}/dist/assets" ]]; then
  if [[ -n "${VITE_SUPABASE_URL:-}" ]] && rg -q --fixed-strings "${VITE_SUPABASE_URL}" "${ROOT_DIR}/dist/assets"; then
    ok "dist assets contain expected Supabase URL"
  else
    fail "dist assets missing expected Supabase URL"
  fi

  if rg -q --fixed-strings ".supabase.co" "${ROOT_DIR}/dist/assets"; then
    fail "dist assets reference hosted Supabase (*.supabase.co)"
  else
    ok "dist assets contain no hosted Supabase reference"
  fi
else
  fail "Missing dist/assets"
fi

echo
RUNNING_SUPABASE_CONTAINERS="$(docker ps --format '{{.Names}}' | grep '^supabase_' || true)"
if [[ -z "${RUNNING_SUPABASE_CONTAINERS}" ]]; then
  warn "No running Supabase containers found"
else
  echo "Running Supabase containers:"
  printf '%s\n' "${RUNNING_SUPABASE_CONTAINERS}"
  if [[ -n "${PROJECT_ID:-}" ]]; then
    FOREIGN_SUPABASE="$(printf '%s\n' "${RUNNING_SUPABASE_CONTAINERS}" | grep -v "_${PROJECT_ID}$" || true)"
    if [[ -n "${FOREIGN_SUPABASE}" ]]; then
      fail "Detected foreign Supabase stack containers:\n${FOREIGN_SUPABASE}"
    else
      ok "All running Supabase containers match project ${PROJECT_ID}"
    fi
  fi
fi

echo
if [[ -n "${WEB_PORT:-}" ]]; then
  WEB_LISTENERS="$(listener_pids_for_port "${WEB_PORT}")"
  if [[ -z "${WEB_LISTENERS}" ]]; then
    warn "No listener on WEB_PORT ${WEB_PORT}"
  else
    echo "WEB_PORT ${WEB_PORT} listener(s):"
    show_listener_details "${WEB_LISTENERS}"
    UNEXPECTED_WEB=""
    pid=""
    for pid in ${WEB_LISTENERS}; do
      if ! is_expected_frontend_process "${pid}"; then
        UNEXPECTED_WEB="${UNEXPECTED_WEB} ${pid}"
      fi
    done
    if [[ -n "${UNEXPECTED_WEB// }" ]]; then
      fail "WEB_PORT has non-project listener(s):${UNEXPECTED_WEB}"
    else
      ok "WEB_PORT listeners are expected frontend process(es)"
      if curl -fsS --max-time 3 "http://127.0.0.1:${WEB_PORT}/" >/dev/null 2>&1; then
        ok "Frontend HTTP health check passed"
      else
        fail "Frontend HTTP health check failed at http://127.0.0.1:${WEB_PORT}/"
      fi
    fi
  fi
fi

if [[ -n "${SUPABASE_API_PORT:-}" ]]; then
  API_LISTENERS="$(listener_pids_for_port "${SUPABASE_API_PORT}")"
  if [[ -z "${API_LISTENERS}" ]]; then
    warn "No listener on SUPABASE_API_PORT ${SUPABASE_API_PORT}"
  else
    echo "SUPABASE_API_PORT ${SUPABASE_API_PORT} listener(s):"
    show_listener_details "${API_LISTENERS}"
    if curl -fsS --max-time 3 "http://127.0.0.1:${SUPABASE_API_PORT}/auth/v1/health" >/dev/null 2>&1; then
      ok "Supabase API health check passed"
    else
      fail "Supabase API health check failed at http://127.0.0.1:${SUPABASE_API_PORT}/auth/v1/health"
    fi
  fi
fi

echo
if (( FAILURES > 0 )); then
  echo "Doctor result: FAIL (${FAILURES} issue(s))"
  exit 1
fi

echo "Doctor result: OK"
