# M2 DB Slice Verification Checklist

このチェックリストは、`research_lines`、`trials`、`trial_ingredients`、`trial_stars` などのDB sliceごとに使い回す前提です。チェックリスト単体を正式証跡にせず、PR本文またはworklogへ結果を転記します。

## 0. 対象情報

- 対象単位:
- sliceの目的:
- 対象オブジェクト:
- 適用する検証観点:
- N/Aにする検証観点と理由:
- 非本番検証先:
- Actor A / Actor B / anon の準備状況:
- Actor切替方法:
- 参照する手順書:
- 参照するSQL:
- 補助証跡ファイル:
- 正式証跡の記録先:

## 1. 検証観点の適用マトリクス

| 観点 | 必須タイミング | N/Aにできる条件 |
|---|---|---|
| A/Bユーザー分離 | すべてのDB slice | なし |
| anon拒否 | すべてのDB slice | なし |
| trim正規化境界 / trim前提の重複確認 | trim後保存値、trim後unique、未trim値拒否など、trim前提入力契約を持つslice | trim保存契約もtrim後unique契約も未trim値拒否契約も持たない |
| `deleted_at IS NULL` 前提の通常取得除外 | `deleted_at` を持つslice、またはactive trial前提で参照・集計するslice | `deleted_at` を持たず、active trial前提にも依存しない |
| direct CRUD拒否 | v1契約で直接書き込みを禁止するslice。少なくとも `trials` と `trial_ingredients` | v1契約で直接table writeが許可されている。例: `research_lines` の insert/update、`trial_stars` の insert/delete |
| 想定経路の成功 | すべてのDB slice | なし |
| 未実施項目の記録 | すべてのDB slice | なし |
| 停止条件の記録 | すべてのDB slice | なし |

## 2. 実施前チェック

- [ ] 実行先はlocalまたは分離された非本番であり、Productionではない
- [ ] 対象sliceの範囲が1論理変更に閉じている
- [ ] worklogまたはPR本文の記録先を先に決めた
- [ ] 適用する検証観点とN/A理由を空欄のままにしていない
- [ ] 参照するSQL / 手順書 / 補助証跡ファイルの場所を記録した
- [ ] direct CRUD拒否が必要なsliceでは、SQLの負テストだけでなくgrant/revokeとコード検索も行う前提にした

## 3. 実施順序

### 3.1 構造確認

- [ ] 対象オブジェクトが想定どおり存在する
- [ ] migrationが1論理変更に閉じている
- [ ] policy / grant / helper / function / indexの対象範囲を列挙できる

### 3.2 Actor A 正常系

- [ ] Actor Aで想定経路が成功する
- [ ] 成功時にどの条件を満たしたかをworklogへ書ける

### 3.3 Actor B 拒否

- [ ] Actor Bで他人データの参照または操作が拒否される
- [ ] 0件 / 権限拒否 / 想定エラーのどれを期待値にするかを記録した

### 3.4 anon 拒否

- [ ] anonで業務テーブルまたは対象経路が拒否される
- [ ] anonの期待値を記録した

### 3.5 trim 保存 / trim重複

- [ ] trim前提契約を持つsliceでは、前後空白付き生入力に対する境界を記録した
- [ ] 前後空白付き生入力の挙動が、保存値への正規化かDB拒否のどちらかで確認できた
- [ ] trim後重複禁止が契約に含まれるsliceでは、重複拒否を確認した
- [ ] 該当しない場合はN/A理由を残した

### 3.6 `deleted_at IS NULL` 前提の通常取得除外

- [ ] `deleted_at` を持つかactive trialに依存するsliceでは、通常取得から除外されることを確認した
- [ ] Data Accessだけに依存せず、DB/RLS側でも通常取得除外を説明できる
- [ ] 該当しない場合はN/A理由を残した

### 3.7 direct CRUD拒否

- [ ] SQLの負テストで直接writeが拒否されることを確認した
- [ ] grant/revokeの読み戻しで直接write不許可を確認した
- [ ] コード検索で直接write経路やwrapper経路がないことを確認した
- [ ] 「grepだけでは不十分」であることを補足に残した
- [ ] 該当しない場合はN/A理由を残した

### 3.8 未実施項目と停止条件

- [ ] 未実施項目を空欄で残していない
- [ ] 未実施ごとに理由、代替確認、残リスク、次に止める条件を書いた
- [ ] 未実施がある場合、どの後続タスクを止めるかを書いた

## 4. 停止条件として明示すること

次のどれかが残る場合は、そのsliceを完了扱いにしません。

- A/B分離未検証
- anon拒否未検証
- 適用されるtrim検証未実施
- 適用される`deleted_at IS NULL`通常取得除外未実施
- 適用されるdirect CRUD拒否未実施
- 未実施項目の理由、代替確認、残リスク、次に止める条件が未記録
- 参照したSQL / 手順書 / 補助証跡ファイルが追えない

## 5. worklog / PR本文へ必ず残す項目

- 対象単位
- 実施した検証
- 未実施検証
- 実施できなかった理由
- 残リスク
- 次に止める条件
- 参照したSQL / 手順書 / 補助証跡ファイル

## 6. 補足

- `research_lines` はdirect CRUD全面拒否の対象ではありません。v1契約で本人のinsert / updateは直接許可されます。ただし、物理delete不可、trim前提の生入力拒否または正規化、trim / 重複 / archive挙動は検証対象です。
- `trials` と `trial_ingredients` はdirect CRUD拒否が必須です。将来のRPC導線を先回り実装せず、DB権限と負の検証で止めます。
- `trial_stars` は本人未削除trialへの直接insert / deleteを許可するため、direct CRUD拒否の代わりに「許可された直接操作の境界」を確認します。
