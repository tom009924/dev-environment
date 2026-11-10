---
name: bitbucket
description: >-
  Operate Bitbucket Cloud via Atlassian REST API. Use this skill when the user asks to manage, query, or interact with Bitbucket Cloud repositories, pull requests (create, list, diff, review, merge, comment), branches, pipelines, or commit statuses. Supports both CLI helper (scripts/bb.js) and direct curl/REST API calls.
---

# Bitbucket Cloud API Operation Skill

このスキルは、Atlassian Bitbucket Cloud REST API (v2) を使用して、リポジトリ、プルリクエスト (PR)、ブランチ、パイプライン (CI/CD)、コミットを操作・確認するためのガイドです。

リポジトリ内の `scripts/bb.js` CLI ツール、または `curl` による直接 API 呼び出しのいずれでも操作が可能です。

---

## 1. 認証と設定

### 認証方式の優先順位
1. **Git Remote からの自動検出 (ゼロ設定)**:
   現在の作業ディレクトリが Bitbucket の Git リポジトリで、リモート URL にトークンまたは認証情報が含まれている場合（例: `https://x-token-auth:<TOKEN>@bitbucket.org/...`）、自動的に検出・使用されます。ワークスペース名やリポジトリ名も自動判定されます。
2. **環境変数**:
   - `BITBUCKET_TOKEN` (Repository Access Token / Workspace Access Token / OAuth 2.0 Bearer Token)
   - または `BITBUCKET_USERNAME` と `BITBUCKET_APP_PASSWORD` (App Password: `Basic base64(user:password)`)
3. **CLI オプション**:
   - `--token <token>`
   - `--user <username> --password <app-password>`
   - `--workspace <workspace-slug> --repo <repo-slug>`

> [!NOTE]
> エージェントがターミナルで Bitbucket API を呼び出す際は、ネットワークアクセスが必要なため `BypassSandbox: true` でコマンドを実行してください。

---

## 2. CLI ヘルパー (`scripts/bb.js`) の使い方

Node.js 標準の `fetch` を使用しており、外部依存パッケージなしで動作します。

### 基本コマンド例

```bash
# スクリプトの相対パス (例: カレントディレクトリから)
BB="./.agents/skills/bitbucket/scripts/bb.js"
# またはグローバルパス
# BB="~/.gemini/config/skills/bitbucket/scripts/bb.js"

# 1. リポジトリ情報の確認
node $BB repo info

# 2. プルリクエスト (PR) の一覧取得 (OPEN)
node $BB pr list
# マージ済みや却下されたPR
node $BB pr list --state MERGED

# 3. PR の詳細情報
node $BB pr get <pr-id>

# 4. PR の差分 (diff) 表示
node $BB pr diff <pr-id>

# 5. PR の作成
node $BB pr create --title "PRタイトル" --source "feature/branch-name" --dest "main" --desc "PRの説明文" --close-source

# 6. PR へのコメント一覧取得
node $BB pr comments <pr-id>

# 7. PR へのコメント投稿
node $BB pr comment <pr-id> --message "レビューコメント本文"

# 8. PR の承認 (Approve)
node $BB pr approve <pr-id>

# 9. PR のマージ
node $BB pr merge <pr-id> --message "Merge PR #..." --close-source

# 10. PR の却下 (Decline)
node $BB pr decline <pr-id>

# 11. ブランチ一覧と新規作成
node $BB branch list
node $BB branch create feature/new-feature main

# 12. パイプライン (CI/CD) の一覧とトリガー
node $BB pipeline list
node $BB pipeline get <pipeline-uuid>
node $BB pipeline trigger main

# 13. コミット履歴とビルドステータス
node $BB commit list
node $BB commit statuses <commit-hash>

# 14. 汎用 API エンドポイント呼び出し (GET / POST / PUT / DELETE)
node $BB api GET /repositories/{workspace}/{repo}/pullrequests
node $BB api POST /repositories/{workspace}/{repo}/pullrequests/<id>/approve
```

---

## 3. Direct REST API (curl) の使い方

スクリプトを使わず直接 `curl` で実行する場合は、以下のパターンを使用します。

### 認証ヘッダーの準備
- **Bearer Token**: `-H "Authorization: Bearer $BITBUCKET_TOKEN"`
- **App Password**: `-u "$BITBUCKET_USERNAME:$BITBUCKET_APP_PASSWORD"`

### 代表的なエンドポイント一覧

| 操作 | HTTP メソッド | エンドポイント (`https://api.bitbucket.org/2.0`) |
| :--- | :--- | :--- |
| リポジトリ情報 | `GET` | `/repositories/{workspace}/{repo_slug}` |
| ブランチ一覧 | `GET` | `/repositories/{workspace}/{repo_slug}/refs/branches` |
| ブランチ作成 | `POST` | `/repositories/{workspace}/{repo_slug}/refs/branches` |
| PR 一覧 | `GET` | `/repositories/{workspace}/{repo_slug}/pullrequests?state=OPEN` |
| PR 詳細 | `GET` | `/repositories/{workspace}/{repo_slug}/pullrequests/{pr_id}` |
| PR 作成 | `POST` | `/repositories/{workspace}/{repo_slug}/pullrequests` |
| PR 差分 | `GET` | `/repositories/{workspace}/{repo_slug}/pullrequests/{pr_id}/diff` |
| PR マージ | `POST` | `/repositories/{workspace}/{repo_slug}/pullrequests/{pr_id}/merge` |
| PR 承認 | `POST` | `/repositories/{workspace}/{repo_slug}/pullrequests/{pr_id}/approve` |
| PR コメント一覧 | `GET` | `/repositories/{workspace}/{repo_slug}/pullrequests/{pr_id}/comments` |
| PR コメント投稿 | `POST` | `/repositories/{workspace}/{repo_slug}/pullrequests/{pr_id}/comments` |
| パイプライン一覧 | `GET` | `/repositories/{workspace}/{repo_slug}/pipelines/?sort=-created_on` |
| パイプライン実行 | `POST` | `/repositories/{workspace}/{repo_slug}/pipelines/` |

詳細なリクエストボディの仕様やペイロード例は [api-cheatsheet.md](./references/api-cheatsheet.md) を参照してください。

---

## 4. エラー対応とトラブルシューティング

- **401 Unauthorized**:
  - トークンの期限切れ、またはリポジトリのスコープ不足（`repository`, `pullrequest`, `pipeline` 権限が必要）。
  - App Password を使う場合は、アカウント設定で必要なパーミッション（Repositories: Read/Write, Pull requests: Read/Write）が付与されているか確認してください。
- **403 Forbidden**:
  - リポジトリのアクセス権限がない、またはブランチの制限（Branch permissions）により直接 push / merge が制限されている。
- **404 Not Found**:
  - 指定された `{workspace}` または `{repo_slug}` が存在しないか、権限がないため非公開リポジトリが見えていない。
- **ネットワークエラー (EAI_AGAIN など)**:
  - Sandboxed コマンド実行環境では外部ネットワークへのアクセスが制限されています。`BypassSandbox: true` でコマンドを実行してください。
