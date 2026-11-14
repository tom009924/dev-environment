#!/usr/bin/env bash
set -euo pipefail

BASE_DIR="${1:-/workspaces}"

for dir in "${BASE_DIR}"/*; do
  [ -d "${dir}/.git" ] || [ -f "${dir}/.git" ] || continue
  status="$(git -C "${dir}" status --porcelain 2>/dev/null || true)"
  if [ -n "${status}" ]; then
    branch="$(git -C "${dir}" rev-parse --abbrev-ref HEAD 2>/dev/null || echo "unknown")"
    default_ref="$(git -C "${dir}" symbolic-ref refs/remotes/origin/HEAD 2>/dev/null || echo "unknown")"
    remote="$(git -C "${dir}" remote get-url origin 2>/dev/null | sed -E 's#(https?://)[^/@]+@#\1***@#g' || echo "none")"
    echo "=== $(basename "${dir}") ==="
    echo "path: ${dir}"
    echo "branch: ${branch} (default: ${default_ref#refs/remotes/origin/})"
    echo "remote: ${remote}"
    echo "changes:"
    echo "${status}"
    echo ""
  fi
done
