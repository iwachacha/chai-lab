# AGENTS.md

このファイルは、このリポジトリで作業するAIエージェントと開発者の正本入口です。詳細な判断本文は `docs/` に集約し、ここには導線だけを置きます。プロジェクト概要だけを確認したい場合は `README.md` を参照します。

## 適用範囲

- このファイルはリポジトリ全体に適用します。
- 現行の実装基準はv1です。v1固有の範囲は `docs/mvp-scope-contract.md`、詳細計画は `docs/implementation-plan-v1.md`、M0固有判断は `docs/m0-readiness-gate.md` と `docs/m0-decision-matrix.md` に従います。
- 文書分類は `docs/INDEX.md` を正とします。
- 将来フェーズへ進む場合も、AI判断、workflow、記録方式は継続利用し、フェーズ固有のスコープ文書だけを更新します。

## 最初に読む文書

1. `docs/INDEX.md`
2. `docs/agent-relationship-governance.md`
3. `docs/agent-workflow.md`
4. `docs/codex-execution-rules.md`
5. 作業対象に応じた現行フェーズ契約文書

作業対象に応じた契約文書は、`docs/codex-execution-rules.md` の「実装前に読む文書」を正とします。

## SKILLの扱い

このリポジトリでは、現時点で `/SKILL.md` を運用正本にしません。採用構成は `AGENTS.md`、方針文書、workflow、rulesです。理由と見直し条件は `docs/agent-relationship-governance-decision.md` に従います。

将来、特定のtarget agentとの互換性のために必要な場合は、本文ルールを重複させない薄い導線として `/SKILL.md` を追加して構いません。その場合も正本は `AGENTS.md` と `docs/INDEX.md` から参照される文書群です。

## 作業手順

- まず変更が現行フェーズスコープ内か確認します。
- 影響レイヤーを UI、Data Access、DB/RLS/RPC、Auth、Deploy、Docs、Test のいずれかに分類します。
- 危険変更に該当する場合は、`docs/agent-workflow.md` の危険変更workflowを通します。
- PRがある場合はPR本文を正式記録にします。PR前またはAI単独作業では、`docs/templates/worklog.md` の項目で作業記録を残します。

## 変更後の確認

運用文書、入口、template、workflow、CI、scriptsを変更した場合は、最低限次を実行します。

```bash
npm run check:docs
```

アプリ実装が追加された後は、対象変更に応じて `lint`、`typecheck`、`test`、`test:e2e`、`build` 相当のscriptsも実行します。未実施の確認は、理由、代替確認、残リスクを作業記録またはPR本文へ残します。
