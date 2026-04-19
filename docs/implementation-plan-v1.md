# チャイ研究アプリ v1 実装計画書

**作成日:** 2026-04-19  
**目的:** v1を安全に実装開始するための作業計画を固定する。

## 1. 文書の目的

この計画書は、チャイ研究アプリv1を実装する前に、既存文書から読み取れるスコープ、制約、依存関係、確認事項、実装順序、検証方針を整理するための作業計画書である。

v1実装の前提は、非公開の個人研究ログとして成立させることである。中心価値は、完成レシピの公開ではなく、ユーザーが自分の試行を記録し、前回を複製して少し変え、履歴から読み返せることである。

この計画書が扱う範囲は、実装開始前の計画、マイルストーン、タスク分解、DB/RLS/RPC方針、データアクセス方針、UI方針、テスト方針、リスク管理、実装開始チェックである。アプリ機能の実装コード、migration SQL、コンポーネント実装、テストコードはこの文書では作成しない。

## 2. 参照文書と優先順位

### 2.1 参照した文書

- `docs/mvp-scope-contract.md`
- `docs/pj-policy.md`
- `docs/app-rdd.md`
- `docs/app-lld.md`
- `docs/app-design.md`
- `docs/screen-acceptance-criteria.md`
- `docs/tech-stack.md`
- `docs/db-migration-rls-policy.md`
- `docs/supabase-data-access-error-contract.md`
- `docs/deployment-contract.md`
- `docs/codex-execution-rules.md`
- `README.md`

### 2.2 判断が衝突した場合の優先順位

1. `docs/mvp-scope-contract.md` を、v1で実装するもの・しないものの最終判断として最優先する。
2. `docs/pj-policy.md` を、プロジェクト方針、開発姿勢、危険な要望への反対基準として扱う。
3. `docs/app-rdd.md` を、機能要件と非機能要件の基準として扱う。
4. `docs/app-lld.md` を、DB、RPC、RLS、画面フロー、運用の詳細設計として扱う。
5. `docs/app-design.md` と `docs/screen-acceptance-criteria.md` を、UI実装と画面別完了条件の基準として扱う。
6. `docs/tech-stack.md` を、採用技術とライブラリ追加判断の基準として扱う。
7. `docs/db-migration-rls-policy.md` を、DB変更、RLS、RPC権限、DBレビューの基準として扱う。
8. `docs/supabase-data-access-error-contract.md` を、データアクセス層とエラー正規化の基準として扱う。
9. `docs/deployment-contract.md` を、Next.js静的export、Cloudflare Pages、ルーティング、環境変数の基準として扱う。
10. `docs/codex-execution-rules.md` と `README.md` を、AIエージェント実行時の確認手順とリポジトリ全体方針として扱う。

上記のうち専門領域の詳細が衝突する場合は、スコープ判断は `mvp-scope-contract.md` を優先し、スコープ内の実装詳細は該当する専門契約文書を優先する。たとえば、RLSの具体方針は `db-migration-rls-policy.md`、エラー分類は `supabase-data-access-error-contract.md`、静的ルーティングは `deployment-contract.md` を優先する。

### 2.3 スコープ判断の基準

v1に含めてよいのは、試行を記録、複製、読み返す体験に直接必要で、非公開・単独利用の前提を壊さず、既存4テーブルとRLSで安全に扱え、既存画面ID内で検証でき、新しいライブラリやサーバー機能を必要としないものに限る。

## 3. v1の実装対象と非対象

### 3.1 実装するもの

- Magic Link認証
- 認証済みユーザー単位の研究ライン作成、編集、アーカイブ
- 試行作成、編集、論理削除
- 材料行入力と保存
- `save_trial_with_ingredients` RPCによる試行本体と材料行の一括保存
- `clone_trial` RPCによる試行複製
- `soft_delete_trial` RPCによる試行論理削除
- 親試行リンク表示
- 試行履歴、研究ライン絞り込み、スター絞り込み、日付範囲絞り込み
- スター付与と解除
- 同一ブラウザ内、認証ユーザー単位の軽量ローカル下書き
- RLSによるユーザー単位のデータ隔離
- A1、H1、L1、L2、T1、T2、T3、S1のv1画面
- 保存失敗時の入力保持、空状態、ローディング、保存失敗、認証切れ状態
- Vitest、React Testing Library、Playwright、RLSテスト

### 3.2 実装しないもの

- 公開、限定公開、共有URL
- SNS、フォロー、コメント、リアクション
- 写真アップロード、Storage、Cloudflare R2
- 外部AI API、AI提案
- 比較画面、任意2件比較、複数件比較、グラフ、ランキング
- 本格的な系譜グラフ、React Flow、D3.js
- カレンダービュー
- カスタム項目、評価テンプレート、材料プリセット、スパイスブレンド
- お気に入り棚、定番昇格
- オフライン自動同期、Dexie.js、Workbox
- Supabase Realtime、GraphQL
- Next.js API Routes、Server Actions、Cloudflare Pages Functions、Workers、SSR
- 新しいライブラリの独断追加
- `service_role` キーをブラウザに置く設計
- 試行本体または材料行をUIから直接 insert / update / delete する実装
- 未実装の将来機能を無効ボタンや準備中表示として主要画面に置くこと

### 3.3 「後でやる」に逃がすべきもの

- 写真、比較、系譜、公開、AI、SNSは、v1で継続利用が確認された後に、要件、DB、RLS、画面、受け入れ基準を更新してから検討する。
- データエクスポートは重要だが、v1ではUI導線を置かない。実装する場合は別仕様と受け入れ基準を先に作る。
- 本格的なバックアップ、復元、複数端末同期、競合解決はv2以降で扱う。
- 高度な集計、統計、カレンダー表示は履歴と日付絞り込みで代替し、v1には入れない。

### 3.4 先回り実装を禁止する項目

- `visibility`、`public_slug`、`share_token` など公開前提カラム
- 写真、ファイル、画像メタデータ用テーブル
- 材料マスター、スパイスブレンド、プリセット用テーブル
- カスタム項目定義、フォームテンプレート、評価テンプレート用テーブル
- 比較結果、統計、系譜グラフ専用テーブル
- ローカル下書き用のサーバーテーブル
- 公開設定画面、共有URL管理画面、写真管理画面、AI提案画面

## 4. 実装開始前の確認事項

### 4.1 文書間の矛盾または注意すべき差分

- READMEの文書一覧では `pj-policy.md` が先に記載されているが、スコープ判断は `mvp-scope-contract.md` が最終優先である。実装時はスコープ判断をMVP Scope Contractに寄せる。
- `trials` のRLSは本人の試行をselect可能にする方針であり、通常画面で `deleted_at IS NULL` を扱う制約はデータアクセス層とUI側の取得条件で担保する必要がある。RLSだけで論理削除済み試行を通常画面から除外する設計ではない。
- `clone_trial` は文書上、新しい試行をDBに作成してIDを返すRPCである。複製内容をフォームにだけ展開して未保存状態にする方式ではない。放置された複製試行を避けたい場合は仕様変更が必要であり、現行v1ではRPC即時作成を前提に進める。
- 研究ラインのアーカイブ済みデータは新規試行選択から除外する一方、既存試行の履歴・詳細では参照可能にする必要がある。取得関数の用途別分離が必要である。

### 4.2 未確定事項

- 現在のリポジトリは設計文書中心であり、Next.jsプロジェクト、`package.json`、`.nvmrc`、Supabase設定、テスト設定はまだ存在しない。M0で実装基盤を作る必要がある。
- Node.jsのLTSメジャーバージョンが未固定である。最初の実装PRで `.nvmrc`、`package.json`、Cloudflare Pages設定を一致させる必要がある。
- Supabaseのlocal、preview、productionのプロジェクト分離、環境変数、Auth Redirect URLの実体が未確認である。業務DB実装やE2E前に確認が必要である。
- Magic Link後導線のE2E方法は、テスト用セッション注入、Supabase localのテストユーザー、テスト専用認証ヘルパーのいずれにするか未決定である。
- 研究ライン名の重複判定は「同一ユーザー内の未アーカイブ研究ラインで重複不可」と定義されているが、大文字小文字、全角半角、前後空白をどう正規化するかは詳細未確定である。最低限、前後空白だけの値は禁止し、DBの部分ユニーク制約とUI/Zodのtrim方針をそろえる必要がある。
- RPC失敗時のSQLSTATEやエラー詳細を、`AppError` の `VALIDATION_ERROR`、`CONFLICT`、`FORBIDDEN`、`NOT_FOUND` にどう対応させるかは実装時に具体化が必要である。

### 4.3 実装前に解消すべき論点

- Supabase環境をどう分離するか。PreviewでProductionデータを使わないことは必須である。
- DB migrationをどの単位で作るか。少なくともコアテーブル、RLS helper、RLS policies、RPCは論理変更ごとに分け、各PRでテスト観点を明記する。
- RLSテストをどの仕組みで実行するか。Supabase localを使うのか、SQLテストを使うのか、CIでどこまで実行するのかをM0で決める。
- 認証済みテストユーザーの作成方法と、Playwrightでのログイン後状態の作り方をM1/M7前に決める。
- 研究ライン名重複の正規化ルールを決める。未決定のまま実装するとUI、Zod、DB制約、エラー文言がずれる。

### 4.4 解消されない場合に止めるべき作業

