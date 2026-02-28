#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)"
SELFHOST_DIR="${ROOT_DIR}/infra/selfhost"
STATE_DIR="${SELFHOST_DIR}/state"
PID_FILE="${STATE_DIR}/frontend.pid"
LOG_FILE="${STATE_DIR}/frontend.log"
ENV_FILE="${SELFHOST_DIR}/.env"
STAMP_FILE="${STATE_DIR}/frontend-build.env"
SUPABASE_CONFIG_FILE="${ROOT_DIR}/supabase/config.toml"

die() {
  echo "ERROR: $*" >&2
  exit 1
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
  lsof -tiTCP:"${WEB_PORT}" -sTCP:LISTEN 2>/dev/null || true
}

listeners_are_expected() {
  local pids="$1"
  local pid
  [[ -n "${pids}" ]] || return 1
  for pid in ${pids}; do
    if ! is_expected_frontend_process "${pid}"; then
      return 1
    fi
  done
  return 0
}

listeners_details() {
  local pids="$1"
  local pid
  local cmd
  local details=""
  for pid in ${pids}; do
    cmd="$(ps -p "${pid}" -o command= 2>/dev/null || true)"
    details+=$'\n'"  pid ${pid}: ${cmd}"
  done
  printf '%s' "${details}"
}

frontend_http_healthy() {
  curl -fsS --max-time 3 "http://127.0.0.1:${WEB_PORT}/" >/dev/null 2>&1
}

mkdir -p "${STATE_DIR}"

if [[ ! -f "${ENV_FILE}" ]]; then
  die "Missing ${ENV_FILE}. Copy infra/selfhost/.env.example first."
fi

set -a
# shellcheck disable=SC1090
source "${ENV_FILE}"
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
  die "SUPABASE_API_PORT is required in ${ENV_FILE}."
fi

if [[ -z "${VITE_SUPABASE_URL:-}" || -z "${VITE_SUPABASE_PUBLISHABLE_KEY:-}" ]]; then
  die "VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY must be set in ${ENV_FILE}."
fi

EXPECTED_SUPABASE_URL="http://127.0.0.1:${SUPABASE_API_PORT}"
if [[ "${VITE_SUPABASE_URL}" != "${EXPECTED_SUPABASE_URL}" ]]; then
  die "VITE_SUPABASE_URL must be ${EXPECTED_SUPABASE_URL}. Current value: ${VITE_SUPABASE_URL}"
fi

if [[ ! -f "${STAMP_FILE}" ]]; then
  die "Missing ${STAMP_FILE}. Run infra/selfhost/scripts/build_frontend.sh first."
fi

# shellcheck disable=SC1090
source "${STAMP_FILE}"

if [[ -z "${BUILD_PROJECT_ID:-}" || -z "${BUILD_WEB_PORT:-}" || -z "${BUILD_SUPABASE_API_PORT:-}" || -z "${BUILD_SUPABASE_URL:-}" || -z "${BUILD_PUBLISHABLE_KEY_SHA256:-}" ]]; then
  die "Build stamp is incomplete (${STAMP_FILE}). Re-run infra/selfhost/scripts/build_frontend.sh."
fi

CURRENT_PUBLISHABLE_KEY_SHA256="$(printf '%s' "${VITE_SUPABASE_PUBLISHABLE_KEY}" | shasum -a 256 | awk '{print $1}')"

if [[ "${BUILD_PROJECT_ID}" != "${PROJECT_ID}" ]]; then
  die "Build stamp project mismatch. Expected ${PROJECT_ID}, got ${BUILD_PROJECT_ID}. Re-run build_frontend.sh."
fi
if [[ "${BUILD_WEB_PORT}" != "${WEB_PORT}" ]]; then
  die "Build stamp WEB_PORT mismatch. Expected ${WEB_PORT}, got ${BUILD_WEB_PORT}. Re-run build_frontend.sh."
fi
if [[ "${BUILD_SUPABASE_API_PORT}" != "${SUPABASE_API_PORT}" ]]; then
  die "Build stamp SUPABASE_API_PORT mismatch. Expected ${SUPABASE_API_PORT}, got ${BUILD_SUPABASE_API_PORT}. Re-run build_frontend.sh."
fi
if [[ "${BUILD_SUPABASE_URL}" != "${VITE_SUPABASE_URL}" ]]; then
  die "Build stamp VITE_SUPABASE_URL mismatch. Expected ${VITE_SUPABASE_URL}, got ${BUILD_SUPABASE_URL}. Re-run build_frontend.sh."
fi
if [[ "${BUILD_PUBLISHABLE_KEY_SHA256}" != "${CURRENT_PUBLISHABLE_KEY_SHA256}" ]]; then
  die "Build stamp publishable key mismatch. Re-run build_frontend.sh."
fi

if [[ ! -d "${ROOT_DIR}/dist" ]]; then
  die "Missing dist/. Run infra/selfhost/scripts/build_frontend.sh first."
fi

if [[ ! -x "${ROOT_DIR}/node_modules/.bin/vite" ]]; then
  die "Missing local vite binary. Install dependencies first (npm ci)."
fi

LISTENER_PIDS="$(listener_pids_for_port)"
if [[ -n "${LISTENER_PIDS}" ]]; then
  if listeners_are_expected "${LISTENER_PIDS}" && frontend_http_healthy; then
    RUNNING_PID="$(printf '%s\n' "${LISTENER_PIDS}" | head -n 1)"
    printf '%s\n' "${RUNNING_PID}" > "${PID_FILE}"
    echo "Frontend preview already running (pid ${RUNNING_PID}) on port ${WEB_PORT}."
    echo "Logs: ${LOG_FILE}"
    exit 0
  fi
  die "Port ${WEB_PORT} is already in use by a non-project process or unhealthy listener.$(listeners_details "${LISTENER_PIDS}")"
fi

if [[ -f "${PID_FILE}" ]]; then
  EXISTING_PID="$(cat "${PID_FILE}" 2>/dev/null || true)"
  if [[ -n "${EXISTING_PID}" ]] && kill -0 "${EXISTING_PID}" >/dev/null 2>&1; then
    kill "${EXISTING_PID}" >/dev/null 2>&1 || true
  fi
  rm -f "${PID_FILE}"
fi

cd "${ROOT_DIR}"
nohup npm run preview -- --host 0.0.0.0 --port "${WEB_PORT:-8200}" --strictPort >"${LOG_FILE}" 2>&1 &
START_PID="$!"
echo "${START_PID}" > "${PID_FILE}"

STARTED="false"
for _ in $(seq 1 20); do
  LISTENER_PIDS="$(listener_pids_for_port)"
  if kill -0 "${START_PID}" >/dev/null 2>&1 && listeners_are_expected "${LISTENER_PIDS}" && frontend_http_healthy; then
    STARTED="true"
    break
  fi
  sleep 0.5
done

if [[ "${STARTED}" != "true" ]]; then
  kill "${START_PID}" >/dev/null 2>&1 || true
  rm -f "${PID_FILE}"
  echo "Frontend preview failed health checks. Recent logs:"
  tail -n 80 "${LOG_FILE}" || true
  exit 1
fi

RUNNING_PID="$(printf '%s\n' "${LISTENER_PIDS}" | head -n 1)"
printf '%s\n' "${RUNNING_PID}" > "${PID_FILE}"

echo "Started frontend preview (pid ${RUNNING_PID}) on port ${WEB_PORT:-8200}."
echo "Logs: ${LOG_FILE}"
