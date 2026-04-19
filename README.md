# chai-lab

チャイ研究特化アプリの設計文書リポジトリです。

v1は、公開レシピサービスやSNSではなく、非公開の個人研究ログとして実装します。実装前の判断では、次の契約文書を優先します。

## 文書一覧

| 文書 | 役割 |
|---|---|
| [docs/pj-policy.md](docs/pj-policy.md) | プロジェクト方針、開発姿勢、ベンダー的判断基準。 |
| [docs/autonomous-project-governance.md](docs/autonomous-project-governance.md) | AI自律判断、AI自己監査、人間確認範囲の最上位運用モデル。 |
| [docs/mvp-scope-contract.md](docs/mvp-scope-contract.md) | v1で実装するもの・しないものの最終スコープ契約。 |
| [docs/app-proposal.md](docs/app-proposal.md) | 企画、コンセプト、市場背景、ロードマップ。 |
| [docs/app-rdd.md](docs/app-rdd.md) | v1要件定義。 |
| [docs/app-lld.md](docs/app-lld.md) | DB、RPC、RLS、画面、運用の詳細設計。 |
| [docs/app-design.md](docs/app-design.md) | UI、レイアウト、デザイントークン。 |
| [docs/tech-stack.md](docs/tech-stack.md) | 採用技術とライブラリ追加ルール。 |
| [docs/db-migration-rls-policy.md](docs/db-migration-rls-policy.md) | migration、RLS、DB変更自己監査の契約。 |
| [docs/supabase-data-access-error-contract.md](docs/supabase-data-access-error-contract.md) | Supabaseデータアクセスとエラー分類。 |
| [docs/screen-acceptance-criteria.md](docs/screen-acceptance-criteria.md) | 画面別受け入れ基準。 |
| [docs/deployment-contract.md](docs/deployment-contract.md) | Cloudflare PagesとNext.js静的出力のデプロイ契約。 |
| [docs/codex-execution-rules.md](docs/codex-execution-rules.md) | Codex / AIエージェントによる実装ルール。 |
| [docs/implementation-plan-v1-revised.md](docs/implementation-plan-v1-revised.md) | v1実装計画の改訂版。 |
| [docs/m0-readiness-gate-reframed.md](docs/m0-readiness-gate-reframed.md) | M0をAI準備完了ゲートとして再定義した最新版。 |
| [docs/m0-open-questions-reframed.md](docs/m0-open-questions-reframed.md) | M0論点Q-01〜Q-10を4分類で再整理した最新版。 |
| [docs/governance-refactor-plan.md](docs/governance-refactor-plan.md) | 旧ガバナンス文書から新モデルへの改訂計画。 |

## 実装前の原則

- 主役は完成レシピではなく、試行ログです。
- v1では公開、共有、SNS、写真、AI、比較画面、系譜グラフ、カスタム項目、オフライン自動同期を実装しません。
- 試行本体と材料行の書き込みは、定義済みRPCに集約します。
- DB、RLS、UI、受け入れ基準がそろわない機能は実装しません。