- Supabase環境とRLSテスト方針が未確認のまま、業務テーブルやRPCの実装を進めてはならない。
- Node.jsバージョンとnpm lockfile方針が未固定のまま、Cloudflare Pages向けビルド基盤を確定してはならない。
- RPCエラー正規化方針が未定のまま、UI保存処理のエラー表示を完成扱いにしてはならない。
- 新ライブラリが必要になった場合、追加理由、代替案、影響範囲が説明されるまで実装を止める。
- 公開、写真、AI、比較、系譜、カスタム項目などの要求が入った場合、関連設計文書の更新と人間レビューが終わるまで実装を止める。
- Next.js API Routes、Cloudflare Pages Functions、SSRが必要になる設計に変わった場合、Deployment Contract、Tech Stack、LLD、Error Contract、Codex Rulesの更新前に実装してはならない。

## 5. 全体実装戦略

### 5.1 実装の基本方針

v1は、DB/RLS/RPCとデータアクセス境界を先に固め、UIはその契約を呼び出す形で段階的に実装する。試行と材料行の保存はアプリ側の直接書き込みを禁止し、RPCを唯一の書き込み経路として扱う。UIはモバイル1カラムを優先し、画面数を増やさず、既存画面ID内で完結させる。

### 5.2 なぜその順番で進めるのか

認証、DB、RLS、RPC、データアクセス層が不安定な状態でUIを先に作ると、保存経路、エラー分類、権限境界が後から崩れる。v1は非公開研究ログであり、RLS不備が重大事故になるため、ユーザーに見える機能より先にデータ境界と検証方法を作る。

また、Next.js静的exportとCloudflare Pagesの制約により、ルーティング、Auth Callback、環境変数の形を先に固定しないと、後でAPI Routesや動的ルートへ流れやすい。M1で静的アプリ骨格を固定し、以降の画面はクエリパラメータ方式で実装する。

### 5.3 安全性・整合性・手戻り最小化

- DB変更は migration、RLS、権限、テスト観点をセットで扱う。
- UIコンポーネントからSupabaseを直接呼ばず、データアクセス層だけがSupabase Clientを扱う。
- `AppResult<T>` 相当の戻り値で成功と失敗を正規化する。
- 試行保存、複製、論理削除はRPCの契約とテストを先に作ってからUIに接続する。
- 画面はA1、H1、L1、L2、T1、T2、T3、S1に限定し、将来機能の無効導線を置かない。
- 各マイルストーンで「実装対象外に触れていないか」を確認する。

### 5.4 先に土台を作るべき領域

- Next.js静的export、npm、Node.jsバージョン固定、Tailwind、TypeScript strict
- Supabase Client初期化、環境変数、Auth Callback
- Auth data access、セッション管理、未認証ガード
- Supabase migration基盤、RLS helper、業務テーブル、権限
- `save_trial_with_ingredients`、`clone_trial`、`soft_delete_trial`
- データアクセス層と `AppResult` / `AppError`
- 共通UI、状態表示、フォーム部品、確認ダイアログ
- Vitest、React Testing Library、Playwright、RLSテスト基盤

## 6. マイルストーン計画

### M0: 実装準備・基盤確認

- 目的: リポジトリが実装可能な状態か確認し、Node、npm、Supabase、テスト、環境分離の前提を固める。
- 完了条件: 実装基盤の不足一覧、Node固定方針、Supabase環境方針、DB/RLSテスト方針、最初のPR方針が明確になっている。
- 依存関係: 既存文書、README。
- 主なリスク: docs-only状態を見落としてUI実装から始めること、ProductionデータをPreviewやテストで使うこと。
- スコープ逸脱しやすい注意点: 便利なテンプレート導入やライブラリ追加を独断で行わない。

### M1: 認証/アプリ骨格

- 目的: 静的Next.jsアプリ、Supabase Auth、Magic Link、Auth Callback、未認証ガード、共通レイアウトを作る。
- 完了条件: A1認証画面、`/auth/callback/`、セッション取得、ログアウト、業務画面の未認証ガードが動く。
- 依存関係: M0、Deployment Contract、Tech Stack。
- 主なリスク: API Routes、SSR、Server Actions、動的ルートを使ってしまうこと。
- スコープ逸脱しやすい注意点: SNSログイン、プロフィール、公開導線を作らない。

### M2: 研究ライン

- 目的: 研究ラインのDB/RLS、データアクセス、一覧、作成、編集、アーカイブを実装する。
- 完了条件: 本人の研究ラインだけを一覧・作成・編集・アーカイブでき、アーカイブ済みは通常一覧と新規試行選択から除外される。
- 依存関係: M1、DB/RLS基盤。
- 主なリスク: 物理削除を実装してしまうこと、アーカイブ済みラインの既存試行参照を壊すこと。
- スコープ逸脱しやすい注意点: 公開状態、フォロー、投稿数、いいね数を表示しない。

### M3: 試行作成/編集 + 材料行 + RPC

- 目的: 試行本体と材料行を、`save_trial_with_ingredients` RPC経由で保存・編集できるようにする。
- 完了条件: T1から試行と材料行を一括保存でき、保存失敗時に入力が保持され、T2で保存内容を確認できる。
- 依存関係: M2、RPC migration、データアクセス層。
- 主なリスク: UIまたはデータアクセス層から `trials` / `trial_ingredients` を直接書き込むこと、材料行だけ保存される部分成功を残すこと。
- スコープ逸脱しやすい注意点: 写真、カスタム項目、評価テンプレートを追加しない。

### M4: 複製/論理削除/スター

- 目的: 試行複製、論理削除、スター付け外しを実装する。
- 完了条件: `clone_trial` で材料行をコピーしスターをコピーせず、`soft_delete_trial` で本人の未削除試行だけを論理削除でき、スター絞り込みに必要な状態を扱える。
- 依存関係: M3。
- 主なリスク: 複製時にスターや作成日時をコピーすること、論理削除を直接updateで行うこと。
- スコープ逸脱しやすい注意点: お気に入り棚、定番昇格、系譜グラフへ広げない。

### M5: 履歴/絞り込み/詳細

- 目的: T3履歴、L2の試行一覧、T2詳細、親試行リンク、研究ライン・スター・日付範囲絞り込みを完成させる。
- 完了条件: 自分の未削除試行だけを最新順で50件単位に表示し、絞り込み、詳細遷移、親試行リンク表示ができる。
- 依存関係: M3、M4。
- 主なリスク: 削除済み試行や他ユーザーIDの詳細を表示すること、カレンダーや比較導線を追加すること。
- スコープ逸脱しやすい注意点: グラフ、ランキング、複数件比較を置かない。

### M6: ローカル下書き

- 目的: 同一ブラウザ内、認証ユーザー単位の軽量下書きを実装する。
- 完了条件: T1入力中に下書きを保存、復元、破棄でき、ログアウト時に保持・破棄を確認できる。自動同期や自動再送はしない。
- 依存関係: M1、M3。
- 主なリスク: サーバー保存や複数端末同期を期待させること、別ユーザーに下書きを復元すること。
- スコープ逸脱しやすい注意点: Dexie.js、Workbox、キュー再送を追加しない。

### M7: テスト強化/E2E/受け入れ確認

- 目的: unit、component、RLS、RPC、E2E、画面受け入れ基準をまとめて確認する。
- 完了条件: 主要テストが実行でき、未実施の検証があれば明示され、モバイル390x844とデスクトップ1280x800で主要画面が崩れない。
- 依存関係: M1〜M6。
- 主なリスク: UIだけ動いてRLSやRPC異常系が未検証のまま完了扱いにすること。
- スコープ逸脱しやすい注意点: テスト補助のために本番UIへ未実装導線を入れない。

### M8: デプロイ前確認

- 目的: Cloudflare Pages静的デプロイ、環境変数、Auth Redirect、ビルド成果物、セキュリティを確認する。
- 完了条件: `out` が生成され、API Routes/Functions/SSRが存在せず、許可された `NEXT_PUBLIC_*` だけを使い、Redirect URLが環境ごとに確認されている。
- 依存関係: M0〜M7。
- 主なリスク: PreviewでProduction Supabaseを使うこと、`service_role` や外部キーが混入すること。
- スコープ逸脱しやすい注意点: Cloudflare WorkersやPages Functionsへ逃がさない。

## 7. 詳細タスク分解

### M0: 実装準備・基盤確認

#### M0-01 リポジトリ現状確認

- タスクID: M0-01
- タスク名: リポジトリ構成と未実装基盤の確認
- 優先度/サイズ: P0 / S
- 目的: docs-only状態か、既存実装があるか、既存変更があるかを確認する。
- 対応レイヤー: Docs / Test / Deploy
- 参照すべき文書: README、tech-stack、deployment-contract、codex-execution-rules
- 着手条件: 実装ブランチで作業前に実行する。
- 具体作業: `git status`、ルートファイル、`docs`、既存設定ファイルの有無を確認し、実装開始時の前提を記録する。
- 変更対象になりそうなファイル/ディレクトリ: なし。必要なら作業メモ。
- 完了条件: 実装基盤として不足しているファイルと既存変更の扱いが明確である。
- テスト観点: なし。確認結果をM0作業記録またはPR説明に残す。
- 想定リスク: 未追跡またはユーザー変更を上書きする。
- スコープ逸脱防止メモ: このタスクではアプリ機能を作らない。

#### M0-02 Node/npm/静的export方針の固定

