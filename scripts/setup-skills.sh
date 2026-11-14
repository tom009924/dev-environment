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

# 4. GitHub CLI (gh) の認証同期（未ログイン時のみ、失敗してもセットアップは継続）
if command -v gh >/dev/null 2>&1 && ! gh auth status >/dev/null 2>&1; then
    GH_TOKEN_FROM_GIT="$(printf "protocol=https\nhost=github.com\n\n" | GIT_TERMINAL_PROMPT=0 git credential fill 2>/dev/null | sed -n 's/^password=//p' || true)"
    if [ -n "${GH_TOKEN_FROM_GIT}" ]; then
        if printf "%s\n" "${GH_TOKEN_FROM_GIT}" | gh auth login --with-token >/dev/null 2>&1; then
            echo " Synced GitHub CLI auth from git credential helper."
        fi
    fi
fi

echo " dev-environment skills setup completed successfully."
