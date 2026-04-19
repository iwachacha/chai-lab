# chai-lab

チャイ研究特化アプリの設計文書リポジトリです。

v1は、公開レシピサービスやSNSではなく、非公開の個人研究ログとして実装します。実装前の判断では、次の契約文書を優先します。

## AI / 開発者入口

AIエージェントまたは開発者は、最初に [AGENTS.md](AGENTS.md) を読み、作業対象に応じて参照文書を絞ります。SKILLは現時点では作りません。理由と見直し条件は [docs/agent-relationship-governance-decision.md](docs/agent-relationship-governance-decision.md) に従います。

作業記録が必要な場合は [docs/templates/worklog.md](docs/templates/worklog.md) の項目を使います。PRでは `.github/pull_request_template.md` が同じ導線を示します。

運用文書の参照切れや入口欠落を確認するときは、次を実行します。

```bash
npm run check:docs
```

## 文書一覧

| 文書 | 役割 |
|---|---|
| [AGENTS.md](AGENTS.md) | AIエージェントと開発者が最初に読む入口。 |
| [docs/pj-policy.md](docs/pj-policy.md) | プロジェクト方針、開発姿勢、ベンダー的判断基準。 |
| [docs/agent-relationship-governance.md](docs/agent-relationship-governance.md) | AI自律判断、AI自己監査、人間確認範囲の最上位運用モデル。 |
| [docs/agent-workflow.md](docs/agent-workflow.md) | 実装前、危険変更前、停止時、エスカレーション時のAI作業手順。 |
| [docs/agent-relationship-governance-decision.md](docs/agent-relationship-governance-decision.md) | 関係性ガバナンスをどの形式で正式化するかの判断記録。 |
| [docs/templates/worklog.md](docs/templates/worklog.md) | PR前またはAI単独作業で使う作業記録テンプレート。 |
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
| [docs/implementation-plan-v1.md](docs/implementation-plan-v1.md) | v1実装計画。 |
| [docs/m0-readiness-gate.md](docs/m0-readiness-gate.md) | M0のAI準備完了ゲート。 |
| [docs/m0-decision-matrix.md](docs/m0-decision-matrix.md) | M0論点Q-01〜Q-10の決定表。 |

## 実装前の原則

- 主役は完成レシピではなく、試行ログです。
- v1では公開、共有、SNS、写真、AI、比較画面、系譜グラフ、カスタム項目、オフライン自動同期を実装しません。
- 試行本体と材料行の書き込みは、定義済みRPCに集約します。
- DB、RLS、UI、受け入れ基準がそろわない機能は実装しません。