- タスクID: M0-02
- タスク名: Node.jsとnpmの実装基盤方針決定
- 優先度/サイズ: P0 / S
- 目的: Cloudflare Pagesとローカル開発で同じNodeメジャーを使えるようにする。
- 対応レイヤー: Deploy / Docs
- 参照すべき文書: tech-stack、deployment-contract
- 着手条件: M0-01完了。
- 具体作業: Node LTSメジャーを選定し、最初の実装PRで `.nvmrc`、`package.json` engines、npm lockfile、Cloudflare Pages設定をそろえる方針を決める。
- 変更対象になりそうなファイル/ディレクトリ: `.nvmrc`、`package.json`、`package-lock.json`
- 完了条件: Nodeメジャー、npm使用、静的exportの前提が説明できる。
- テスト観点: `npm install`、`npm run build` が同じNodeメジャーで通ることを後続で確認する。
- 想定リスク: npm以外のlockfile混入、CloudflareとローカルのNode差分。
- スコープ逸脱防止メモ: テンプレート由来の不要ライブラリを増やさない。

#### M0-03 Supabase環境分離の確認

- タスクID: M0-03
- タスク名: Supabase local/preview/production方針確認
- 優先度/サイズ: P0 / M
- 目的: RLSとAuthの検証をProductionデータから分離して進める。
- 対応レイヤー: DB / RLS / Deploy / Test
- 参照すべき文書: deployment-contract、db-migration-rls-policy、supabase-data-access-error-contract
- 着手条件: M0-01完了。
- 具体作業: local Supabaseを使うか、preview用Supabaseプロジェクトを用意するか、環境変数の配置、Redirect URLの登録方針を確認する。
- 変更対象になりそうなファイル/ディレクトリ: `supabase/`、`.env.local.example`、READMEまたは作業メモ
- 完了条件: local/preview/productionのデータ分離、Auth Redirect、anon keyの扱いが明確である。
- テスト観点: PreviewでProductionデータを参照しないこと、`service_role` をブラウザに置かないこと。
- 想定リスク: RLSテストがProductionに触れる、Previewで本番データを見てしまう。
- スコープ逸脱防止メモ: Supabase Storage、Realtime、外部AIキーは設定しない。

#### M0-04 RLS/RPCテスト方式の決定

- タスクID: M0-04
- タスク名: DB/RLS/RPCテスト基盤方針決定
- 優先度/サイズ: P0 / M
- 目的: ユーザーA/B分離、直接書き込み禁止、RPC正常/異常を検証できる形を決める。
- 対応レイヤー: DB / RLS / RPC / Test
- 参照すべき文書: db-migration-rls-policy、app-lld、supabase-data-access-error-contract
- 着手条件: M0-03の環境方針が見えていること。
- 具体作業: Supabase local、SQLテスト、認証済みクライアントによる統合テストのどれを使うかを決め、CIで実行する範囲を整理する。
- 変更対象になりそうなファイル/ディレクトリ: `supabase/`、`tests/`、`.github/workflows/` またはCI設定
- 完了条件: RLS必須テスト一覧と実行方法が説明できる。
- テスト観点: ユーザーA/B分離、直接insert/update/delete拒否、RPC複製、スター非コピー、論理削除。
- 想定リスク: DBテストが手動確認だけになり、RLS不備を見逃す。
- スコープ逸脱防止メモ: テストのためにRLSを一時的に弱めない。

#### M0-05 ライブラリ追加ルールの確認

- タスクID: M0-05
- タスク名: 依存追加の事前審査ルール確認
- 優先度/サイズ: P0 / S
- 目的: v1標準スタック以外の導入を防ぐ。
- 対応レイヤー: Docs / Deploy
- 参照すべき文書: tech-stack、codex-execution-rules
- 着手条件: 実装基盤作成前。
- 具体作業: Next.js、React、TypeScript、Supabase Client、React Hook Form、Zod、TanStack Query、Tailwind、必要最小限のRadix、Vitest、RTL、Playwright以外を追加しない運用を明確にする。
- 変更対象になりそうなファイル/ディレクトリ: `package.json`
- 完了条件: 依存追加時に説明すべき理由、代替案、影響範囲がPRテンプレートまたは作業メモに反映される。
- テスト観点: lockfile差分に不要依存がないことをレビューする。
- 想定リスク: 便利なUI/日付/状態管理ライブラリを安易に追加する。
- スコープ逸脱防止メモ: React Flow、D3、Dexie、Workbox、Storage系、AI系はv1で追加しない。

### M1: 認証/アプリ骨格

#### M1-01 Next.js静的アプリの最小スキャフォールド

- タスクID: M1-01
- タスク名: Next.js + React + TypeScript基盤作成
- 優先度/サイズ: P0 / M
- 目的: Cloudflare Pagesへ静的exportできる最小アプリを用意する。
- 対応レイヤー: UI / Deploy / Test
- 参照すべき文書: tech-stack、deployment-contract、app-design
- 着手条件: M0-02完了。
- 具体作業: Next.js静的export、TypeScript strict、ESLint/Prettier、Tailwind、テストランナーの土台を作る。
- 変更対象になりそうなファイル/ディレクトリ: `package.json`、`next.config.*`、`tsconfig.json`、`src/`、`app/` または `pages/`、`tailwind.config.*`
- 完了条件: 空のv1アプリが静的ビルドできる。
- テスト観点: lint、typecheck、buildが通る。
- 想定リスク: SSRやServer Actions前提の構成を選ぶ。
- スコープ逸脱防止メモ: この段階で業務画面を作り込まない。

#### M1-02 Supabase Clientと環境変数の導入

- タスクID: M1-02
- タスク名: Supabase公開環境変数とClient初期化
- 優先度/サイズ: P0 / S
- 目的: ブラウザからanon keyだけでSupabaseへ接続する。
- 対応レイヤー: Data Access / Deploy
- 参照すべき文書: deployment-contract、supabase-data-access-error-contract
- 着手条件: M1-01完了、M0-03の環境方針があること。
- 具体作業: `NEXT_PUBLIC_SUPABASE_URL`、`NEXT_PUBLIC_SUPABASE_ANON_KEY`、`NEXT_PUBLIC_APP_ORIGIN` を使うClient初期化を作る。
- 変更対象になりそうなファイル/ディレクトリ: `src/lib/supabase/`、`.env.local.example`
- 完了条件: `service_role` やDB接続文字列を使わず、Supabase Clientを初期化できる。
- テスト観点: 環境変数不足時の開発者向け検出、機密キー混入チェック。
- 想定リスク: `service_role` を誤ってフロントに置く。
- スコープ逸脱防止メモ: Storage、Realtime、外部AI環境変数を追加しない。

#### M1-03 Authデータアクセス層

- タスクID: M1-03
- タスク名: Auth操作のデータアクセス関数作成
- 優先度/サイズ: P0 / M
- 目的: UIから直接Supabase Authを呼ばない境界を作る。
- 対応レイヤー: Data Access / Test
- 参照すべき文書: supabase-data-access-error-contract、codex-execution-rules
- 着手条件: M1-02完了。
- 具体作業: セッション取得、Magic Link送信、ログアウトを `AppResult` 相当で返す関数として実装する。
- 変更対象になりそうなファイル/ディレクトリ: `src/features/auth/`、`src/lib/result/`
- 完了条件: AUTH_REQUIRED、AUTH_EXPIRED、RATE_LIMITED、NETWORK_ERROR、SERVER_ERRORをUI向けに正規化できる。
- テスト観点: メール形式不正、送信成功、送信失敗、セッションなし。
- 想定リスク: Supabaseの生エラーをUIへ漏らす。
- スコープ逸脱防止メモ: SNSログインを追加しない。

#### M1-04 A1認証画面とAuth Callback

- タスクID: M1-04
- タスク名: Magic Link認証画面とクライアントcallback
- 優先度/サイズ: P0 / M
- 目的: 未認証ユーザーがMagic Linkでログインできる入口を作る。
- 対応レイヤー: UI / Data Access / Test / Deploy
- 参照すべき文書: app-design、screen-acceptance-criteria、deployment-contract
- 着手条件: M1-03完了。
- 具体作業: A1にメール入力、送信、送信後案内、失敗状態を作り、`/auth/callback/` でブラウザ上のセッション確定後ホームへ遷移する。
- 変更対象になりそうなファイル/ディレクトリ: `src/app/auth/` または固定ルート、`src/features/auth/`
- 完了条件: SNSログインなし、公開/共有文言なし、メール入力検証あり、callbackが静的ページとして生成される。
- テスト観点: 空メール、形式不正、送信成功状態、送信失敗状態、認証切れ表示。
- 想定リスク: サーバー側callbackやAPI Routeを作る。
- スコープ逸脱防止メモ: `/users/[id]` やプロフィール画面を作らない。

#### M1-05 共通レイアウトと認証ガード

- タスクID: M1-05
- タスク名: v1共通ナビゲーションと未認証ガード
- 優先度/サイズ: P0 / M
- 目的: 業務画面に未認証ユーザーが入れない基本導線を作る。
- 対応レイヤー: UI / Data Access / Test
- 参照すべき文書: app-design、screen-acceptance-criteria、deployment-contract
- 着手条件: M1-04完了。
- 具体作業: ホーム、研究ライン、履歴、設定への固定ルートと下部ナビを作り、未認証時はA1へ誘導する。
- 変更対象になりそうなファイル/ディレクトリ: `src/components/layout/`、`src/app/` または固定ページ群
- 完了条件: API Routesや動的IDルートなしで固定ページが表示される。
- テスト観点: 未認証で業務画面へ入れない、認証切れ時にログインへ戻る。
- 想定リスク: 公開ページや他ユーザー導線を作る。
- スコープ逸脱防止メモ: ナビに公開、共有、AI、写真、比較を置かない。

