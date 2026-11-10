# Bitbucket Cloud REST API v2 Cheatsheet

Base URL: `https://api.bitbucket.org/2.0`

---

## 1. 認証 (Authentication)

### Bearer Token
```bash
AUTH_HEADER="Authorization: Bearer <TOKEN>"
curl -H "$AUTH_HEADER" https://api.bitbucket.org/2.0/user
```

### Basic Auth (App Password)
```bash
curl -u "<username>:<app_password>" https://api.bitbucket.org/2.0/user
```

---

## 2. リポジトリ & ブランチ

### リポジトリ情報取得
```bash
curl -s -H "$AUTH_HEADER" \
  https://api.bitbucket.org/2.0/repositories/{workspace}/{repo_slug}
```

### ブランチ一覧
```bash
curl -s -H "$AUTH_HEADER" \
  https://api.bitbucket.org/2.0/repositories/{workspace}/{repo_slug}/refs/branches
```

### ブランチ新規作成
```bash
curl -s -X POST -H "$AUTH_HEADER" -H "Content-Type: application/json" \
  https://api.bitbucket.org/2.0/repositories/{workspace}/{repo_slug}/refs/branches \
  -d '{
    "name": "feature/my-new-feature",
    "target": {
      "hash": "main"
    }
  }'
```

---

## 3. プルリクエスト (Pull Requests)

### PR 一覧 (OPEN)
```bash
curl -s -H "$AUTH_HEADER" \
  "https://api.bitbucket.org/2.0/repositories/{workspace}/{repo_slug}/pullrequests?state=OPEN&pagelen=20"
```

### PR 詳細取得
```bash
curl -s -H "$AUTH_HEADER" \
  https://api.bitbucket.org/2.0/repositories/{workspace}/{repo_slug}/pullrequests/{pr_id}
```

### PR 差分 (Diff) 取得
```bash
curl -s -L -H "$AUTH_HEADER" \
  https://api.bitbucket.org/2.0/repositories/{workspace}/{repo_slug}/pullrequests/{pr_id}/diff
```

### PR 新規作成
```bash
curl -s -X POST -H "$AUTH_HEADER" -H "Content-Type: application/json" \
  https://api.bitbucket.org/2.0/repositories/{workspace}/{repo_slug}/pullrequests \
  -d '{
    "title": "PR タイトル",
    "description": "PR の説明文マークダウン",
    "source": {
      "branch": {
        "name": "feature/branch-name"
      }
    },
    "destination": {
      "branch": {
        "name": "main"
      }
    },
    "close_source_branch": true
  }'
```

### PR マージ
```bash
curl -s -X POST -H "$AUTH_HEADER" -H "Content-Type: application/json" \
  https://api.bitbucket.org/2.0/repositories/{workspace}/{repo_slug}/pullrequests/{pr_id}/merge \
  -d '{
    "message": "Merged PR #{pr_id}",
    "close_source_branch": true,
    "merge_strategy": "merge_commit"
  }'
```
> マージ戦略 (`merge_strategy`): `merge_commit`, `squash`, `fast_forward`

### PR 承認 (Approve)
```bash
curl -s -X POST -H "$AUTH_HEADER" \
  https://api.bitbucket.org/2.0/repositories/{workspace}/{repo_slug}/pullrequests/{pr_id}/approve
```

### PR 却下 (Decline)
```bash
curl -s -X POST -H "$AUTH_HEADER" \
  https://api.bitbucket.org/2.0/repositories/{workspace}/{repo_slug}/pullrequests/{pr_id}/decline
```

### コメント一覧取得
```bash
curl -s -H "$AUTH_HEADER" \
  https://api.bitbucket.org/2.0/repositories/{workspace}/{repo_slug}/pullrequests/{pr_id}/comments
```

### コメント投稿
```bash
curl -s -X POST -H "$AUTH_HEADER" -H "Content-Type: application/json" \
  https://api.bitbucket.org/2.0/repositories/{workspace}/{repo_slug}/pullrequests/{pr_id}/comments \
  -d '{
    "content": {
      "raw": "コメント本文（マークダウン対応）"
    }
  }'
```

---

## 4. パイプライン (Bitbucket Pipelines)

### パイプライン一覧取得
```bash
curl -s -H "$AUTH_HEADER" \
  "https://api.bitbucket.org/2.0/repositories/{workspace}/{repo_slug}/pipelines/?sort=-created_on&pagelen=10"
```

### パイプライン実行トリガー
```bash
curl -s -X POST -H "$AUTH_HEADER" -H "Content-Type: application/json" \
  https://api.bitbucket.org/2.0/repositories/{workspace}/{repo_slug}/pipelines/ \
  -d '{
    "target": {
      "ref_type": "branch",
      "type": "pipeline_ref_target",
      "ref_name": "main"
    }
  }'
```

### パイプライン状態取得
```bash
curl -s -H "$AUTH_HEADER" \
  https://api.bitbucket.org/2.0/repositories/{workspace}/{repo_slug}/pipelines/{pipeline_uuid}
```

---

## 5. コミット & ビルドステータス

### コミット一覧
```bash
curl -s -H "$AUTH_HEADER" \
  "https://api.bitbucket.org/2.0/repositories/{workspace}/{repo_slug}/commits?pagelen=15"
```

### コミットのビルドステータス確認
```bash
curl -s -H "$AUTH_HEADER" \
  https://api.bitbucket.org/2.0/repositories/{workspace}/{repo_slug}/commit/{commit_hash}/statuses
```
