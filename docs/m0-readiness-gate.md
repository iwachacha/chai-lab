# M0 Readiness Gate

**作成日:** 2026-04-19
**目的:** AIがM1へ進むために満たすM0準備完了ゲートを定義する。

## 1. 判定ルール

M0完了は、人間承認がそろった状態ではない。M0完了は、AIが次の作業を安全に進めるための判断、自己監査条件、停止範囲、証跡方式を確定した状態である。

M1へは自律的に進める。M1で許可されるのは、静的Next.js骨格、固定ルート、env境界、Auth Callback、AppResult/AppError、最小UI基盤、npm scripts固定までである。実Supabase project、Production URL、secret、Preview/Production接続、外部サービス契約、Productionデータには触れない。

M2以降のDB/RLS/RPCへ進む場合は、AI自己監査ゲートを満たす。人間確認が必要なのは、実環境、外部サービス、Production、本番deploy、v1スコープ変更に関わる場合だけである。

## 2. ゲート一覧

| ゲートID | 新しいゲート名 | AIの決定 | AI自己監査の完了条件 | 人間確認 | 未完了時に止める範囲 |
|---|---|---|---|---|---|
| G0-ENV | 環境分離準備 | localはSupabase localまたは非本番project、previewはproductionと分離、productionデータをpreviewで使わない。M1ではenv名と禁止値チェックを先に作る。 | `NEXT_PUBLIC_*` 以外をブラウザに置かない方針、production参照禁止、local-onlyで進める範囲が記録済み。 | 実Supabase project、Production URL、secret、Preview/Production接続を設定する直前だけ必要。 | 実環境接続、Preview E2E、M8 deploy。M1骨格は止めない。 |
| G0-AUTH | Auth Redirect準備 | Auth Callbackは `/auth/callback/` の静的ページ。サーバーcallback、SSR、API Routesは作らない。 | local/preview/productionすべてで `/auth/callback/` を使う前提、未確定URLの扱い、静的export制約が記録済み。 | 実URL登録時だけ必要。 | 実Magic Link疎通、M8 Auth確認。M1のcallback実装は止めない。 |
| G0-RLS-VERIFY | RLS/RPC検証方式 | M2では再実行可能なSQLまたはSupabase local手順とチェックリストで検証し、M7で再実行する。 | A/B分離、anon拒否、direct CRUD拒否、grant/revoke、RPC重要仕様の最低検証項目が定義済み。 | 不要。検証方式はAIが決める。 | M2 DB/RLS、M3/M4 RPC。 |
| G0-AUDIT | AI自己監査ゲート | 危険領域では設計、影響範囲、権限、代替案、検証、記録をAIが完了条件として満たす。 | 対象変更、事前資料、監査観点、通過条件、差し戻し時の停止範囲が記録済み。 | 不要。人間承認者名は不要。 | DB/RLS/RPC/security definer、認可境界Data Access。 |
| G0-DOMAIN | 未確定仕様のAI分類 | Q-04/Q-06/Q-09/Q-10は即決、Q-05/Q-07は安全側の仮決定、Q-08はM8保留、Q-01だけ限定的人間確認。 | `docs/m0-decision-matrix.md` に分類、採用方針、優先軸、リスク、停止範囲が記録済み。 | Q-01の実環境、Q-08の本番前backup/exportだけ必要。 | 該当する実環境またはM8 deploy。M1は止めない。 |
| G0-BACKUP | Backup/Export保留ゲート | ユーザー向けexport UIは作らない。運用側backup/export確認はM8まで保留する。 | M8で確認する内容、UI非対象、Production deploy前に止める条件が記録済み。 | Supabase plan、backup可否、手動export手順はM8で必要。 | M8-03、M8-04、本番deploy。 |
| G0-TESTOPS | テスト運用準備 | M1で `lint`、`typecheck`、`test`、`test:e2e`、`build` 相当のnpm scriptsを固定する。RLS/RPC検証はM2で別管理する。 | 未実施記録テンプレート、M7必須検証、Playwright viewport、DB検証再実行方針が定義済み。 | 不要。 | M7完了、M8 deploy、完了報告。 |
| G0-LOGGING | 証跡とログ方針 | PRがある場合はPR本文を正式記録、PR前やAI単独作業では該当タスクの作業記録を使う。チャットのみを正式証跡にしない。 | 採用方針、検証、未実施、残リスク、ログ禁止項目の記録方式が定義済み。 | 不要。 | M2以降の自己監査完了、M7/M8証跡確認。 |