### M2: 研究ライン

#### M2-01 v1コアDBテーブルとRLS helper migration

- タスクID: M2-01
- タスク名: v1業務テーブルと所有者判定基盤のmigration
- 優先度/サイズ: P0 / L
- 目的: 研究ラインから試行までのv1業務データ境界をDBに作る。
- 対応レイヤー: DB / RLS / Test
- 参照すべき文書: app-lld、db-migration-rls-policy、mvp-scope-contract
- 着手条件: M0-03、M0-04完了。
- 具体作業: `research_lines`、`trials`、`trial_ingredients`、`trial_stars`、必要インデックス、所有者確認helper、基本権限をmigration単位で作る。
- 変更対象になりそうなファイル/ディレクトリ: `supabase/migrations/`
- 完了条件: v1許可4テーブル以外を作らず、RLSを有効化し、anonへの業務データ権限がない。
- テスト観点: 未認証で読めない、ユーザーA/B分離、直接書き込み禁止の土台。
- 想定リスク: 公開・写真・カスタム項目の先回りカラムを入れる。
- スコープ逸脱防止メモ: DBはv1許可テーブルだけに限定する。

#### M2-02 研究ラインRLSと権限テスト

- タスクID: M2-02
- タスク名: 研究ラインの本人限定RLS検証
- 優先度/サイズ: P0 / M
- 目的: 研究ラインが本人だけに見え、作成・編集・アーカイブできることを確認する。
- 対応レイヤー: RLS / Test
- 参照すべき文書: db-migration-rls-policy、app-lld
- 着手条件: M2-01完了。
- 具体作業: select/insert/updateのUSING/WITH CHECK、delete不可、他ユーザー不可をテストする。
- 変更対象になりそうなファイル/ディレクトリ: `supabase/tests/`、`tests/rls/`
- 完了条件: ユーザーAがBの研究ラインを読めず、物理削除できない。
- テスト観点: 作成成功、重複失敗、他ユーザー取得0件または権限エラー、delete失敗。
- 想定リスク: RLSはあるがdelete権限が残る。
- スコープ逸脱防止メモ: 公開読み取りポリシーを作らない。

#### M2-03 Research Linesデータアクセス層

- タスクID: M2-03
- タスク名: 研究ライン取得・作成・編集・アーカイブ関数
- 優先度/サイズ: P0 / M
- 目的: UIがSupabaseを直接呼ばずに研究ラインを扱えるようにする。
- 対応レイヤー: Data Access / Test
- 参照すべき文書: supabase-data-access-error-contract、app-lld
- 着手条件: M2-01、M2-02完了。
- 具体作業: 通常一覧、選択用一覧、詳細、作成、編集、アーカイブの関数を作り、`AppResult` に正規化する。
- 変更対象になりそうなファイル/ディレクトリ: `src/features/research-lines/`
- 完了条件: アーカイブ済みを用途別に扱い分けられる。
- テスト観点: AUTH_REQUIRED、CONFLICT、FORBIDDEN、NOT_FOUND、NETWORK_ERROR相当。
- 想定リスク: UI用一覧と新規試行選択用一覧を混同する。
- スコープ逸脱防止メモ: 物理削除関数を作らない。

#### M2-04 L1研究ライン一覧UI

- タスクID: M2-04
- タスク名: 研究ライン一覧、作成、編集、アーカイブUI
- 優先度/サイズ: P0 / L
- 目的: L1で研究ラインを管理できるようにする。
- 対応レイヤー: UI / Test
- 参照すべき文書: app-design、screen-acceptance-criteria
- 着手条件: M2-03完了。
- 具体作業: 研究ラインカード、作成/編集フォーム、アーカイブ確認、空/ロード/エラー状態を実装する。
- 変更対象になりそうなファイル/ディレクトリ: `src/features/research-lines/`、`src/components/ui/`
- 完了条件: 未アーカイブ研究ラインを表示し、保存失敗時に入力を保持する。
- テスト観点: 必須名、説明任意、重複エラー、アーカイブ確認、モバイル1カラム。
- 想定リスク: アーカイブを削除として表現しすぎる。
- スコープ逸脱防止メモ: 投稿数、公開状態、フォローを表示しない。

#### M2-05 L2研究ライン詳細の最小実装

- タスクID: M2-05
- タスク名: 研究ライン詳細と試行一覧枠
- 優先度/サイズ: P1 / M
- 目的: 研究ライン概要と、そのラインの試行一覧を表示する固定ページを用意する。
- 対応レイヤー: UI / Data Access / Test
- 参照すべき文書: app-lld、app-design、screen-acceptance-criteria、deployment-contract
- 着手条件: M2-03完了。
- 具体作業: `/research-lines/detail?id=...` 形式で本人の研究ラインを取得し、試行一覧はM5で接続できる枠を作る。
- 変更対象になりそうなファイル/ディレクトリ: `src/app/research-lines/detail/`、`src/features/research-lines/`
- 完了条件: 存在しないIDや権限なしで内部IDを出さず表示不可を示す。
- テスト観点: クエリパラメータID取得、NOT_FOUND表示、固定ルート生成。
- 想定リスク: `/research-lines/[id]` を作る。
- スコープ逸脱防止メモ: 系譜グラフや公開設定を置かない。

### M3: 試行作成/編集 + 材料行 + RPC

#### M3-01 `save_trial_with_ingredients` RPC migration

- タスクID: M3-01
- タスク名: 試行保存RPC作成
- 優先度/サイズ: P0 / L
- 目的: 試行本体と材料行を1トランザクションで保存する。
- 対応レイヤー: DB / RLS / RPC / Test
- 参照すべき文書: app-lld、db-migration-rls-policy、supabase-data-access-error-contract
- 着手条件: M2-01完了、RLSテスト基盤あり。
- 具体作業: `save_trial_with_ingredients(input jsonb)` をmigrationで追加し、所有者、未アーカイブ研究ライン、未削除試行、親試行、未知キー、材料行1件以上、親子循環を検証する。
- 変更対象になりそうなファイル/ディレクトリ: `supabase/migrations/`、`supabase/tests/`
- 完了条件: 一部保存を残さず、成功時に保存後trial IDを返す。
- テスト観点: 新規、編集、材料全置換、他ユーザー研究ライン拒否、材料0件拒否、循環拒否。
- 想定リスク: JSONBをカスタム項目保存に流用する。
- スコープ逸脱防止メモ: 入力JSONは定義済み形だけ許可する。

#### M3-02 Trialsデータアクセス層の保存・詳細取得

- タスクID: M3-02
- タスク名: 試行保存と詳細取得関数
- 優先度/サイズ: P0 / L
- 目的: UIからRPCを通じて試行と材料行を扱う。
- 対応レイヤー: Data Access / Test
- 参照すべき文書: supabase-data-access-error-contract、app-lld
- 着手条件: M3-01完了。
- 具体作業: 保存、編集、詳細取得、材料行取得、親試行参照情報取得をデータアクセス層に作る。
- 変更対象になりそうなファイル/ディレクトリ: `src/features/trials/`、`src/lib/result/`
- 完了条件: `trials` と `trial_ingredients` の直接insert/update/deleteが存在しない。
- テスト観点: VALIDATION_ERROR、FORBIDDEN、NOT_FOUND、CONFLICT、SERVER_ERRORの正規化。
- 想定リスク: RPCエラーをすべてUNKNOWNに丸めてUXが悪くなる。
- スコープ逸脱防止メモ: 保存関数にスター状態や公開状態を混ぜない。

#### M3-03 試行フォームスキーマと材料行UI部品

- タスクID: M3-03
- タスク名: T1入力スキーマとフォーム部品
- 優先度/サイズ: P0 / L
- 目的: UI、Zod、DB制約に沿った試行入力を作る。
- 対応レイヤー: UI / Test
- 参照すべき文書: app-lld、app-design、screen-acceptance-criteria
- 着手条件: M2-03、M3-02完了。
- 具体作業: 研究ライン、試行名、日付、材料行、評価、一言メモ、次回の狙い、詳細項目のフォームを作る。材料カテゴリと単位候補をv1定義に限定する。
- 変更対象になりそうなファイル/ディレクトリ: `src/features/trials/components/`、`src/features/trials/schema/`
- 完了条件: 必須、文字数、数値範囲、材料行0件を保存前に検出できる。
- テスト観点: Zod単体、React Testing Libraryでエラー表示、入力保持。
- 想定リスク: 写真欄やカスタム項目を追加する。
- スコープ逸脱防止メモ: 詳細項目は煮出し時間、沸騰回数、こし方のみ。

#### M3-04 T1試行作成/編集画面

