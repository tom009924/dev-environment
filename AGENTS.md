# Agent Guidelines & Common Skills (Dev Environment)

本リポジトリ（`dev-environment`）および本共有開発環境上で動作する AI コーディングエージェント（Antigravity, GitHub Copilot 等）向けの共通設定・ガイドラインです。

## 開発環境のアーキテクチャ
- **マルチリポジトリ構成**: ホストマシンのプロジェクトディレクトリ全体が `/workspaces` にマウントされ、複数のアプリケーションリポジトリ（例: `todo-api`, `dev-environment` 等）を並行して管理・開発します。
- **提供ランタイム**: OpenJDK 21, Kotlin 2.2, Gradle 8.14, Node.js 22 LTS, Docker-in-Docker, GitHub CLI (`gh`), Bitbucket CLI (`bb`)
- **グローバルスキルの自動認識**: Dev Container 起動時に `postCreateCommand` (`scripts/setup-skills.sh`) が実行され、`~/.gemini/config/skills` および `~/.copilot/skills` に自動リンクされます。これにより、`/workspaces` 配下のどの個別アプリケーションリポジトリでエージェントを動かしていても、本共通スキルが常に自動認識・利用可能です。また `~/.local/bin/bb` に Bitbucket CLI ヘルパーが配置され、PATH 経由で即座に実行できます。

## 共通開発ルール
1. **Worktree 分離**: コード変更を伴うタスクは、デフォルトブランチ（`main` 等）を直接変更せず、必ず専用の feature worktree（`/tmp/<worktree-name>` 等）を作成して実施すること（[`start-feature-worktree`](.agents/skills/start-feature-worktree/SKILL.md) 参照）。
2. **Conventional Commits**: コミットメッセージは Conventional Commits 仕様に準拠すること（[`conventional-commit`](.agents/skills/conventional-commit/SKILL.md) 参照）。
3. **PR 作成とクリーンアップ**: 作業完了後はブランチをプッシュし、ホスティングプラットフォーム（GitHub または Bitbucket）に合わせて PR を作成した上で、作業用 worktree をクリーンアップすること（[`commit-push-pr`](.agents/skills/commit-push-pr/SKILL.md) 参照）。
4. **安全規則**:
   - デフォルトブランチへの直接プッシュや強制プッシュ（`--force`）を行わない。
   - 機密情報や認証情報をコミットや PR に含めない。
   - PR 検証完了前に作業用 worktree を削除しない。

## 利用可能な共通スキル (`.agents/skills/`)
- [**`start-feature-worktree`**](.agents/skills/start-feature-worktree/SKILL.md): 作業専用の Git feature worktree を作成し、デフォルトブランチの直接変更を防止
- [**`conventional-commit`**](.agents/skills/conventional-commit/SKILL.md): Conventional Commits 仕様に基づいたコミットメッセージの作成
- [**`commit-push-pr`**](.agents/skills/commit-push-pr/SKILL.md): GitHub (`gh`) および Bitbucket (`bb.js`) に対応したプッシュ・PR 作成・クリーンアップ
- [**`bitbucket`**](.agents/skills/bitbucket/SKILL.md): Bitbucket Cloud REST API (v2) の CLI / API 操作
