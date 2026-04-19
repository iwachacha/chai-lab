# Worklog: M2 docs consistency alignment

## 対象

- 作業名: M2文書整合修正
- 対象単位: M2 numbering and worklog evidence alignment
- N/Aにした検証観点と理由: なし。今回の対象は文書整合であり、個別DB sliceの検証観点そのものは追加・削除せず、既存定義の整合だけを扱った
- 日付: 2026-04-20
- 変更分類: Docs
- 完了運用分類: 軽微変更
- 分類理由: implementation plan、worklog template、既存worklogの整合修正に限定し、実migration、実DDL、実RLS、実grant/revoke、実helper、実RPC、実Supabase接続、アプリコード変更には触れていないため
- 適用フェーズ / 適用範囲: v1 M2 docs consistency
- 変更対象: `docs/implementation-plan-v1.md`, `docs/templates/worklog.md`, `docs/worklogs/2026-04-20-m2-00-db-change-split-review.md`, `docs/worklogs/2026-04-20-m2-01-verification-evidence-foundation.md`, `docs/worklogs/2026-04-20-m2-doc-consistency-alignment.md`
- 参照したSQL / 手順書 / 証跡ファイル: `docs/implementation-plan-v1.md`, `docs/templates/worklog.md`, `docs/worklogs/2026-04-20-m2-00-db-change-split-review.md`, `docs/worklogs/2026-04-20-m2-01-verification-evidence-foundation.md`
- 危険変更workflow該当: なし
- 人間確認: 不要

## 採用方針

- 採用した方針: implementation planをrepo内の正として維持しつつ、`M2-01 = 検証/証跡土台整理`、`M2-02 = research_lines の最初の end-to-end DB slice` を明文で固定した。あわせて、worklog templateと既存M2 worklogを同じ証跡項目へ揃えた。
- 優先軸: 監査可能性、単純性、継続運用性
- 根拠文書: `docs/implementation-plan-v1.md`, `docs/templates/worklog.md`, `docs/worklogs/2026-04-20-m2-00-db-change-split-review.md`, `docs/worklogs/2026-04-20-m2-01-verification-evidence-foundation.md`, `docs/agent-workflow.md`
- 退けた代替案: worklog側の番号を旧M2-01/02へ戻す案は、M2-01土台整理の実績と衝突するため退けた。新しい工程番号を追加する案は、今回の「整合修正だけ」という範囲を超えるため退けた。

## 変更内容

- 追加: 今回の整合修正内容を残すworklog。
- 更新: implementation planへM2-01/M2-02の番号解釈、M2-02を `research_lines` の最初の end-to-end DB slice と読む文言、M2-02着手前の停止条件を追記。
- 更新: worklog templateの正式項目を `対象単位`、`N/Aにした検証観点と理由`、`参照したSQL / 手順書 / 証跡ファイル` に揃えた。
- 更新: 既存のM2-00/M2-01 worklogへ、templateと一致する証跡項目と残る停止条件を追記した。
- 削除: なし。
- 更新した文書: `docs/implementation-plan-v1.md`, `docs/templates/worklog.md`, `docs/worklogs/2026-04-20-m2-00-db-change-split-review.md`, `docs/worklogs/2026-04-20-m2-01-verification-evidence-foundation.md`, `docs/worklogs/2026-04-20-m2-doc-consistency-alignment.md`

## 検証

| 種別 | 実施内容 | 結果 |
|---|---|---|
| 参照整合 | implementation plan、template、M2-00/M2-01 worklogの番号、項目、停止条件を照合 | 成功 |
| ローカル検証 | `npm run check:docs` | 成功 |
| 動作確認 | `rg -n` で旧解釈の残存、必須証跡項目、actor切替停止条件を確認し、`git diff -- docs/ supabase/` で今回がdocs-only差分に留まることを確認 | 成功 |
| 実装テスト | 対象外。docs-onlyの整合修正 | 対象外 |
| push / CI | 軽微変更のため未実施 | 未実施 |

## 未実施検証

| 未実施項目 | 理由 | 代替確認 | 残リスク | 次に止める条件 |
|---|---|---|---|---|
| 非本番検証方式の実証 | 今回は整合修正のみで、M2-01の未実施事項を解消する作業ではないため | M2-01 worklogとimplementation planへ停止条件を残した | actor切替方法未固定のままM2-02へ進む恐れ | M2-02着手時にactor A/B/anonの切替方法が未固定のままなら停止 |

## 停止条件

- AI自己監査結果: docs-onlyの整合修正として通過。repo内の正を `implementation-plan-v1.md` に寄せ、templateと既存worklogの証跡項目を一致させた。
- 残る停止条件: 非本番検証方式未実証、actor A/B/anonの切替方法未固定、M2-01の補助証跡はあるが実slice適用は未着手。
- 次に止める条件: M2-02を旧番号解釈で読める記述を再度混入させる、またはworklog templateと実worklogの必須項目が再び乖離する場合。

## 完了判断

- 完了扱いにできる理由: M2-01とM2-02の番号解釈、worklog templateの必須項目、既存M2 worklogの証跡項目、M2-02着手前の停止条件が一つの解釈に収束したため
- 大きなコード変更の場合のCI結果: 対象外。
- 軽微変更の場合にpush/CI監視を省略した理由: docs-only整合修正であり、ローカルdocsチェックを完了条件にするため
- 後続で見直す条件: M2番号体系を将来再編する設計判断が別途必要になった場合
