# Worklog: UI design reference anchors

## 確認対象

- 今回の判断根拠: `ローカル作業ツリー`
- 公開 repo / 既定ブランチ確認: `origin = https://github.com/iwachacha/chai-lab.git`, `main`
- 作業名: UI参考画像群の保存と参照README追加
- 日付: 2026-04-22
- 変更分類: Docs
- 完了運用分類: 軽微変更
- 分類理由: 画像保存と参照文書の追加だけを行い、アプリ実行時挙動、DB / RLS / RPC、Auth、Deploy経路には触れていないため
- 変更対象: `docs/design-reference/ui/**`, `docs/INDEX.md`, `docs/app-design.md`, `docs/worklogs/2026-04-22-ui-design-reference-anchors.md`
- 危険変更workflow該当: なし
- 人間確認: 不要

## 正本

- 正本ファイル: `docs/design-reference/ui/README.md`, `docs/app-design.md`
- 正本で固定した定義 / 正式項目 / 停止条件:
  - UI参考画像群は、世界観、余白、情報階層、カード設計、配色、モバイル画面構成の基準として扱う
  - `01-home-anchor.png` を最重要の世界観アンカーとして扱う
  - 画像内の文言、データ、機能配置、個別要素は最終仕様ではない
  - 比較、系譜、定番化、写真などv1 MVP外の要素は、画像に含まれていても先回りして実装しない
- 正本を先に修正した確認:
  - 画像を `docs/design-reference/ui/` に保存し、READMEで位置づけと固定範囲を定義した後、`docs/INDEX.md` と `docs/app-design.md` に参照導線を追加した

## GitHub反映状況

- GitHubに反映済み: このworklogを含む変更は `main` へのpush確認を完了条件とする
- 反映ブランチ: `main`
- 反映確認に使ったコミット識別情報: push後の最終コミットを正とする
- CI確認の要否判断: 不要。docs-onlyの軽微変更であり、`.github/workflows/**`、`scripts/check-operational-docs.mjs`、`package.json` の検証コマンド、deploy / release経路を変更していないため
- CI結果 / 未確認理由: 未確認。要否判断どおり省略し、ローカルの `npm run check:docs` を完了条件に含める

## 変更ファイル一覧

- `docs/design-reference/ui/01-home-anchor.png`
- `docs/design-reference/ui/02-trial-log-list.png`
- `docs/design-reference/ui/03-trial-form.png`
- `docs/design-reference/ui/04-trial-detail.png`
- `docs/design-reference/ui/05-compare.png`
- `docs/design-reference/ui/06-lineage.png`
- `docs/design-reference/ui/07-standard-recipe-detail.png`
- `docs/design-reference/ui/08-insights.png`
- `docs/design-reference/ui/09-my-page.png`
- `docs/design-reference/ui/README.md`
- `docs/INDEX.md`
- `docs/app-design.md`
- `docs/worklogs/2026-04-22-ui-design-reference-anchors.md`

## 整合確認の証拠

- 新しい解釈が存在する検索: `rg -n "UI Design Reference|01-home-anchor|固定するもの|固定しないもの|デザイン参照" docs`
- 旧解釈が消えた検索: 該当なし。新規参照資料の追加であり、既存解釈の削除はしていない
- docs-only / 影響差分の確認: `git diff -- docs/design-reference/ui/README.md docs/INDEX.md docs/app-design.md docs/worklogs/2026-04-22-ui-design-reference-anchors.md`

## 実行コマンドと結果

| コマンド | 用途 | 結果 |
|---|---|---|
| `git remote get-url origin` | 公開 repo の確認 | 成功。`https://github.com/iwachacha/chai-lab.git` |
| `git branch --show-current` | 反映対象ブランチの確認 | 成功。`main` |
| `git rev-parse HEAD` | 作業開始時点のローカル基準確認 | 成功。`c133dce49f5bdab339fff0d9e4b85155b9676dce` |
| `Get-ChildItem -LiteralPath 'c:\Users\syoma\Downloads' -Filter 'ChatGPT Image 2026年4月22日 09_5*.png'` | 保存元画像の確認 | 成功。9件を確認 |
| `Copy-Item ... docs/design-reference/ui/...` | 画像保存 | 成功。9件を役割名で保存 |
| `rg -n "UI Design Reference\|01-home-anchor\|固定するもの\|固定しないもの\|デザイン参照" docs` | 新しい参照導線の確認 | 成功。README、`docs/INDEX.md`、`docs/app-design.md`、worklogに存在 |
| `npm run check:docs` | docs整合確認 | 成功。`Operational docs check passed (39 markdown files).` |
| `git diff --check` | whitespace確認 | 成功。CRLF warningのみ |

## 完了判断

- 完了扱いにできる理由: 画像9件を役割名で保存し、READMEで参照位置づけ、最重要アンカー、固定するもの / 固定しないもの、実装時の注意点、仕様との優先順位を明文化したため
- worklogに記録した成立済み事項: Docsレイヤーの軽微変更として、v1 MVP外要素を実装指示にしない停止条件を残した
- あえて未解消として残した事項: なし
