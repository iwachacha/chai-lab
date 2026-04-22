# Docs Index

この文書は、既存文書の置き場所を変えずに分類だけを見える化するための索引です。AIエージェントと開発者の正本入口は `../AGENTS.md` です。READMEは概要、判断記録は背景、現行フェーズ契約は具体仕様として扱います。

## 恒久運用文書

PJ全体で継続利用する入口、判断モデル、作業手順、記録方式です。現行フェーズの具体仕様はここへ重複させず、現行フェーズ契約へ寄せます。

| 文書 | 役割 |
|---|---|
| [AGENTS.md](../AGENTS.md) | AIエージェントと開発者の正本入口。 |
| [README.md](../README.md) | プロジェクト概要と主要導線。 |
| [pj-policy.md](pj-policy.md) | プロジェクト方針、開発姿勢、判断基準。 |
| [agent-relationship-governance.md](agent-relationship-governance.md) | AI自律判断、AI自己監査、人間確認範囲の上位モデル。 |
| [agent-workflow.md](agent-workflow.md) | 実装前、危険変更前、停止時、エスカレーション時の作業手順。 |
| [codex-execution-rules.md](codex-execution-rules.md) | Codex / AIエージェントによる実装ルール。 |
| [templates/worklog.md](templates/worklog.md) | PR前またはAI単独作業で使う作業記録テンプレート。確認対象、正本、GitHub反映状況、停止条件を含む。 |
| [pull_request_template.md](../.github/pull_request_template.md) | PR本文を正式記録にするための入口。worklogと同じ証跡項目をPR上で残す。 |

## 現行フェーズ契約

現行フェーズ(v1)の具体スコープ、要件、設計、受け入れ基準です。v1で実装してよいもの、してはならないもの、成立条件はこの分類を正とします。

| 文書 | 役割 |
|---|---|
| [mvp-scope-contract.md](mvp-scope-contract.md) | v1で実装するもの・しないものの最終スコープ契約。 |
| [app-rdd.md](app-rdd.md) | v1要件定義。 |
| [app-lld.md](app-lld.md) | DB、RPC、RLS、画面、運用の詳細設計。 |
| [app-design.md](app-design.md) | UI、レイアウト、デザイントークン。 |
| [tech-stack.md](tech-stack.md) | v1採用技術とライブラリ追加ルール。 |
| [db-migration-rls-policy.md](db-migration-rls-policy.md) | migration、RLS、DB変更自己監査の契約。 |
| [supabase-data-access-error-contract.md](supabase-data-access-error-contract.md) | Supabaseデータアクセスとエラー分類。 |
| [screen-acceptance-criteria.md](screen-acceptance-criteria.md) | 画面別受け入れ基準。 |
| [deployment-contract.md](deployment-contract.md) | Cloudflare Pages、Next.js静的出力、認証リダイレクト、環境変数の契約。 |
| [implementation-plan-v1.md](implementation-plan-v1.md) | v1実装計画。 |
| [m0-readiness-gate.md](m0-readiness-gate.md) | M0からM1へ進むための準備完了ゲート。 |
| [app-proposal.md](app-proposal.md) | 企画、コンセプト、市場背景、ロードマップ。 |

## デザイン参照

UI実装時に参照する視覚的アンカーです。機能仕様やv1スコープを置き換えるものではなく、世界観、余白、情報階層、カード設計、配色、モバイル画面構成の基準として扱います。

| 文書 | 役割 |
|---|---|
| [design-reference/ui/README.md](design-reference/ui/README.md) | UI参考画像群の位置づけ、固定するもの / 固定しないもの、実装時の翻訳ルール。 |

## 判断記録

特定時点の採用理由、比較、不採用理由、ゲート判断を残す文書です。運用正本ではなく、背景確認や見直し時の根拠として読みます。

| 文書 | 役割 |
|---|---|
| [agent-relationship-governance-decision.md](agent-relationship-governance-decision.md) | AI関係性ガバナンスをどの形式で正式化するかの判断記録。 |
| [m0-decision-matrix.md](m0-decision-matrix.md) | M0論点Q-01〜Q-10の決定表。 |

## 参照順

1. `../AGENTS.md` で入口と作業手順を確認する。
2. この索引で文書分類を確認する。
3. 恒久運用文書で作業原則を確認する。
4. 現行フェーズ契約で具体仕様と禁止事項を確認する。
5. 判断記録は、なぜその構成になったかを確認したい場合だけ読む。
