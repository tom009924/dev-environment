#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"

echo "Running Dev Container post-create setup..."

# 1. 共通スキル・CLIツールのセットアップ
if [ -f "${REPO_ROOT}/scripts/setup-skills.sh" ]; then
    bash "${REPO_ROOT}/scripts/setup-skills.sh"
fi

echo "Dev Container post-create setup finished."
