#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)"
SELFHOST_DIR="${ROOT_DIR}/infra/selfhost"
STATE_DIR="${SELFHOST_DIR}/state"
PID_FILE="${STATE_DIR}/frontend.pid"
ENV_FILE="${SELFHOST_DIR}/.env"
WEB_PORT="8200"

die() {
  echo "ERROR: $*" >&2
  exit 1
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

add_pid_once() {
  local pid="$1"
  case " ${TARGET_PIDS} " in
    *" ${pid} "*) ;;
    *) TARGET_PIDS="${TARGET_PIDS} ${pid}" ;;
  esac
}

stop_pid() {
  local pid="$1"
  local _i
  if ! kill -0 "${pid}" >/dev/null 2>&1; then
    return 0
  fi
  kill "${pid}" >/dev/null 2>&1 || true
  for _i in $(seq 1 20); do
    if ! kill -0 "${pid}" >/dev/null 2>&1; then
      return 0
    fi
    sleep 0.25
  done
  kill -9 "${pid}" >/dev/null 2>&1 || true
}

if [[ -f "${ENV_FILE}" ]]; then
  set -a
  # shellcheck disable=SC1090
  source "${ENV_FILE}"
  set +a
fi

if [[ "${WEB_PORT:-}" != "8200" ]]; then
  die "WEB_PORT must be exactly 8200 for this project. Current value: ${WEB_PORT:-<unset>}"
fi

TARGET_PIDS=""
FOREIGN_PIDS=""

if [[ ! -f "${PID_FILE}" ]]; then
  echo "No frontend pid file found; checking active listeners on port ${WEB_PORT}."
else
  PID="$(cat "${PID_FILE}" 2>/dev/null || true)"
  if [[ -n "${PID}" ]] && kill -0 "${PID}" >/dev/null 2>&1; then
    if is_expected_frontend_process "${PID}"; then
      add_pid_once "${PID}"
    else
      die "PID file points to a non-project process (pid ${PID}); refusing to kill it."
    fi
  fi
  rm -f "${PID_FILE}"
fi

LISTENER_PIDS="$(listener_pids_for_port)"
for pid in ${LISTENER_PIDS}; do
  if is_expected_frontend_process "${pid}"; then
    add_pid_once "${pid}"
  else
    FOREIGN_PIDS="${FOREIGN_PIDS} ${pid}"
  fi
done

if [[ -n "${FOREIGN_PIDS// }" ]]; then
  die "Port ${WEB_PORT} is held by non-project process(es):${FOREIGN_PIDS}"
fi

if [[ -z "${TARGET_PIDS// }" ]]; then
  echo "No managed frontend preview process is running."
  exit 0
fi

for pid in ${TARGET_PIDS}; do
  stop_pid "${pid}"
done

echo "Stopped frontend preview process(es):${TARGET_PIDS}"
