#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"

echo "Running Dev Container post-create setup..."

# 1. .gemini 配下（自動生成された親ディレクトリ・ボリューム含む）の所有権を vscode に合わせる
if [ -d "/home/vscode/.gemini" ]; then
    sudo chown -R vscode:vscode "/home/vscode/.gemini"
fi

# 2. 共通スキル・CLIツールのセットアップ
if [ -f "${REPO_ROOT}/scripts/setup-skills.sh" ]; then
    bash "${REPO_ROOT}/scripts/setup-skills.sh"
fi

echo "Dev Container post-create setup finished."