- タスクID: M3-04
- タスク名: 試行入力フォーム画面
- 優先度/サイズ: P0 / L
- 目的: ユーザーが試行を保存・編集できる主要画面を作る。
- 対応レイヤー: UI / Data Access / Test
- 参照すべき文書: app-design、screen-acceptance-criteria、deployment-contract
- 着手条件: M3-03完了。
- 具体作業: `/trials/edit?id=...` または新規用固定ページで、フォーム、保存、保存中二重送信防止、保存失敗、保存成功後詳細遷移を実装する。
- 変更対象になりそうなファイル/ディレクトリ: `src/app/trials/edit/`、`src/features/trials/`
- 完了条件: 保存失敗時に入力が保持される。新規選択肢にアーカイブ済み研究ラインが出ない。
- テスト観点: 新規保存、編集保存、保存失敗、未認証、アーカイブライン除外。
- 想定リスク: 動的ルートを使う。
- スコープ逸脱防止メモ: フォーム内に公開設定、AI提案、写真欄を置かない。

#### M3-05 T2試行詳細の保存内容表示

- タスクID: M3-05
- タスク名: 試行詳細の基本表示
- 優先度/サイズ: P0 / M
- 目的: 保存された試行内容と材料行を読み返せるようにする。
- 対応レイヤー: UI / Data Access / Test
- 参照すべき文書: app-design、screen-acceptance-criteria、deployment-contract
- 着手条件: M3-02完了。
- 具体作業: `/trials/detail?id=...` で試行名、日付、研究ライン、評価、材料行、詳細項目、メモ、次回の狙いを表示する。
- 変更対象になりそうなファイル/ディレクトリ: `src/app/trials/detail/`、`src/features/trials/`
- 完了条件: 他ユーザーID、存在しないID、論理削除済みIDを表示不可にできる。
- テスト観点: 詳細取得成功、NOT_FOUND、FORBIDDEN相当、ローディング、空に近い状態。
- 想定リスク: 削除済み試行を通常詳細で表示する。
- スコープ逸脱防止メモ: 写真カルーセルや共有ボタンを置かない。

### M4: 複製/論理削除/スター

#### M4-01 `clone_trial` RPC migration

- タスクID: M4-01
- タスク名: 試行複製RPC作成
- 優先度/サイズ: P0 / L
- 目的: 自分の未削除試行を複製し、新しい試行を作る。
- 対応レイヤー: DB / RLS / RPC / Test
- 参照すべき文書: app-lld、db-migration-rls-policy、supabase-data-access-error-contract
- 着手条件: M3-01完了。
- 具体作業: `clone_trial(source_trial_id uuid)` を追加し、元試行所有者、未削除、未アーカイブ研究ライン、材料行コピー、スター非コピーを実装する。
- 変更対象になりそうなファイル/ディレクトリ: `supabase/migrations/`、`supabase/tests/`
- 完了条件: 成功時に新しいtrial IDを返し、`parent_trial_id` が元試行IDになる。
- テスト観点: 他ユーザー拒否、論理削除済み拒否、アーカイブライン拒否、スター非コピー。
- 想定リスク: 作成日時やスターをコピーする。
- スコープ逸脱防止メモ: 系譜グラフ用の追加テーブルを作らない。

#### M4-02 `soft_delete_trial` RPC migration

- タスクID: M4-02
- タスク名: 試行論理削除RPC作成
- 優先度/サイズ: P0 / M
- 目的: 本人の未削除試行だけを論理削除できるようにする。
- 対応レイヤー: DB / RLS / RPC / Test
- 参照すべき文書: app-lld、db-migration-rls-policy、supabase-data-access-error-contract
- 着手条件: M3-01完了。
- 具体作業: `soft_delete_trial(trial_id uuid)` を追加し、所有者確認、未削除確認、`deleted_at` 設定、物理削除なしを実装する。
- 変更対象になりそうなファイル/ディレクトリ: `supabase/migrations/`、`supabase/tests/`
- 完了条件: 関連材料行とスターを物理削除しない。
- テスト観点: 本人成功、他ユーザー拒否、既に削除済みCONFLICT、物理削除なし。
- 想定リスク: UIやデータアクセスから直接updateする。
- スコープ逸脱防止メモ: 試行物理削除はv1で提供しない。

#### M4-03 複製・論理削除データアクセス層

- タスクID: M4-03
- タスク名: clone/delete関数の正規化
- 優先度/サイズ: P0 / M
- 目的: RPC結果とエラーをUI向けに扱う。
- 対応レイヤー: Data Access / Test
- 参照すべき文書: supabase-data-access-error-contract、app-lld
- 着手条件: M4-01、M4-02完了。
- 具体作業: 複製、論理削除、複製後詳細または編集遷移に必要な関数を作る。
- 変更対象になりそうなファイル/ディレクトリ: `src/features/trials/`
- 完了条件: RPC失敗時に現在画面と入力済み内容を保持できる。
- テスト観点: NOT_FOUND、FORBIDDEN、CONFLICT、SERVER_ERRORの表示方針。
- 想定リスク: 論理削除で `trials` 直接updateを使う。
- スコープ逸脱防止メモ: 削除後のゴミ箱画面を作らない。

#### M4-04 スターデータアクセスとRLS確認

- タスクID: M4-04
- タスク名: スター付与・解除
- 優先度/サイズ: P0 / M
- 目的: 本人の試行にだけスターを付け外しする。
- 対応レイヤー: Data Access / RLS / Test
- 参照すべき文書: app-lld、db-migration-rls-policy、supabase-data-access-error-contract
- 着手条件: M2-01、M3-05完了。
- 具体作業: `trial_stars` のselect/insert/delete関数、楽観更新または失敗時復元方針を作る。
- 変更対象になりそうなファイル/ディレクトリ: `src/features/stars/`、`supabase/tests/`
- 完了条件: 既にスター済み/解除済みを成功扱いまたは再試行可能にできる。
- テスト観点: 他ユーザー試行へのスター失敗、削除済み試行へのスター失敗、絞り込み用状態取得。
- 想定リスク: スターをお気に入り棚や定番化として扱う。
- スコープ逸脱防止メモ: trial_stars以外の棚テーブルを作らない。

#### M4-05 T2主要アクション実装

- タスクID: M4-05
- タスク名: 詳細画面の複製、編集、スター、論理削除
- 優先度/サイズ: P0 / L
- 目的: T2から主要操作を完結できるようにする。
- 対応レイヤー: UI / Data Access / Test
- 参照すべき文書: app-design、screen-acceptance-criteria
- 着手条件: M4-03、M4-04完了。
- 具体作業: 「複製して編集」、編集、スター、削除確認、削除後遷移、失敗時表示を作る。
- 変更対象になりそうなファイル/ディレクトリ: `src/features/trials/`、`src/components/ui/`
- 完了条件: 複製後の新試行に親試行が設定され、スターはコピーされない。
- テスト観点: 複製成功、スター付け外し、削除確認、削除後履歴またはライン詳細へ戻る。
- 想定リスク: 比較ボタンや共有ボタンを追加する。
- スコープ逸脱防止メモ: 主要アクションは複製、編集、スターに限定する。

### M5: 履歴/絞り込み/詳細

#### M5-01 試行一覧データアクセス層

- タスクID: M5-01
- タスク名: 履歴・ライン別一覧取得
- 優先度/サイズ: P0 / M
- 目的: 自分の未削除試行を最新順で取得し、絞り込みできるようにする。
- 対応レイヤー: Data Access / Test
- 参照すべき文書: supabase-data-access-error-contract、screen-acceptance-criteria、app-lld
- 着手条件: M3-02、M4-04完了。
- 具体作業: 研究ライン、スター有無、日付範囲、50件単位取得、`brewed_at DESC, created_at DESC` 並びを実装する。
- 変更対象になりそうなファイル/ディレクトリ: `src/features/trials/`
- 完了条件: 通常一覧に論理削除済み試行が出ない。
- テスト観点: 初回50件、追加50件、条件0件、通信失敗、認証切れ。
- 想定リスク: 大量集計やグラフ用取得を作る。
- スコープ逸脱防止メモ: 一覧は履歴とライン詳細用に限定する。

#### M5-02 T3試行履歴UI

- タスクID: M5-02
- タスク名: 試行履歴と絞り込み画面
- 優先度/サイズ: P0 / L
- 目的: ユーザーが過去試行を最新順で読み返せるようにする。
- 対応レイヤー: UI / Test
- 参照すべき文書: app-design、screen-acceptance-criteria
- 着手条件: M5-01完了。
- 具体作業: TrialCard、研究ラインフィルタ、スター有無、日付範囲、追加読み込み、空/エラー状態を作る。
- 変更対象になりそうなファイル/ディレクトリ: `src/app/trials/history/`、`src/features/trials/`
- 完了条件: カードから詳細へ遷移でき、絞り込み0件時に条件解除導線がある。
- テスト観点: モバイル1カラム、デスクトップ幅、ローディング、空状態、エラー状態。
- 想定リスク: カレンダー、グラフ、ランキングを置く。
- スコープ逸脱防止メモ: 他ユーザーの試行や公開試行を表示しない。

#### M5-03 L2試行一覧接続

- タスクID: M5-03
- タスク名: 研究ライン詳細の試行一覧接続
- 優先度/サイズ: P1 / M
- 目的: L2でラインに属する試行を表示し、新しい試行へ進める。
- 対応レイヤー: UI / Data Access / Test
- 参照すべき文書: app-design、screen-acceptance-criteria
- 着手条件: M2-05、M5-01完了。
- 具体作業: ライン概要、最新順試行一覧、スター絞り込み、新しい試行ボタン、空/エラー状態を作る。
- 変更対象になりそうなファイル/ディレクトリ: `src/app/research-lines/detail/`、`src/features/research-lines/`
- 完了条件: アーカイブ済みラインも既存試行参照として表示できるが、新規試行選択には出さない。
- テスト観点: 試行なし空状態、権限なし、スター絞り込み。
- 想定リスク: アーカイブ済みラインを完全に見えなくして既存試行参照を壊す。
- スコープ逸脱防止メモ: 系譜表示を置かない。

