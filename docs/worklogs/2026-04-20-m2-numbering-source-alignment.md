# Worklog: M2 numbering source alignment

## 確認対象

- 今回の判断根拠: `公開 repo / 既定ブランチ`
- 作業開始時点の基準コミット: `8b583f223cbe8f3a83488362fda1bc22589894bc`
- 公開 repo / 既定ブランチ確認: `origin = https://github.com/iwachacha/chai-lab.git`, `main`
- 作業名: M2タスク番号と意味の正本整合回復
- 対象単位: v1 M2 docs-only alignment
- N/Aにした検証観点と理由: 実migration、実DDL、実RLS、実grant/revoke、実helper、実RPC、非本番DB実行は今回の対象外。今回の目的は正本間の意味整合回復であり、実DB変更ではないため
- 日付: 2026-04-20
- 変更分類: Docs
- 完了運用分類: 軽微変更
- 分類理由: `docs/implementation-plan-v1.md` と `supabase/` README 群の番号定義・導線修正に限定し、実装コードとDB実体には触れていないため
- 適用フェーズ / 適用範囲: v1 M2
- 変更対象: `docs/implementation-plan-v1.md`, `supabase/README.md`, `supabase/migrations/README.md`, `supabase/verification/README.md`, `docs/worklogs/2026-04-20-m2-numbering-source-alignment.md`
- 参照したSQL / 手順書 / 証跡ファイル: `AGENTS.md`, `docs/INDEX.md`, `docs/agent-relationship-governance.md`, `docs/agent-workflow.md`, `docs/codex-execution-rules.md`, `docs/implementation-plan-v1.md`, `supabase/README.md`, `supabase/migrations/README.md`, `supabase/verification/README.md`
- 危険変更workflow該当: なし
- 人間確認: 不要

## 正本

- 正本ファイル: `docs/implementation-plan-v1.md`
- 正本で固定した定義 / 正式項目 / 停止条件: `M2-01 = 検証/証跡土台整理`、`M2-02 = research_lines の最初の end-to-end DB slice`、M2-01完了後の次タスクは M2-02、M3へ進む前提は `M2-09` 横断検証から `M2-13` UI完了まで
- 正本を先に修正した確認: 先に `docs/implementation-plan-v1.md` を更新し、その後に `supabase/` README 群を追従させた

## GitHub反映状況

- GitHubに反映済み: このworklogを含む変更は `main` へのpush確認を完了条件とする
- 反映ブランチ: `main`
- 反映確認に使ったコミット識別情報: push後の最終コミットを正とする
- CI確認の要否判断: 必要。`.github/workflows/docs.yml` が `main` への Markdown push で `npm run check:docs` を実行するため
- CI結果 / 未確認理由: push後に確認する

## 変更ファイル一覧

- `docs/implementation-plan-v1.md`
- `supabase/README.md`
- `supabase/migrations/README.md`
- `supabase/verification/README.md`
- `docs/worklogs/2026-04-20-m2-numbering-source-alignment.md`

## 採用方針

- 採用した方針: `docs/INDEX.md` が分類する現行フェーズ契約のうち、M2タスク番号の正は `docs/implementation-plan-v1.md` に置き、`supabase/` README 群はその導線文書として従属させた
- 優先軸: 正本間整合、監査可能性、単純性
- 根拠文書: `docs/INDEX.md`, `docs/implementation-plan-v1.md`, `docs/agent-workflow.md`, `docs/codex-execution-rules.md`
- 退けた代替案: `supabase/` README 側を正にして implementation plan を合わせる案は、現行フェーズ契約より運用導線を上位に置くことになり `docs/INDEX.md` の分類に反するため退けた。M2番号を新たに振り直す案は、整合修正ではなく計画再編になるため退けた

## 変更内容

- 追加: 今回の整合修正を残すworklog
- 更新: `docs/implementation-plan-v1.md` のM2要約へ、M2-01完了後の次タスクが M2-02 であることを明記した
- 更新: `docs/implementation-plan-v1.md` のM3進行条件を `M2-09` 横断検証から `M2-13` UI完了までの正しい番号に直した
- 更新: `docs/implementation-plan-v1.md` のUI実装順表現を `M2-13着手はM2-12完了後` に直した
- 更新: `supabase/README.md`, `supabase/migrations/README.md`, `supabase/verification/README.md` へ、番号定義の正が `docs/implementation-plan-v1.md` であることと、次の実装タスクが M2-02 `research_lines` sliceであることを追記した
- 削除: なし
- 更新した文書: `docs/implementation-plan-v1.md`, `supabase/README.md`, `supabase/migrations/README.md`, `supabase/verification/README.md`, `docs/worklogs/2026-04-20-m2-numbering-source-alignment.md`