## 3. AI自己監査の最低資料

危険領域の作業では、AIは次を事前または実装直後に記録する。

| 資料 | 必須内容 |
|---|---|
| 採用方針 | 何を決めたか、なぜその案か、代替案を退けた理由 |
| 優先軸 | v1整合、安全性、単純性、可逆性、監査可能性のどれを優先したか |
| 影響範囲 | テーブル、カラム、index、policy、function、RPC、Data Access、UI |
| RLS/policy matrix | role、操作、`USING`、`WITH CHECK`、拒否条件 |
| grant/revoke一覧 | anon、authenticated、PUBLICの許可と拒否 |
| `security definer`確認 | `search_path`、`auth.uid()`、所有者確認、PUBLIC revoke、grant |
| RPC仕様 | 入力、認可、戻り値、失敗時挙動、AppError分類 |
| 検証結果 | A/B分離、direct CRUD拒否、anon拒否、RPC重要仕様 |
| 未実施記録 | 理由、代替確認、残リスク、次に止める条件 |
| rollback/修正方針 | 問題発生時の戻し方、修正migration方針 |

## 4. M1へ進める条件

M1へ進める条件は満たした扱いにする。理由は、M1が実ProductionやDB変更に触れない静的アプリ基盤であり、未確定論点を安全側に閉じ込められるためである。

M1で実施してよい作業:

- Next.js静的export前提の骨格
- 固定ルートと `/auth/callback/`
- env名、env boundary、禁止secret検索
- Supabase public clientの薄い初期化。ただし実secretやProduction接続は置かない
- AppResult/AppError型
- Data Access境界の空実装または契約
- 最小UI基盤とデザイントークン
- npm scriptsの固定

M1で実施してはいけない作業:

- ProductionまたはPreviewの実Supabase接続
- 本番データ、実ユーザーデータ、secretの投入
- DB migration、RLS policy、RPC作成
- 公開、共有、写真、AI、比較、系譜、カスタム項目、オフライン同期
- ユーザー向けexport UI

## 5. M2以降へ進める追加条件

M2へ進む前にAIが満たす条件は次である。

- 非本番またはlocal SupabaseでDB/RLS検証を実行できる。
- M2-00でDDL、index、helper、RLS enable、policy、grant/revoke、検証を分割している。
- Q-04の研究ライン名正規化はtrim後完全一致で即決済み。
- G0-RLS-VERIFYのチェックリストがM2タスクに組み込まれている。
- G0-AUDITの自己監査資料が作成される。

M3/M4へ進む前にAIが満たす条件は次である。

- Q-05のJSTカレンダー日仮決定がT1/T3/Data Access/テストへ反映されている。
- Q-06のRPC内部エラー識別子とAppError分類がRPCごとに表になっている。
- Q-07のclone即DB作成、編集画面遷移、不要時soft delete方針がUIに反映されている。

M8へ進む前に必要な条件は次である。

- Q-08のSupabase backup/export確認が完了している。
- Production env、Auth Redirect、Preview/Production分離が人間確認済みである。
- 本番deploy前の未実施検証と残リスクが記録されている。

## 6. 現時点の結論

M1へはAIが自律的に進める。M1開始を止める未解消論点はない。

止めるべき範囲は限定する。

- Q-01は、実Supabase project、Production URL、secret、Preview/Production接続を設定する直前だけ止める。
- Q-08は、M8の本番deploy前だけ止める。
- DB/RLS/RPCは、各段階のAI自己監査と検証が未完了なら、その依存タスクだけ止める。
