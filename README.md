# Cloud-Native Multi-App Dev Container Workspace

複数アプリケーション（Kotlin/Java サービス、API、CLI、フロントエンド等）を並行してクローン・開発するための共通 Dev Container 開発環境です。

特定のアプリケーションロジックや個別ミドルウェアに依存せず、独立したランタイム基盤として機能します。

---

## 🏗️ アーキテクチャ

```text
ホストマシン（例: ~/Projects）
├── 📦 dev-environment (本リポジトリ: 開発環境定義)
│   └── .devcontainer/ (Java 21, Kotlin, Node, Docker-in-Docker, 各種ツール)
│
├── 📦 todo-api (個別のアプリケーション 1)
│   ├── src/
│   ├── build.gradle.kts
│   └── docker-compose.yml (Spanner / PubSub emulator 等の専用ミドルウェア)
│
└── 📦 another-app (個別のアプリケーション 2)
    ├── ...
    └── docker-compose.yml (PostgreSQL / Redis 等の専用ミドルウェア)
```

本開発環境の Dev Container を起動すると、ホストの親ディレクトリ全体がコンテナの `/workspaces` にマウントされます。これにより、コンテナ内から各アプリケーションリポジトリを自由にクローン・編集・Git操作できます。

---

## 🚀 クイックスタート

### 1. ホストマシンで本リポジトリを開く
```bash
git clone https://github.com/tom009924/dev-environment.git
cd dev-environment
code .
```

### 2. Dev Container で開く
VS Code のコマンドパレット（`Cmd+Shift+P` または `Ctrl+Shift+P`）を開き、  
**`Dev Containers: Reopen in Container`** を選択します。

### 3. アプリケーションリポジトリをクローンする
コンテナ起動後、ターミナルで `/workspaces` に移動し、開発したいリポジトリをクローンします：

```bash
cd /workspaces

# 例: Todo API をクローン
git clone https://github.com/tom009924/sandbox.git todo-api

# 例: 別のアプリケーションをクローン
git clone https://github.com/tom009924/<another-repo>.git another-app
```

### 4. アプリケーションごとのミドルウェアを起動する
Docker-in-Docker が標準搭載されているため、各アプリケーションが必要とするミドルウェア（データベース、エミュレータ等）は**アプリケーションのディレクトリ配下で独立して起動**できます：

```bash
# Todo API の Spanner / PubSub Emulator を起動する場合
cd /workspaces/todo-api
docker compose up -d

# 別のアプリのコンテナを起動する場合
cd /workspaces/another-app
docker compose up -d
```

---

## 🧰 提供ランタイム・プリインストールツール

| カテゴリ | ツール / バージョン |
| :--- | :--- |
| **Java / JVM** | OpenJDK 21, Kotlin 1.9.24, Gradle 8.10.2 (SDKMAN) |
| **JavaScript / Web** | Node.js 22 LTS, npm (nvm) |
| **コンテナ・インフラ** | Docker CLI, Docker Compose v2 (Docker-in-Docker) |
| **クラウド・CLI** | GitHub CLI (`gh`), git |
| **セキュリティ・品質** | Aqua Security Trivy, Stoplight Spectral CLI |
| **エディタ拡張** | Kotlin, Java Extension Pack, Gradle, Spectral, Trivy, Atlassian (Jira / Bitbucket), Google Antigravity |

---

## 🤖 提供エージェントスキル (Antigravity Skills)

`.agents/skills/` 配下に、リポジトリ横断で利用可能な共通スキルが配置されています：

| スキル | 説明 |
| :--- | :--- |
| **`start-feature-worktree`** | 作業専用の Git feature worktree を作成し、デフォルトブランチの直接変更を防止 |
| **`conventional-commit`** | Conventional Commits 仕様に基づいたコミットメッセージの作成 |
| **`commit-push-pr`** | 変更のプッシュ、GitHub (`gh`) / Bitbucket (`bb.js`) PR の作成、作業用 worktree の自動クリーンアップ |
| **`bitbucket`** | Atlassian Bitbucket Cloud REST API (v2) によるリポジトリ・PR・パイプライン操作 |

AI エージェント向けの共通行動規範および各スキルの詳細仕様は [`AGENTS.md`](AGENTS.md) を参照してください。

