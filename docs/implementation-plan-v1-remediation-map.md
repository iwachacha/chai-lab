# v1実装計画 監査指摘対応表

**作成日:** 2026-04-19  
**対象監査:** `docs/implementation-plan-v1-audit.md`  
**改訂先:** `docs/implementation-plan-v1-revised.md`

## 1. 対応方針

この対応表は、監査で検出された Critical 3件、Major 16件、Minor 6件が、改訂版計画書のどこへ反映されたかを追跡するための文書である。

「未解消か」の扱いは次の基準にする。

- **いいえ:** 計画書上のタスク、完了条件、レビューゲート、テスト条件として反映済み。
- **一部:** 実装前にproject ownerまたはhuman reviewerの判断が必要であり、改訂版では要確認事項と停止条件としてゲート化済み。
- **はい:** 改訂版に未反映。今回の改訂では該当なし。

対応結果の集計は次のとおりである。

| 重要度 | 件数 | 改訂版へ反映済み | 要確認としてゲート化 | 未反映 |
|---|---:|---:|---:|---:|
| Critical | 3 | 3 | 0 | 0 |
| Major | 16 | 16 | 6 | 0 |
| Minor | 6 | 6 | 2 | 0 |

要確認として残る項目は、計画の欠落として放置せず、`docs/implementation-plan-v1-revised.md` の4章「要確認事項と停止条件」により、未解消なら該当作業を止める。

## 2. 最優先3件の詳細説明

### 2.1 AUD-C01: 4業務テーブルのRLS/権限/直接CRUD検証をM2完了条件へ入れた方法

改訂版では、M2を「研究ライン」単独のマイルストーンではなく、**DB/RLS基盤 + 研究ライン**として再定義した。M2の完了条件に、`research_lines`、`trials`、`trial_ingredients`、`trial_stars` の4業務テーブルすべてについて、次を完了済みにすることを明記した。

- RLS有効化確認
- policy確認
- grant/revoke確認
- anon拒否確認
- ユーザーA/B分離確認
- 想定外直接CRUD拒否確認
- 想定経路だけ成功することの確認
- human review承認

具体的には、改訂版のM2-10「4テーブルRLS/権限/直接CRUD検証」を追加し、M2-11「DB/RLS Human Review Gate通過」をM3着手前の必須ゲートにした。`trials` と `trial_ingredients` は直接insert/update/delete/upsert不可、`research_lines` は本人の作成/編集のみ可でdelete不可、`trial_stars` は本人の未削除trialへのinsert/deleteのみ可というテーブル別のCRUD可否も明記した。

このため、migrationだけ完了してもM2は完了しない。M2-10とM2-11を通らなければ、`save_trial_with_ingredients`、試行UI、履歴UIへ進めない。

### 2.2 AUD-C02: DB/RLS/security definer/RPC変更へのhuman review gate設計

改訂版6章「Human Review Gate」で、レビュー必須対象を明文化した。対象は、migration、RLS policy、grant/revoke、helper、`security definer`、RPC、認可境界に関わるData Access、静的構成/環境変数/Auth Redirectである。

レビューでは、次を確認対象にした。

- v1スコープ内であること
- migrationが1論理変更に分かれていること
- RLSの `USING` / `WITH CHECK` の意図
- `security definer` の `auth.uid()` 所有者確認、search_path固定、PUBLIC revoke、必要ロールへのgrant
- direct CRUD禁止
- A/B分離、anon拒否、権限検証結果
- AppError分類
- Supabase生エラーや研究内容をUI/ログへ出さないこと

また、M2-11、M3-01からM3-03、M4-01からM4-03、M8-04など、危険領域の各タスクに「レビュー要否: 必須」を置いた。レビュー未通過または承認記録なしの場合は、依存するDB/RLS/RPC/Data Access/UI/E2E/Deployを停止する。

### 2.3 AUD-C03: M2-01巨大タスクの分割方法と完了条件

改訂前のM2-01相当の「DB一式」タスクは、改訂版で次の作業単位に分割した。

| 改訂後タスク | 分割観点 | 完了条件 |
|---|---|---|
| M2-00 | DB変更分割計画レビュー | DDL/index/helper/policy/grant/test/reviewの分割順が承認済み |
| M2-01 | `research_lines` DDL | DDLのみのmigrationがレビュー通過 |
| M2-02 | `trials` DDL | DDLのみのmigrationがレビュー通過、先回り列なし |
| M2-03 | `trial_ingredients` DDL | DDLのみのmigrationがレビュー通過、材料マスター等なし |
| M2-04 | `trial_stars` DDL | DDLのみのmigrationがレビュー通過、SNSリアクション化なし |
| M2-05 | index/constraint | index/constraintだけのmigrationがレビュー通過 |
| M2-06 | helper/view/enum等 | helper権限、search_path、PUBLIC revoke確認 |
| M2-07 | RLS有効化 | 4テーブルすべてRLS有効化済み |
| M2-08 | policy定義 | policy matrixがレビュー通過 |
| M2-09 | grant/revoke整理 | grant/revoke matrixがレビュー通過 |
| M2-10 | RLS/権限/直接CRUD検証 | 4テーブル検証結果が記録済み |
| M2-11 | DB/RLS human review | M2全体の承認記録がある |

