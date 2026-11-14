#!/usr/bin/env bash
set -euo pipefail

DEV_ENV_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

echo "Setting up shared skills and CLI tools from ${DEV_ENV_DIR}..."

# 1. Antigravity グローバルスキルのシンボリックリンク (~/.gemini/config/skills)
mkdir -p "${HOME}/.gemini/config"
ln -sfn "${DEV_ENV_DIR}/.agents/skills" "${HOME}/.gemini/config/skills"
echo " Linked Antigravity global skills: ~/.gemini/config/skills -> ${DEV_ENV_DIR}/.agents/skills"

# 2. GitHub Copilot グローバルスキルのシンボリックリンク (~/.copilot/skills)
mkdir -p "${HOME}/.copilot"
ln -sfn "${DEV_ENV_DIR}/.agents/skills" "${HOME}/.copilot/skills"
echo " Linked GitHub Copilot global skills: ~/.copilot/skills -> ${DEV_ENV_DIR}/.agents/skills"

# 3. bb (Bitbucket CLI ヘルパー) を ~/.local/bin/bb にリンク
mkdir -p "${HOME}/.local/bin"
chmod +x "${DEV_ENV_DIR}/.agents/skills/bitbucket/scripts/bb.js"
ln -sfn "${DEV_ENV_DIR}/.agents/skills/bitbucket/scripts/bb.js" "${HOME}/.local/bin/bb"
echo " Linked Bitbucket CLI helper: ~/.local/bin/bb -> bb.js"

echo " dev-environment skills setup completed successfully."
