---
name: pr-local-diff
description: Detect uncommitted local changes across workspace repositories, move them safely into a dedicated /tmp feature worktree if on the default branch, create a Conventional Commit, push, and open a pull request on GitHub or Bitbucket. Use when the user asks to turn existing local diffs into a PR (e.g. "ローカル差分をpr").
---

# Local Diff to Pull Request

Use this skill when the user already has uncommitted local changes (often in a multi-repository `/workspaces` environment or directly on the default branch) and wants to turn them into a pull request quickly and safely.

## Safety rules

- Never commit or push directly to the default branch (`main` / `master`).
- Never force-push (`--force` / `--force-with-lease`).
- Never expose or echo tokens from git remote URLs or credentials.
- Verify that the diff is completely transferred and identical in the `/tmp` feature worktree before restoring the default-branch worktree.
- If multiple repositories have uncommitted diffs, or if a repository contains unrelated/mixed changes, stop and confirm scope with the user before transferring or committing.
- Never remove the `/tmp` worktree until the pushed branch and PR URL are verified.

## Workflow

1. **Scan workspace repositories for local diffs**
   Run the helper script to find all repositories under `/workspaces` with uncommitted changes:

   ```bash
   bash ~/.gemini/config/skills/pr-local-diff/scripts/scan-diffs.sh /workspaces
   ```

   If no repository has diffs, inform the user and stop. If multiple repositories have diffs, ask the user which repository (or repositories) to include.

2. **Inspect the diff and prepare a feature branch**
   Inspect `git -C <repo> diff` and `git -C <repo> status --short` to determine a concise Conventional Commit message and short branch name (e.g., `fix/...`, `feat/...`, `chore/...`).

   Fetch the latest default branch:

   ```bash
   git -C <repo> fetch origin <default-branch>
   ```

3. **Isolate changes into a `/tmp` feature worktree**
   - **If changes are on the default branch**:
     Because the user explicitly requested a PR for the local diff, transfer the scoped changes to a clean `/tmp` worktree:
     1. Create a new worktree from `origin/<default-branch>`:
        ```bash
        git -C <repo> worktree add -b <branch-name> /tmp/<repo-name>-<short-id> origin/<default-branch>
        ```
     2. Transfer tracked diffs via `git diff` + `git apply` (or copy modified files), and copy any intended untracked files. Handle deleted files with `rm` in the worktree.
     3. Verify `git -C /tmp/<repo-name>-<short-id> status` and `git -C /tmp/<repo-name>-<short-id> diff` match the intended changes.
     4. Only after verification, restore the default-branch worktree for the transferred files (`git -C <repo> checkout -- <files>` and remove transferred untracked files if requested).
   - **If changes are already on a feature branch**:
     Commit and push from the current feature branch (or create a `/tmp` worktree if needed).

4. **Commit and push**
   In the feature worktree, stage only the intended files, inspect `git diff --cached`, and create a Conventional Commit:

   ```bash
   git -C <worktree> add <files>
   git -C <worktree> commit -m "<type>(<scope>): <description>"
   git -C <worktree> push -u origin <branch-name>
   ```

5. **Create and verify the Pull Request**
   - **GitHub (`gh`)**:
     Check existing PRs first (`gh pr list --head <branch-name>`). If `gh` is not authenticated (exit code 4), sync from the Dev Container credential helper non-interactively:
     ```bash
     printf "protocol=https\nhost=github.com\n\n" | git credential fill | sed -n 's/^password=//p' | gh auth login --with-token
     ```
     Create and verify the PR:
     ```bash
     gh pr create --base <default-branch> --head <branch-name> --title "<title>" --body "<summary>"
     gh pr view --json url,state,headRefName,baseRefName
     ```
   - **Bitbucket (`bb`)**:
     ```bash
     bb pr create --title "<title>" --source <branch-name> --dest <default-branch> --description "<summary>"
     ```

6. **Clean up**
   After confirming the PR URL and state, remove only the temporary `/tmp` worktree (keep the remote/local branch):

   ```bash
   git -C <repo> worktree remove <worktree>
   ```
