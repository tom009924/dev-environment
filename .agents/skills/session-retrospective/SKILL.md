---
name: session-retrospective
description: Review the current or past agent session to identify friction, repeated manual steps, and missing context, then package reusable improvements as Antigravity skills, rules, or scripts and deliver them via PR. Use when the user asks for a session retrospective or to turn session learnings into a skill (e.g. "セッションを振り返って", "振り返りスキル").
---

# Session Retrospective & Efficiency Improvement

Use this skill to analyze how a session went, pinpoint bottlenecks or repeated work, and turn those findings into durable customizations (skills, rules, or helper scripts).

## Workflow

1. **Collect session evidence**
   Review the current conversation history (and, if needed, the compact transcript at `<appDataDir>/brain/<conversation-id>/.system_generated/logs/transcript.jsonl`) to identify:
   - **Repeated multi-step workflows**: Command sequences or git/PR flows executed manually multiple times.
   - **Friction & retries**: Failed commands, missing auth/CLI setup, sandbox/network retries, or unnecessary user round-trips.
   - **Missing context**: Repository structure, conventions, or tool paths that had to be discovered from scratch.

2. **Choose the right customization target**
   Map each finding to the appropriate mechanism:
   - **Skill** (`.agents/skills/<name>/SKILL.md` + optional `scripts/`): Multi-step procedures, runbooks, or repeatable workflows.
   - **Rule** (`AGENTS.md`, `GEMINI.md`, or `.agents/rules/*.md`): Always-on project conventions, directory layouts, or constraints.
   - **Dev Container / Setup script** (`.devcontainer/`, `scripts/`): Missing CLI tools, auth bootstrapping, or environment configuration.

3. **Author the improvement in a feature worktree**
   - Follow `start-feature-worktree` to create a clean `/tmp/<repo>-<branch>` worktree from `origin/<default-branch>` (for shared skills, target `/workspaces/dev-environment/.agents/skills/`).
   - Keep `SKILL.md` focused, concise, and actionable with clear YAML frontmatter (`name` and `description`).
   - Add small, deterministic helper scripts under `scripts/` when shell logic is error-prone or repetitive (e.g., masking tokens, scanning multiple repos).
   - Never embed secrets, tokens, or user-specific credentials.

4. **Validate and deliver**
   - Test any new or modified scripts locally in the worktree.
   - Follow `commit-push-pr` (Conventional Commit, push feature branch, create & verify PR, and remove only the temporary `/tmp` worktree).
   - Summarize the session findings, the created/updated files, and the PR link for the user.