これにより、1タスクで4テーブル、helper、RLS、権限までまとめる余地をなくした。レビュー、rollback、原因切り分けが可能な単位に分け、M2-10とM2-11を通過しない限りM3へ進めない構造にしている。

## 3. 監査指摘対応表

| 監査ID | 重要度 | 指摘要旨 | 該当する改訂先章 | どのように修正したか | まだ未解消か | 未解消なら何が必要か |
|---|---|---|---|---|---|---|
| AUD-C01 | Critical | 4業務テーブルのRLS/権限/直接CRUD検証がM2完了条件にない | 5章、7章M2、8章M2-10/M2-11、9章、12章 | M2をDB/RLS基盤マイルストーンに再定義し、M2-10で4テーブル検証、M2-11でhuman reviewを必須化した | いいえ | なし |
| AUD-C02 | Critical | DB/RLS/security definer/RPC変更のhuman review gateがない | 6章、7章各マイルストーン、8章M0-05/M2-11/M3/M4、9.3 | レビュー必須対象、レビュー内容、前提資料、通過条件、停止条件を追加し、各危険タスクへ必須レビューを設定した | いいえ | なし |
| AUD-C03 | Critical | M2-01が巨大タスクでDDL/RLS/grant等が混在する | 7章M2、8章M2-00からM2-11、9.1 | DDL、index、helper、RLS enable、policy、grant/revoke、検証、レビューへ分割した | いいえ | なし |
| AUD-M01 | Major | RPCタスクにsecurity definer hardeningが落ちていない | 6章、8章M3-01からM3-03、M4-01/M4-02、9.3 | RPCタスクの具体作業と完了条件にsearch_path固定、PUBLIC revoke、authenticated grant、所有者確認を追加した | いいえ | なし |
| AUD-M02 | Major | direct CRUD検出が狭い | 8章M3-04、9.4、12.2、15章 | insert/update/delete/upsert、`trials`/`trial_ingredients`、wrapper/迂回を検索対象にした | いいえ | なし |
| AUD-M03 | Major | AppResult「相当」が曖昧 | 8章M1-03、10章、15章 | AppResult/AppErrorに必要フィールドと扱いを明記し、生エラー非表示を完了条件化した | いいえ | なし |
| AUD-M04 | Major | RPCエラー分類が保存以外にも波及するのに弱い | 4章Q-06、8章M3-01/M4-01/M4-02、10章 | RPC別のエラー分類を各RPC設計レビュー前の必須事項にし、未確定ならRPC/UI接続停止とした | 一部 | RPCごとのSQLSTATEまたは識別子とAppError分類を、各RPC設計レビューで確定する |
| AUD-M05 | Major | UI順序がData Access/RPC依存に紐づいていない | 5章、7章、11.1 | 画面別に着手可能タイミングを定義し、RPC/Data Access完了前の業務UI接続を禁止した | いいえ | なし |
| AUD-M06 | Major | 画面別受け入れ基準との対応表がない | 11.2、12章、8章M7-03 | 画面別traceability matrixを追加し、M7-03の完了条件にした | いいえ | なし |
| AUD-M07 | Major | L1に試行数・最終試行日が明記されていない | 8章M2-12/M2-13、11.2 | L1カードの表示要件とResearch Line Data Accessに試行数/最終試行日を追加した | いいえ | なし |
| AUD-M08 | Major | Supabaseバックアップ/手動エクスポート確認がない | 3.3、4章Q-08、8章M0-06/M8-03、13章 | ユーザー向けエクスポート非対象と運用確認対象を分離し、M8-03で確認必須にした | 一部 | project ownerがSupabaseバックアップ状況と手動エクスポート手順を確認する |
| AUD-M09 | Major | 外部Analytics禁止、ログ禁止項目がない | 3.3、8章M0-06/M8-03、13章、14章 | 外部Analytics不導入と、材料名/メモ/認証情報/生エラー等のログ禁止を追加した | いいえ | なし |
| AUD-M10 | Major | 下書きの共有端末リスクと常時破棄導線が弱い | 7章M6、8章M6-01/M6-02、14章 | localStorage key、共有端末リスク表示、常時破棄導線、サーバー保存禁止を完了条件化した | いいえ | なし |
| AUD-M11 | Major | `brewed_at` と日付範囲のタイムゾーン方針がない | 4章Q-05、7章M3/M5、8章M5-01、14章 | タイムゾーン方針を要確認事項にし、T1/T3着手停止条件へ昇格した | 一部 | project owner/human reviewerが入力、保存、表示、検索境界の方針を決める |
| AUD-M12 | Major | 2秒/1000件程度の性能目標が計画にない | 8章M5-01/M7-04、12章、14章 | 履歴取得とM7性能確認に1000件程度/主要操作2秒目標を追加した | いいえ | なし |
| AUD-M13 | Major | `clone_trial` 即DB作成UXの放置試行リスクが停止条件でない | 4章Q-07、7章M4、8章M4-01、14章 | 複製UI前の要確認事項に昇格し、未解消ならM4 clone UI停止とした | 一部 | project ownerが即DB作成後の編集/放置試行の扱いを決める |
| AUD-M14 | Major | 静的export設定がM8寄りで遅い | 7章M1、8章M1-01、13章 | `output: export`、trailingSlash、固定ルート、API/SSR禁止をM1完了条件に移した | いいえ | なし |
| AUD-M15 | Major | テストコマンド/CI/手動確認のゲートが曖昧 | 4章Q-09、8章M0-02、12章 | M0でコマンド名、必須/任意、未実施記録形式を決めるタスクを追加した | 一部 | human reviewerが実際のコマンド名とCI/手動境界を確定する |
| AUD-M16 | Major | 研究ライン名重複正規化がM2停止条件でない | 4章Q-04、8章M2-05/M2-12 | 正規化方針をM2の研究ラインDA/unique確定前の停止条件にした | 一部 | project ownerがtrim、大文字小文字、全角半角等の正規化範囲を決める |
| AUD-m01 | Minor | README優先順位差分を矛盾に近く扱っている | 2.2 | READMEの表記順はMVP Scope Contract優先を下げない注意として整理した | いいえ | なし |
| AUD-m02 | Minor | design token/Tailwind反映と任意色検出がない | 8章M1-05、11.3、15章 | Tailwind token、arbitrary color/shadow検索、UI品質ゲートを追加した | いいえ | なし |
| AUD-m03 | Minor | Radix primitive追加管理が弱い | 8章M1-05、15章 | Radix追加時はprimitive名と理由を記録し、レビュー対象にした | いいえ | なし |
| AUD-m04 | Minor | 作業メモ/PR説明の保存先が未定 | 4章Q-10、8章M0-01、6.3 | 作業記録先をM0完了条件にし、未確定ならM2以降を止める | 一部 | project ownerがPR本文か作業記録ファイルかを決める |
| AUD-m05 | Minor | M0-01の既存変更保護が弱い | 8章M0-01 | `git status`、触らない既存変更、未追跡ファイルを完了条件へ追加した | いいえ | なし |
| AUD-m06 | Minor | `test-results/` をコミット対象にする余地 | 8章M7-04、12.3 | 生成物の保存/コミット方針確認をM7-04に追加した | いいえ | なし |