#### M5-04 親試行リンク表示

- タスクID: M5-04
- タスク名: T2の元にした試行リンク
- 優先度/サイズ: P0 / M
- 目的: 複製元をリンクとして読み返せるようにする。
- 対応レイヤー: UI / Data Access / Test
- 参照すべき文書: screen-acceptance-criteria、app-design、app-lld
- 着手条件: M4-01、M3-05完了。
- 具体作業: 親試行が表示可能な場合は詳細リンク、削除済みまたは表示不可の場合は内部IDなしの表示不可メッセージを出す。
- 変更対象になりそうなファイル/ディレクトリ: `src/features/trials/`
- 完了条件: 親子関係をグラフ化せず、親1件のリンク表示に留める。
- テスト観点: 親あり、親なし、親削除済み、親表示不可。
- 想定リスク: 系譜ビューへ拡張する。
- スコープ逸脱防止メモ: `parent_trial_id` のリンク表示だけにする。

#### M5-05 H1ホーム接続

- タスクID: M5-05
- タスク名: ホームの直近試行と主要導線
- 優先度/サイズ: P1 / M
- 目的: 初回導線と継続導線を分けて表示する。
- 対応レイヤー: UI / Data Access / Test
- 参照すべき文書: app-design、screen-acceptance-criteria
- 着手条件: M2-04、M5-01、M4-05完了。
- 具体作業: 研究ラインがない空状態、試行がない空状態、直近試行、最近の試行3〜5件、「前回を複製して編集」を実装する。
- 変更対象になりそうなファイル/ディレクトリ: `src/app/`、`src/features/home/`
- 完了条件: 既存試行がある場合は複製導線が最も目立つ。
- テスト観点: 初回、ラインあり試行なし、試行あり、読み込み失敗、認証切れ。
- 想定リスク: 公開フィードや写真カードを置く。
- スコープ逸脱防止メモ: ホームは個人ログの入口に限定する。

### M6: ローカル下書き

#### M6-01 Drafts保存形式と名前空間

- タスクID: M6-01
- タスク名: 認証ユーザー単位のlocalStorage下書き設計
- 優先度/サイズ: P0 / M
- 目的: 同一ブラウザ内で入力途中の試行を復元できるようにする。
- 対応レイヤー: Data Access / UI / Test
- 参照すべき文書: app-lld、supabase-data-access-error-contract、screen-acceptance-criteria
- 着手条件: M1-03、M3-03完了。
- 具体作業: `chai-lab:draft:v1:<user_id>` 相当のキー、保存対象、破棄、復元、別ユーザー拒否を実装する。
- 変更対象になりそうなファイル/ディレクトリ: `src/features/drafts/`
- 完了条件: 未認証状態や別ユーザーでは復元されない。
- テスト観点: 保存、復元、破棄、別ユーザー、localStorage利用不可時。
- 想定リスク: サーバー下書きテーブルを作る。
- スコープ逸脱防止メモ: 自動同期、自動再送、複数端末同期を実装しない。

#### M6-02 T1下書きUI

- タスクID: M6-02
- タスク名: 試行フォームの下書き保存・復元・破棄
- 優先度/サイズ: P0 / M
- 目的: 保存前入力をユーザー操作で守れるようにする。
- 対応レイヤー: UI / Test
- 参照すべき文書: app-design、screen-acceptance-criteria
- 着手条件: M6-01完了。
- 具体作業: 下書き保存、下書きあり時の復元/破棄選択、未保存内容である表示、破棄確認を作る。
- 変更対象になりそうなファイル/ディレクトリ: `src/features/trials/`、`src/features/drafts/`
- 完了条件: 復元後もサーバーへ自動送信しない。
- テスト観点: 下書きあり/なし、復元、破棄、保存成功後の扱い。
- 想定リスク: オンライン復帰時の自動送信を追加する。
- スコープ逸脱防止メモ: 下書きは補助でありバックアップではないとUIで明示する。

#### M6-03 S1下書き管理とログアウト確認

- タスクID: M6-03
- タスク名: 設定画面のログアウトと下書き管理
- 優先度/サイズ: P1 / M
- 目的: ユーザーが下書きを確認・破棄し、ログアウト時の扱いを選べるようにする。
- 対応レイヤー: UI / Data Access / Test
- 参照すべき文書: app-design、screen-acceptance-criteria
- 着手条件: M6-01、M1-03完了。
- 具体作業: ログアウト、下書き有無表示、破棄確認、ログアウト時の保持/破棄確認を作る。
- 変更対象になりそうなファイル/ディレクトリ: `src/app/settings/`、`src/features/settings/`、`src/features/drafts/`
- 完了条件: データエクスポート、公開設定、AI設定を置かない。
- テスト観点: 下書きなし、有り、破棄、ログアウト確認。
- 想定リスク: 未実装将来機能を設定に並べる。
- スコープ逸脱防止メモ: S1はログアウトと下書き管理のみ。

### M7: テスト強化/E2E/受け入れ確認

#### M7-01 ユニットテスト強化

- タスクID: M7-01
- タスク名: バリデーションと表示ロジックの単体テスト
- 優先度/サイズ: P0 / M
- 目的: 入力制約、エラー正規化、下書き、表示ロジックを安定させる。
- 対応レイヤー: Test
- 参照すべき文書: app-lld、supabase-data-access-error-contract、tech-stack
- 着手条件: M3〜M6の対象実装完了。
- 具体作業: Zodスキーマ、AppResult/AppError、材料行、日付範囲、下書きkey、フィルタ条件をテストする。
- 変更対象になりそうなファイル/ディレクトリ: `src/**/*.test.*`、`tests/unit/`
- 完了条件: v1の入力上限とエラー分類がテストで固定される。
- テスト観点: 境界値、空白のみ、未知カテゴリ、材料0件、数値範囲外。
- 想定リスク: UIテストだけで制約漏れを見逃す。
- スコープ逸脱防止メモ: テスト対象をv1機能に限定する。

#### M7-02 コンポーネントテスト

- タスクID: M7-02
- タスク名: フォーム・カード・状態表示のRTLテスト
- 優先度/サイズ: P0 / M
- 目的: 保存失敗時の入力保持やアクセシビリティを確認する。
- 対応レイヤー: Test / UI
- 参照すべき文書: screen-acceptance-criteria、app-design
- 着手条件: M2〜M6のUI実装完了。
- 具体作業: A1、L1フォーム、T1フォーム、T2アクション、T3フィルタ、S1下書き管理の主要状態をテストする。
- 変更対象になりそうなファイル/ディレクトリ: `src/features/**/*.test.*`
- 完了条件: ラベル、aria-label、エラー近接表示、確認ダイアログを確認できる。
- テスト観点: 空、ロード、失敗、認証切れ、入力保持。
- 想定リスク: 見た目だけで受け入れ基準を満たした扱いにする。
- スコープ逸脱防止メモ: 将来機能の無効ボタンをテスト前提にしない。

#### M7-03 RLS/RPC統合テスト

- タスクID: M7-03
- タスク名: DB境界とRPC異常系テスト
- 優先度/サイズ: P0 / L
- 目的: 非公開研究ログの安全性を検証する。
- 対応レイヤー: DB / RLS / RPC / Test
- 参照すべき文書: db-migration-rls-policy、app-lld
- 着手条件: M2〜M4のmigration完了。
- 具体作業: ユーザーA/B分離、未認証拒否、直接書き込み拒否、save/clone/delete正常異常、スター非コピーを確認する。
- 変更対象になりそうなファイル/ディレクトリ: `supabase/tests/`、`tests/rls/`
- 完了条件: DB変更に対する最低限の安全性テストが自動または明確な手順で実行できる。
- テスト観点: DB Migration & RLS PolicyのRLSテスト要件を全てカバーする。
- 想定リスク: security definer関数で所有者確認を忘れる。
- スコープ逸脱防止メモ: テストのために権限を広げない。

#### M7-04 Playwright E2E

- タスクID: M7-04
- タスク名: 主要導線のE2E確認
- 優先度/サイズ: P0 / L
- 目的: ユーザーがv1の中核体験を通しで使えることを確認する。
- 対応レイヤー: Test / UI / Data Access
- 参照すべき文書: screen-acceptance-criteria、tech-stack
- 着手条件: M1〜M6完了、E2E認証方式決定済み。
- 具体作業: 未認証誘導、研究ライン作成、試行作成、詳細確認、複製、親リンク、スター、保存失敗入力保持、下書き復元/破棄を確認する。
- 変更対象になりそうなファイル/ディレクトリ: `e2e/`、`playwright.config.*`
- 完了条件: Magic Linkメール配送を必須にせず、ログイン後導線を安定して検証できる。
- テスト観点: 画面別受け入れ基準のPlaywright確認項目1〜10。
- 想定リスク: 認証E2Eが不安定で主要導線テストが止まる。
- スコープ逸脱防止メモ: テスト専用の本番UI導線を追加しない。

#### M7-05 モバイル/デスクトップ表示確認

