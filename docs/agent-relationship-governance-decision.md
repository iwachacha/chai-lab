# Agent Relationship Governance Decision

**作成日:** 2026-04-19

## 1. 結論

採用構成は **AGENTS + 方針文書 + workflow + rules** とする。SKILLは現時点では運用正本にしない。

AIエージェントと開発者の入口は、リポジトリ固有の `AGENTS.md` とする。`AGENTS.md` は本文ルールを重複させず、採用済み文書への導線だけを持つ。

最小十分構成は、入口と次の3層である。

| 層 | 採用文書 | 役割 |
|---|---|---|
| 入口 | `AGENTS.md` | AIエージェントと開発者が最初に読む正本入口。 |
| 方針文書 | `docs/agent-relationship-governance.md` | AIと依頼者の関係、判断権限、人間確認範囲、AI自己監査ゲートを定義する。 |
| workflow | `docs/agent-workflow.md` | 実装前、危険変更前、停止時、反論時、エスカレーション時、記録時の手順を定義する。 |
| rules | `docs/codex-execution-rules.md` | Codex実装時に必ず守るルールとして、方針文書とworkflowを参照させる。 |

この構成により、依頼者を技術承認者にせず、AIが技術責任を持って判断する。一方で、DB/RLS/RPCの危険領域ではAI自己監査を手順として必ず通す。

## 2. 現状調査

関係性と判断権限は、既に次の文書に分散している。

| 文書 | 書かれている内容 | 評価 |
|---|---|---|
| `docs/agent-relationship-governance.md` | 役割、AI自律判断、人間確認範囲、反論義務、AI自己監査、停止条件、記録方針 | 方針文書として必要。 |
| `docs/codex-execution-rules.md` | 実装禁止事項、DB変更ルール、テスト、文書更新、完了報告 | rulesとして必要。workflow参照が必要。 |
| `docs/db-migration-rls-policy.md` | DB/RLS/RPC危険領域の監査条件 | 危険領域の専門契約として必要。 |
| `docs/implementation-plan-v1.md` | M0からM8の進行条件、AI自己監査、停止条件 | 実装計画として必要。 |
| `docs/m0-readiness-gate.md` | M1へ進む準備完了条件 | M0の局所ゲートとして必要。 |
| `docs/m0-decision-matrix.md` | Q-01からQ-10の決定分類 | M0論点の決定表として必要。 |

不足していたのは、方針を日々の実装手順へ落とすworkflowである。方針文書だけでは、危険変更前に何を記録し、どの条件で局所停止し、依頼者へどう質問するかが実装時に揺れる。

## 3. 形式比較

| 候補 | 評価 | 採否 |
|---|---|---|
| 通常ドキュメントだけ | 役割や原則の説明には十分。ただし危険変更前の手順としては弱い。 | 不採用 |
| ルール文書だけ | 実装時に強く効くが、関係性や判断権限の背景まで抱えると肥大化する。 | 不採用 |
| workflowだけ | DB/RLS/RPCには効くが、依頼者とAIの関係性という上位原則を表現しきれない。 | 不採用 |
| SKILL | セッションをまたいだ再利用やtarget agent互換には使えるが、この内容はリポジトリ固有で、正本化すると保守単位が増える。 | 正本としては不採用 |
| 方針文書 + workflow + rules | 原則、手順、実装時の強制参照を分けられる。危険領域にも効き、過剰な仕組み化を避けられる。 | 採用 |

## 4. SKILLを正本にしない理由

`/SKILL.md` は現時点では運用正本にしない。理由は次のとおりである。

- 内容がチャイ研究アプリv1の契約、M0分類、DB/RLS/RPC制約に強く依存している。
- 他リポジトリでそのまま再利用できる単位ではない。
- SKILL化しても、リポジトリ内の設計文書や実装計画との同期コストが増える。
- 危険領域で必要なのは一般スキルではなく、このリポジトリの契約文書に基づくworkflowである。
- `AGENTS.md`、`docs/agent-workflow.md`、`docs/codex-execution-rules.md` で、実装時の参照性と運用上の強さは足りる。

将来、target agent互換性のために必要になった場合は、本文ルールを重複させない薄い導線として `/SKILL.md` を追加してよい。その場合も正本は `AGENTS.md` と `docs/INDEX.md` から参照される文書群である。

## 5. 採用構成の理由

### 方針文書

依頼者とAIの関係、判断権限、人間確認範囲は、プロジェクト全体の前提である。これは通常の方針文書として明文化するのが自然である。

採用文書: `docs/agent-relationship-governance.md`

### workflow

危険領域では、抽象方針だけでは事故を防ぎきれない。migration、RLS、grant/revoke、`security definer`、RPC、認可境界Data Accessでは、開始条件、手順、完了条件、局所停止条件、証跡が必要である。

採用文書: `docs/agent-workflow.md`

### rules

Codexが実装時に必ず参照する入口としてrules文書が必要である。ただし、rulesへ全詳細を重複させると保守が重くなるため、`docs/codex-execution-rules.md` から方針文書とworkflowを参照する構造にする。

改訂文書: `docs/codex-execution-rules.md`

## 6. 不採用構成

| 不採用構成 | 理由 |
|---|---|
| 方針文書だけ | 危険変更前の具体手順が弱く、DB/RLS/RPCで運用ブレが残る。 |
| 方針文書 + rulesだけ | 反論、局所停止、エスカレーション、記録の流れがrules内で肥大化する。 |
| workflow + rulesだけ | 依頼者は技術承認者ではないという上位関係性が分散する。 |
| SKILL正本化 | 再利用性よりプロジェクト固有性が高く、保守コストに見合わない。薄い互換導線は必要時だけ許容する。 |

## 7. 人間確認が本当に必要な論点数

現時点で具体的に人間確認が必要な論点は2件である。

| 論点 | 停止範囲 |
|---|---|
| Q-01: 実Supabase project、Production URL、secret、Preview/Production接続 | 実環境接続、Preview E2E、本番deploy |
| Q-08: Supabase backup/export、Production deploy前の運用確認 | M8-03、M8-04、本番deploy |

通常の技術判断、DB/RLS/RPC設計、AppError分類、テスト方式、記録方式、作業分割はAIが自律判断する。

## 8. 今後の更新方針

- 関係性や判断権限を変える場合は、`docs/agent-relationship-governance.md` を更新する。
- 作業手順、停止条件、証跡項目を変える場合は、`docs/agent-workflow.md` を更新する。
- 実装時の禁止事項や必須参照を変える場合は、`docs/codex-execution-rules.md` を更新する。
- SKILL正本化は、複数リポジトリで同じ運用を再利用する必要が出るまで行わない。target agent互換の薄い導線は必要時だけ追加する。