## 4. 未解消として残る判断事項

未解消として残るのは、計画の反映漏れではなく、実際にproject ownerまたはhuman reviewerが判断する必要がある事項である。

| 要確認ID | 関連監査ID | 必要な判断 | 未解消時に止める作業 |
|---|---|---|---|
| Q-04 | AUD-M16 | 研究ライン名重複の正規化範囲 | M2の研究ライン作成/編集、unique制約確定 |
| Q-05 | AUD-M11 | `brewed_at` の入力/保存/表示/検索境界 | M3 T1、M5 T3 |
| Q-06 | AUD-M04 | RPC別エラー識別子とAppError分類 | M3/M4 RPC migration、UI接続 |
| Q-07 | AUD-M13 | `clone_trial` 即DB作成後の編集/放置試行扱い | M4 clone UI |
| Q-08 | AUD-M08 | Supabaseバックアップ状況と手動エクスポート手順 | M8完了、本番デプロイ |
| Q-09 | AUD-M15 | テストコマンド、CI/手動境界、未実施記録形式 | M7完了 |
| Q-10 | AUD-m04 | 作業記録の保存先 | M2以降のレビュー必須タスク |

## 5. 改訂後の残リスク

改訂版は、監査指摘を計画、タスク、完了条件、レビューゲートへ反映した。ただし、次の判断が実際に済むまでは、実装開始可否は限定される。

- M0でSupabase環境、RLS/RPC検証方式、human review運用、テストコマンド、作業記録先を確定する必要がある。
- Q-04からQ-07は、該当機能の実装前にproject ownerまたはhuman reviewerが判断する必要がある。
- Q-08は本番デプロイ前に必ず確認する必要がある。

したがって、改訂後の開始可否は「要確認事項解消後に開始可」であり、現時点で着手してよいのはM0の確認タスクに限定される。