- タスクID: M7-05
- タスク名: 390x844と1280x800のレイアウト確認
- 優先度/サイズ: P0 / M
- 目的: 主要画面で要素の重なりや読みにくさを防ぐ。
- 対応レイヤー: UI / Test
- 参照すべき文書: screen-acceptance-criteria、app-design
- 着手条件: M7-04と並行可能。
- 具体作業: A1、H1、L1、L2、T1、T2、T3、S1のスクリーンショットまたは視覚確認を行う。
- 変更対象になりそうなファイル/ディレクトリ: `e2e/`、`test-results/`
- 完了条件: 主要要素が重ならず、フォームがモバイル1カラムで操作できる。
- テスト観点: 下部ナビ、フォーム幅、ボタン文字、エラー表示、確認ダイアログ。
- 想定リスク: デスクトップだけ整ってモバイルが崩れる。
- スコープ逸脱防止メモ: 見た目調整で任意の色や装飾を増やさない。

### M8: デプロイ前確認

#### M8-01 静的ビルド確認

- タスクID: M8-01
- タスク名: Next.js静的exportと出力確認
- 優先度/サイズ: P0 / S
- 目的: Cloudflare Pagesへ静的アプリとして配信できることを確認する。
- 対応レイヤー: Deploy / Test
- 参照すべき文書: deployment-contract、tech-stack
- 着手条件: M1〜M7完了。
- 具体作業: buildで `out` が生成され、API Routes、Server Actions、SSR、Pages Functionsが存在しないことを確認する。
- 変更対象になりそうなファイル/ディレクトリ: `next.config.*`、`out/`、CI設定
- 完了条件: Cloudflare PagesのBuild commandとOutput directoryに合う。
- テスト観点: `npm run build`、固定ルート生成、`/auth/callback/` 生成。
- 想定リスク: 動的ルートやSSR依存が混入する。
- スコープ逸脱防止メモ: ビルドのためにFunctionsへ逃がさない。

#### M8-02 環境変数と秘密情報確認

- タスクID: M8-02
- タスク名: フロント公開変数と機密混入チェック
- 優先度/サイズ: P0 / S
- 目的: ブラウザに置いてよい値だけを使う。
- 対応レイヤー: Deploy / Security
- 参照すべき文書: deployment-contract、supabase-data-access-error-contract
- 着手条件: M8-01完了。
- 具体作業: `NEXT_PUBLIC_SUPABASE_URL`、`NEXT_PUBLIC_SUPABASE_ANON_KEY`、`NEXT_PUBLIC_APP_ORIGIN` 以外の機密値がフロントにないか確認する。
- 変更対象になりそうなファイル/ディレクトリ: `.env.local.example`、Cloudflare Pages設定
- 完了条件: `SUPABASE_SERVICE_ROLE_KEY`、DB接続文字列、AI/Storage/R2/GitHubトークンが混入していない。
- テスト観点: envファイル、CI、Cloudflare設定、コード検索。
- 想定リスク: テスト用service_roleがフロント環境へ混ざる。
- スコープ逸脱防止メモ: 外部サービスキーを追加しない。

#### M8-03 Auth RedirectとPreview確認

- タスクID: M8-03
- タスク名: Supabase Auth Redirect URL確認
- 優先度/サイズ: P0 / S
- 目的: local、preview、productionのMagic Link callbackを正しくする。
- 対応レイヤー: Deploy / Auth / Test
- 参照すべき文書: deployment-contract
- 着手条件: M1-04、M8-01完了。
- 具体作業: `/auth/callback/` が各環境の許可リダイレクトURLに登録されているか確認する。
- 変更対象になりそうなファイル/ディレクトリ: Supabase Dashboard設定、作業記録
- 完了条件: PreviewはProductionデータと分離され、callbackが固定静的ページとして動く。
- テスト観点: local callback、preview callback、production callbackの設定確認。
- 想定リスク: Preview URL未登録でMagic Linkが失敗する。
- スコープ逸脱防止メモ: サーバー側callbackを作らない。

#### M8-04 最終スコープ監査

- タスクID: M8-04
- タスク名: v1対象外機能の混入確認
- 優先度/サイズ: P0 / M
- 目的: 完了前にスコープ逸脱を検出する。
- 対応レイヤー: Docs / DB / UI / Deploy / Test
- 参照すべき文書: mvp-scope-contract、codex-execution-rules
- 着手条件: M1〜M7完了。
- 具体作業: DB、UI文言、依存ライブラリ、環境変数、ルート、データアクセスを検索し、公開、写真、AI、比較、系譜、カスタム項目、同期、API Routesが混入していないか確認する。
- 変更対象になりそうなファイル/ディレクトリ: 全体
- 完了条件: v1対象外機能のUI、DB、依存、環境変数が存在しない。
- テスト観点: キーワード検索、ルート一覧、migration一覧、package差分。
- 想定リスク: 無効ボタンや将来用カラムが残る。
- スコープ逸脱防止メモ: 見つかった場合は削除または設計文書更新まで停止する。

## 8. DB / RLS / RPC 実装方針

### 8.1 DBを触るタイミング

DBは、M0で環境分離とRLSテスト方針を決めた後、M2から触る。M2でv1の許可4テーブル、RLS helper、基本RLS、権限を作り、M3で `save_trial_with_ingredients`、M4で `clone_trial` と `soft_delete_trial` を追加する。UIの保存処理は、対象RPCとテストがそろうまで完成扱いにしない。

### 8.2 migrationの進め方

- 1 migration は1つの論理変更に限定する。
- コアテーブル、RLS helper、RLS policy、RPCは関心ごとで分ける。
- migrationには目的、影響テーブル、RLS、インデックス、互換性、テスト、ロールバック方針をPR説明に付ける。
- Supabase管理画面からの手動スキーマ変更を正規手順にしない。
- 公開、共有、写真、AI、比較、系譜、カスタム項目向けの先回りDB変更を禁止する。

### 8.3 RLSの追加/検証方針

- すべての業務テーブルでRLSを有効化する。
- `research_lines` は `user_id = auth.uid()` で本人のみselect/insert/updateを許可し、deleteは許可しない。
- `trials` は本人selectのみ直接許可し、insert/update/deleteはアプリ向けには直接許可しない。
- `trial_ingredients` は親試行の所有者確認でselectのみ許可し、insert/update/deleteはRPC内に集約する。
- `trial_stars` は本人のselect/insert/deleteのみ許可する。
- helper関数やRPCで `security definer` を使う場合は、`auth.uid()` と対象所有者を必ず照合し、`search_path` を固定し、PUBLIC実行権限を取り消す。

### 8.4 RPCの扱い

- `save_trial_with_ingredients`: 試行本体と材料行の新規/編集を1トランザクションで行う。材料行は全置換。未知キー、材料行0件、所有者不一致、親子循環を拒否する。
- `clone_trial`: 本人の未削除試行だけを複製する。材料行はコピーし、スターはコピーしない。アーカイブ済み研究ラインの試行は複製しない。
- `soft_delete_trial`: 本人の未削除試行だけに `deleted_at` を設定する。材料行とスターは物理削除しない。

### 8.5 直接書き込み禁止の徹底方法

- データアクセス層でも `trials` と `trial_ingredients` の直接insert/update/deleteを禁止する。
- RLS/権限でauthenticatedの直接書き込み権限を取り消す。
- コードレビューと検索で `from('trials').insert`、`from('trials').update`、`from('trial_ingredients').insert` などがないことを確認する。
- 保存、複製、論理削除のテストでは、RPCを通さない直接操作が失敗することを確認する。

### 8.6 ユーザーA/B分離の検証計画

- ユーザーAが自分の研究ライン、試行、材料行、スターを扱えることを確認する。
- ユーザーAがユーザーBの研究ライン、試行、材料行、スターを読めないことを確認する。
- ユーザーAがユーザーBの試行を複製、スター付与、論理削除できないことを確認する。
- 未認証状態で業務テーブルを読めないことを確認する。
- RLS拒否時にUIへ内部ID、SQL、ポリシー名を表示しないことを確認する。

## 9. データアクセスとエラーハンドリング方針

### 9.1 UIから直接Supabaseを呼ばない方針

UIコンポーネントはSupabase Clientを直接importしない。Auth、Research Lines、Trials、Stars、Draftsごとにデータアクセス関数を作り、UIはそれらをTanStack Queryやmutationから呼ぶ。

### 9.2 データアクセス層の責務

- Supabase Client呼び出しを閉じ込める。
- 認証状態を確認する。
- RLS前提で本人データだけを扱う。
- UI用途に合わせてアーカイブ済み、論理削除済みを除外する。
- RPC呼び出しを一元化する。
- Supabaseの戻り値や生エラーをUIに渡さない。

### 9.3 AppResult相当の結果正規化方針

すべてのデータアクセス関数は、成功時にデータ、失敗時に `AppError` 相当を返す。例外をUIへ伝播させず、分類不能な例外は `UNKNOWN_ERROR` または `SERVER_ERROR` に寄せる。

### 9.4 入力エラー/認証エラー/権限エラー/通信失敗の扱い

- 入力エラー: Zodで保存前に検出し、該当欄近くに表示する。RPC側検証の失敗も `VALIDATION_ERROR` または `CONFLICT` に正規化する。
- 認証エラー: `AUTH_REQUIRED` または `AUTH_EXPIRED` としてログインへ誘導する。
- 権限エラー: `FORBIDDEN` または `NOT_FOUND` として内部情報を出さずに表示する。
- 通信失敗: `NETWORK_ERROR` として再試行導線を表示する。
- 保存失敗: `SERVER_ERROR` または `UNKNOWN_ERROR` として入力保持と再試行を提供する。