## 正本ファイルの証拠抜粋

- `docs/implementation-plan-v1.md`: M2要約に `M2-01 = 検証/証跡土台整理`、`M2-02 = research_lines の最初の end-to-end DB slice`、M2-01完了後の次タスクは M2-02 と追記し、M3進行条件を `M2-09` から `M2-13` の実際の役割に合わせて修正した

## 整合確認の証拠

- 新しい解釈が存在する検索: `rg -n 'M2番号の正|M2-01完了後に次に着手|M2-02 = research_lines|M2-09の4テーブル横断検証|M2-13着手はM2-12完了後' docs/implementation-plan-v1.md supabase -g '*.md'`
- 旧解釈が消えた検索: `rg -n 'M2-01 = [^`]*research_lines|M2-02 = [^`]*trials|M2-10の4テーブル横断検証|L1/L2研究ライン: M2-12後' docs/implementation-plan-v1.md supabase -g '*.md'`
- docs-only / 影響差分の確認: `git diff -- docs/implementation-plan-v1.md supabase/README.md supabase/migrations/README.md supabase/verification/README.md docs/worklogs/2026-04-20-m2-numbering-source-alignment.md`

## 実行コマンドと結果

| コマンド | 用途 | 結果 |
|---|---|---|
| `git fetch origin main --prune` | 公開 repo / main の基準取得 | 成功 |
| `git rev-parse HEAD` / `git rev-parse origin/main` | 基準コミット確認 | どちらも `8b583f223cbe8f3a83488362fda1bc22589894bc` |
| `Get-Content -Raw -Encoding UTF8 -LiteralPath ...` | 正本文書と対象READMEの確認 | 成功 |
| `rg -n "M2-01|M2-02|M2-09|M2-10|M2-12|M2-13" docs supabase -g "*.md"` | 衝突箇所と残存解釈の確認 | 成功 |
| `npm run check:docs` | 運用文書変更の機械チェック | 成功 |

## 未実施検証

| 未実施項目 | 理由 | 代替確認 | 残リスク | 次に止める条件 |
|---|---|---|---|---|
| 実DB変更と非本番DB検証 | 今回は docs-only の整合修正であり、禁止事項として実migrationや実DDLに着手しないため | `implementation-plan-v1.md` と `supabase/` README 群へ、次タスクが M2-02 `research_lines` sliceであることと、M2-01の土台整理だけでは進まない停止条件を残した | M2-02着手時に非本番検証方式やactor切替方法が未固定のまま進める恐れは残る | M2-02を開始するときに M2-01の停止条件が未解消なら停止 |

## 停止条件

- AI自己監査結果: docs-onlyの整合修正として通過。現行フェーズ契約を正にして導線文書を従属させた
- 残る停止条件: 非本番検証方式未実証、actor A/B/anonの切替方法未固定、M2-01の補助証跡はあるが実slice適用は未着手
- 次に止める条件: `M2-01` / `M2-02` の意味が正本間で再びずれる、または M3進行条件の番号が再び実タスク定義と食い違う場合

## 完了判断

- どの矛盾をどう解消したか: implementation plan では `M2-01 = 検証/証跡土台整理`、`M2-02 = research_lines slice` を維持しつつ、M2後半でずれていた番号参照を実タスク定義へ戻した。`supabase/` README 群には正本と次タスクを明記し、入口差による別解釈を消した
- 完了扱いにできる理由: 現行フェーズ契約と `supabase/` の入口から、M2-01 / M2-02 の意味と次の実装タスクが同じ結論で読める状態になったため
- worklogに記録した成立済み事項: 正本は `docs/implementation-plan-v1.md`、次の実装タスクは M2-02 `research_lines` slice、M3進行条件の番号は `M2-09` から `M2-13` の実定義に従う
- あえて未解消として残した事項: 実migration、実DDL、RLS、grant/revoke、helper、RPC、非本番検証実行
- 後続で見直す条件: M2計画自体を再編する判断が将来必要になった場合
