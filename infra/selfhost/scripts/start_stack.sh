#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)"
SELFHOST_DIR="${ROOT_DIR}/infra/selfhost"
STATE_DIR="${SELFHOST_DIR}/state"
LOCK_FILE="${STATE_DIR}/stack.lock"
FRONTEND_PID_FILE="${STATE_DIR}/frontend.pid"
ENV_FILE="${SELFHOST_DIR}/.env"
SUPABASE_CONFIG_FILE="${ROOT_DIR}/supabase/config.toml"

die() {
  echo "ERROR: $*" >&2
  exit 1
}

get_project_id() {
  sed -n 's/^project_id[[:space:]]*=[[:space:]]*"\(.*\)"/\1/p' "${SUPABASE_CONFIG_FILE}" | head -n 1
}

expected_frontend_listener() {
  local pid="$1"
  local cmd
  cmd="$(ps -p "${pid}" -o command= 2>/dev/null || true)"
  [[ "${cmd}" == *"vite preview"* && "${cmd}" == *"${ROOT_DIR}"* ]]
}

has_expected_supabase_stack() {
  local project_id="$1"
  docker ps --format '{{.Names}}' | grep -q "^supabase_kong_${project_id}$"
}

frontend_http_healthy() {
  local port="$1"
  curl -fsS --max-time 3 "http://127.0.0.1:${port}/" >/dev/null 2>&1
}

supabase_api_healthy() {
  local port="$1"
  curl -fsS --max-time 3 "http://127.0.0.1:${port}/auth/v1/health" >/dev/null 2>&1
}

read_lock_file() {
  # shellcheck disable=SC1090
  source "${LOCK_FILE}"
}

lock_is_match() {
  [[ "${LOCK_PROJECT_ID:-}" == "${PROJECT_ID}" ]] &&
  [[ "${LOCK_REPO_ROOT:-}" == "${ROOT_DIR}" ]] &&
  [[ "${LOCK_WEB_PORT:-}" == "${WEB_PORT}" ]] &&
  [[ "${LOCK_SUPABASE_API_PORT:-}" == "${SUPABASE_API_PORT}" ]]
}

stack_is_healthy_now() {
  local frontend_pid
  frontend_pid="$(cat "${FRONTEND_PID_FILE}" 2>/dev/null || true)"
  [[ -n "${frontend_pid}" ]] &&
  kill -0 "${frontend_pid}" >/dev/null 2>&1 &&
  has_expected_supabase_stack "${PROJECT_ID}" &&
  frontend_http_healthy "${WEB_PORT}" &&
  supabase_api_healthy "${SUPABASE_API_PORT}"
}

write_lock_file() {
  mkdir -p "${STATE_DIR}"
  cat > "${LOCK_FILE}" <<EOF
LOCK_PROJECT_ID="${PROJECT_ID}"
LOCK_REPO_ROOT="${ROOT_DIR}"
LOCK_WEB_PORT="${WEB_PORT}"
LOCK_SUPABASE_API_PORT="${SUPABASE_API_PORT}"
LOCK_STARTED_AT="$(date -u '+%Y-%m-%dT%H:%M:%SZ')"
EOF
}

check_port_collision() {
  local port="$1"
  local kind="$2"
  local project_id="$3"
  local pids
  local pid
  local cmd
  local all_expected_frontend="true"
  local details=""

  pids="$(lsof -tiTCP:"${port}" -sTCP:LISTEN 2>/dev/null || true)"
  if [[ -z "${pids}" ]]; then
    return 0
  fi

  if [[ "${kind}" == "supabase_api" ]] && has_expected_supabase_stack "${project_id}"; then
    return 0
  fi

  if [[ "${kind}" == "frontend" ]]; then
    for pid in ${pids}; do
      if ! expected_frontend_listener "${pid}"; then
        all_expected_frontend="false"
        break
      fi
    done
    if [[ "${all_expected_frontend}" == "true" ]]; then
      return 0
    fi
  fi

  for pid in ${pids}; do
    cmd="$(ps -p "${pid}" -o command= 2>/dev/null || true)"
    details+=$'\n'"  pid ${pid}: ${cmd}"
  done

  die "Port ${port} is already in use by a non-project process.${details}"
}

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

# Strict single-machine guardrail for this project.
if [[ "${WEB_PORT:-}" != "8200" ]]; then
  die "WEB_PORT must be exactly 8200 for this project. Current value: ${WEB_PORT:-<unset>}"
fi

if [[ -z "${SUPABASE_API_PORT:-}" ]]; then
  die "SUPABASE_API_PORT is required in ${ENV_FILE}."
fi

if [[ -z "${VITE_SUPABASE_URL:-}" ]]; then
  die "VITE_SUPABASE_URL is required in ${ENV_FILE}."
fi

EXPECTED_SUPABASE_URL="http://127.0.0.1:${SUPABASE_API_PORT}"
if [[ "${VITE_SUPABASE_URL}" != "${EXPECTED_SUPABASE_URL}" ]]; then
  die "VITE_SUPABASE_URL must be ${EXPECTED_SUPABASE_URL}. Current value: ${VITE_SUPABASE_URL}"
fi

RUNNING_SUPABASE_CONTAINERS="$(docker ps --format '{{.Names}}' | grep '^supabase_' || true)"
if [[ -n "${RUNNING_SUPABASE_CONTAINERS}" ]]; then
  FOREIGN_SUPABASE_CONTAINERS="$(printf '%s\n' "${RUNNING_SUPABASE_CONTAINERS}" | grep -v "_${PROJECT_ID}$" || true)"
  if [[ -n "${FOREIGN_SUPABASE_CONTAINERS}" ]]; then
    die "Detected another running Supabase stack:\n${FOREIGN_SUPABASE_CONTAINERS}\nStop it before starting ${PROJECT_ID}."
  fi
fi

check_port_collision "${SUPABASE_API_PORT}" "supabase_api" "${PROJECT_ID}"
check_port_collision "${WEB_PORT}" "frontend" "${PROJECT_ID}"

if [[ -f "${LOCK_FILE}" ]]; then
  read_lock_file
  if lock_is_match; then
    if stack_is_healthy_now; then
      echo "Stack already started and healthy for ${PROJECT_ID}."
      echo "Frontend preview: http://127.0.0.1:${WEB_PORT}"
      echo "Supabase API: http://127.0.0.1:${SUPABASE_API_PORT}"
      exit 0
    fi
    echo "Found stale matching stack lock, replacing it."
    rm -f "${LOCK_FILE}"
  else
    die "Existing stack lock belongs to another repo/stack. Lock file: ${LOCK_FILE}"
  fi
fi

"${SELFHOST_DIR}/scripts/build_frontend.sh"

cd "${ROOT_DIR}"
npx supabase start

"${SELFHOST_DIR}/scripts/start_frontend.sh"

cd "${SELFHOST_DIR}"
if [[ -n "${CLOUDFLARE_TUNNEL_TOKEN:-}" ]]; then
  docker-compose up -d
  echo "Cloudflared tunnel container started."
else
  echo "CLOUDFLARE_TUNNEL_TOKEN is empty; skipping cloudflared startup."
fi

write_lock_file

echo "Selfhost stack started."
echo "Frontend preview: http://127.0.0.1:${WEB_PORT:-8200}"
echo "Supabase API: http://127.0.0.1:${SUPABASE_API_PORT:-55321}"