### 9.5 保存失敗時の入力保持戦略

- React Hook Formの状態を保存失敗でリセットしない。
- mutation失敗後もフォーム入力を保持する。
- 下書きが有効な場合は、ユーザー操作で保存できるようにする。
- RPCが失敗した場合、UI側で「一部保存された」と仮定して表示を進めない。必要なら再読み込みまたは再試行を促す。

## 10. UI実装方針

### 10.1 モバイル1カラム優先

フォーム、認証、研究ライン管理、履歴フィルタはモバイル1カラムを基本にする。デスクトップでは読みやすい最大幅を保ち、フォーム本文を広げすぎない。カード角丸は8px以下、影は控えめにする。

### 10.2 画面の実装順

1. A1 認証画面
2. 共通レイアウト、H1の空状態
3. L1 研究ライン一覧
4. L2 研究ライン詳細の枠
5. T1 試行入力フォーム
6. T2 試行詳細
7. T2の複製、スター、削除
8. T3 試行履歴
9. H1 ホーム接続
10. S1 最小設定

### 10.3 先に作るべき共通UI

- ボタン、テキスト入力、テキストエリア、数値入力、選択UI
- フォームフィールド、フィールドエラー、ローディング表示
- 空状態、エラー状態、認証切れ表示
- 確認ダイアログ
- TrialCard、ResearchLineCard
- アイコンボタンと `aria-label`
- 下部ナビゲーション

### 10.4 空状態/ローディング/エラー/認証切れ

各画面は通常状態だけでなく、ローディング、空状態、保存失敗、認証切れを持つ。空状態は説明を長くせず、次の行動を1つだけ提示する。エラーは入力欄の近く、または画面の操作対象に近い場所へ表示し、ユーザーを責める文言を避ける。

### 10.5 アクセシビリティ観点

- すべてのフォーム要素にラベルを付ける。
- プレースホルダをラベル代わりにしない。
- アイコンのみのボタンには `aria-label` を付ける。
- 色だけで状態を示さず、テキストまたはアイコンを併用する。
- 削除、アーカイブ、破棄には確認を挟む。
- タップ対象を十分なサイズにする。

### 10.6 画面別受け入れ基準との対応方針

実装完了は、画面が存在することではなく `screen-acceptance-criteria.md` の各状態、操作、禁止事項を満たすことで判断する。特に公開、共有、SNS、写真、AI、比較、系譜、カスタム項目への導線がないことを各画面で確認する。

## 11. テスト戦略

### 11.1 unit test, component test, E2E の役割分担

- Unit test: Zodスキーマ、AppError正規化、材料行整列、日付範囲、下書きkey、表示ロジックを対象にする。
- Component test: フォーム、カード、状態表示、確認ダイアログ、入力保持、アクセシビリティを対象にする。
- E2E: 認証後の研究ライン作成、試行作成、詳細確認、複製、スター、履歴絞り込み、下書き復元を対象にする。

### 11.2 RLSテスト方針

RLSテストは、ユーザーA/B分離、未認証拒否、直接書き込み拒否を必須にする。RLSがあるだけでなく、アプリ向け権限で `trials` と `trial_ingredients` の直接書き込みが失敗することを確認する。

### 11.3 RPCテスト方針

`save_trial_with_ingredients` は新規、編集、材料全置換、異常系、部分保存なしを確認する。`clone_trial` は材料行コピー、スター非コピー、親ID設定、他ユーザー拒否を確認する。`soft_delete_trial` は本人未削除のみ成功、物理削除なしを確認する。

### 11.4 複製でスターがコピーされないことの確認

スター付き元試行を複製し、新しい試行に `trial_stars` が作られないことをDBテストとE2Eで確認する。UIでも複製後の試行がスターなしとして表示されることを確認する。

### 11.5 論理削除の確認

論理削除後、通常一覧、詳細、複製元候補に出ないことを確認する。材料行とスターは物理削除されないが、通常UIからは削除済み試行として扱わない。

### 11.6 モバイル/デスクトップ確認

Playwrightで390x844と1280x800を最低限確認する。厳密なピクセル一致ではなく、主要導線、入力保持、状態表示、レイアウト崩れ、ボタンやラベルの収まりを重視する。

### 11.7 「未実施なら明示する」運用

最終報告やPR説明では、実行したテストと未実行のテストを分けて明示する。Supabase環境やメール配送などで実行できない確認がある場合は、理由と代替確認を記録する。

## 12. リスク一覧

| リスク | 発生条件 | 影響 | 予防策 | 発生時の対処 |
|---|---|---|---|---|
| スコープ膨張 | 公開、写真、AI、比較などを便利だから入れる | v1の完成が遅れ、非公開研究ログの核がぶれる | MVP Scope Contractを最優先し、対象外機能をPRで監査する | 実装を止め、該当差分を戻すか設計文書更新と人間レビューへ回す |
| RLS不備 | RLSなしテーブル、広すぎるpolicy、所有者確認漏れ | 他ユーザーの研究ログ漏えい | migrationとRLSテストをセットにし、A/B分離を必須にする | 影響範囲を確認し、該当policyを修正し、追加テストを入れるまでリリースしない |
| RPCとUIの責務混在 | UIやデータアクセス層が `trials` / `trial_ingredients` を直接書く | 部分保存、親子循環、材料不整合が起きる | 権限で直接書き込みを拒否し、コード検索とテストで検出する | 直接書き込み経路を削除し、RPC経由へ統一する |
| 静的アプリ制約との衝突 | 動的ルート、SSR、API Routesが必要な設計を選ぶ | Cloudflare Pages静的配信前提が崩れる | 固定ルートとクエリパラメータ方式を徹底する | Deployment Contract更新が必要。更新前は実装を止める |
| ライブラリ追加誘惑 | 日付、UI、グラフ、同期などで便利な外部依存を入れたくなる | バンドル、保守、スコープが膨らむ | 追加理由、代替案、影響範囲の説明を必須にする | 不要依存を削除し、既存スタックで実装し直す |
| 将来機能の先回り | 公開カラム、写真テーブル、未実装ボタンを先に置く | DB/RLS/UIがv1範囲を超え、判断が複雑になる | v1許可テーブルと画面IDだけに限定する | 先回り要素を削除し、必要ならv2設計課題に記録する |
| テスト不足 | UIが動いた時点で完了扱いにする | RLS、RPC、保存失敗、入力保持の不具合が残る | M7でunit/component/RLS/RPC/E2Eを分担して確認する | 未実施テストを明示し、リリース前チェックへ戻す |
| ドキュメントとの乖離 | 実装中の都合で仕様を変える | 後続エージェントが誤って拡張する | 仕様変更時は該当文書を先に更新する | 差分を文書へ反映するか、実装を文書に戻す |
| Preview/Production混同 | PreviewがProduction Supabaseを参照する | 本番データ漏えいや破壊 | 環境分離とenv確認をM0/M8で行う | 直ちにPreview接続を止め、影響確認とキー更新を検討する |
| 保存失敗時の入力喪失 | mutation失敗でフォームをresetする | ユーザーの試行記録が失われる | フォーム状態保持と下書きをテストする | 入力保持を修正し、保存失敗テストを追加する |

## 13. 実装開始チェックリスト

実装着手前に毎回以下を確認する。

- [ ] 変更はv1範囲内か。
- [ ] `mvp-scope-contract.md` と対象領域の文書を読んだか。
- [ ] 主役が完成レシピではなく試行ログになっているか。
- [ ] 公開、共有、SNS、写真、AI、比較、系譜、カスタム項目、オフライン自動同期に触れていないか。
- [ ] DB変更がある場合、migration、RLS、権限、テスト観点がセットになっているか。
- [ ] 試行本体と材料行の書き込みがRPCに集約されているか。
- [ ] UIからSupabaseを直接呼んでいないか。
- [ ] エラーが `AppResult` / `AppError` 相当に正規化されているか。
- [ ] 保存失敗時に入力内容を保持できるか。
- [ ] 新ライブラリ追加が必要になっていないか。必要なら理由、代替案、影響範囲を先に説明したか。
- [ ] Next.js静的export、固定ルート、Cloudflare Pagesの前提を壊していないか。
- [ ] `service_role`、DB接続文字列、外部AIキー、Storage/R2キーをブラウザへ置いていないか。
- [ ] 先回り実装や未実装機能の無効導線になっていないか。
- [ ] 実行できないテストがある場合、理由と代替確認を明示できるか。

## 14. 推奨実装順の要約

まずM0で、リポジトリ状態、Node/npm、Supabase環境分離、RLS/RPCテスト方針を固める。次にM1で、Next.js静的export、Supabase Auth、Magic Link、Auth Callback、未認証ガードを作る。

業務機能は、M2でDB/RLS基盤と研究ラインを先に作る。M3で `save_trial_with_ingredients` と試行入力、M4で複製、論理削除、スターを入れる。M5で履歴、絞り込み、詳細、親試行リンク、ホーム導線を接続する。M6で軽量ローカル下書きを追加し、M7でテストと受け入れ確認を固め、M8で静的デプロイと環境変数を確認する。

後回しにすべきものは、公開、共有、写真、AI、比較、系譜、カスタム項目、オフライン自動同期、データエクスポート、カレンダー、統計である。これらはv1の価値を作る前に触らない。
