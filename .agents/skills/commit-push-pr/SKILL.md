---
name: commit-push-pr
description: Commit changes from a feature worktree, push the branch, open a pull request, then remove the worktree.
---

# Commit, Push, and Open a Pull Request

Use this skill to finish repository changes made in a dedicated feature worktree. Create a Conventional Commit, push the feature branch, open and verify a pull request, and remove the worktree only after successful PR verification.

## Safety rules

- Never commit or push changes directly to the default branch.
- Never reset, amend, rebase, or force-push the default branch or an existing feature branch.
- Preserve pre-existing worktree changes. Stage and commit only files in scope for the user's request.
- Do not merge the pull request or change branch-protection/ruleset settings.
- Do not include secrets, credentials, or unrelated files in commits or pull-request text.
- If the requested changes exist only as uncommitted changes in the default-branch worktree, do not discard, stash, or transfer them implicitly. Ask the user how to proceed.
- Never remove the worktree before the pushed branch and pull request have both been verified. Preserve it if any delivery step fails.
- Remove only the dedicated task worktree after successful PR verification; do not delete its local or remote branch.

## Workflow

1. Inspect the repository root, remotes, current branch, default branch, status, and staged/unstaged diffs. Determine the default branch from `refs/remotes/origin/HEAD`; if it cannot be identified, ask the user rather than assuming a branch name.
2. Fetch the default branch. If fetching fails, stop before creating a branch or worktree and report the error.
3. Start with the dedicated feature worktree created by `start-feature-worktree`. If it has not been created, follow that skill before editing. Confirm the requested changes are in this worktree and that it contains no conflicting pre-existing changes. If the requested edits exist only in the default-branch worktree, stop and ask the user how to proceed instead of transferring them.
4. Implement or prepare only the requested changes in the feature worktree. Run relevant validation and report environmental failures accurately.
5. Review the complete status and diff. Stage only intended files, inspect the staged diff, and create a Conventional Commit. Include any repository-required commit trailers. Verify the resulting commit; do not amend it.
6. Push only the feature branch, without force:

   ```bash
   git push -u origin <branch-name>
   ```

   If the push fails, preserve the local commit and report the exact retry command. Do not use force-push to work around a rejection.
7. Before opening a pull request, check whether one already exists for the branch. If it does, verify its URL and branch direction and do not create a duplicate.
8. Create a pull request targeting the detected default branch according to the remote hosting platform:

   - **GitHub repositories**:
     Use GitHub CLI (`gh`). If `gh` is not yet logged in (`exit code 4`), sync it non-interactively from the Dev Container's Git credential helper (outside the sandbox so `/home/vscode/.vscode-server` is accessible, and with `GIT_TERMINAL_PROMPT=0` so it never blocks on stdin):

     ```bash
     printf "protocol=https\nhost=github.com\n\n" | git credential fill | sed -n 's/^password=//p' | gh auth login --with-token
     ```

     Provide a concise title and a body summarizing the change and listing the checks run. Do not claim checks passed unless they did:

     ```bash
     gh pr create --base <default-branch> --head <branch-name> --title "<title>" --body "<summary and checks>"
     ```

   - **Bitbucket Cloud repositories**:
     Use the `bb` CLI helper command (or invoke `bb.js` directly):

     ```bash
     bb pr create --title "<title>" --source <branch-name> --dest <default-branch> --description "<summary and checks>"
     ```

     Or fallback:

     ```bash
     node "${DEV_ENV_DIR:-/workspaces/dev-environment}/.agents/skills/bitbucket/scripts/bb.js" pr create --title "<title>" --source <branch-name> --dest <default-branch> --description "<summary and checks>"
     ```

   If pull-request creation is unavailable or authentication fails, preserve the pushed branch and worktree and report the blocker and exact retry command to the user.

9. Verify the pull-request URL, state, head/base branches, and that the worktree is clean and its commit is pushed. Then remove only the dedicated worktree:

   ```bash
   git -C <repo-root> worktree remove <worktree-path>
   ```

   If worktree removal encounters uncommitted changes or errors, do not force-remove (`--force`). Inspect the status, resolve or preserve the files safely, and report the state to the user.
