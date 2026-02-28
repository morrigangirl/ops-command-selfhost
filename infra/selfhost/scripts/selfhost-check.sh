#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)"
SELFHOST_DIR="${ROOT_DIR}/infra/selfhost"
SCRIPTS_DIR="${SELFHOST_DIR}/scripts"

"${SCRIPTS_DIR}/build_frontend.sh"
"${SCRIPTS_DIR}/doctor.sh"
"${SCRIPTS_DIR}/status.sh"

echo "selfhost-check: OK"
