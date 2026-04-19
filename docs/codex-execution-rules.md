# チャイ研究アプリ Codex Execution Rules

**作成日:** 2026-04-19

この文書は、チャイ研究アプリPJをCodexまたはAIエージェントで実装・修正する際の実行ルールを定義する。Codexは単なる実装代行ではなく、品質、安全性、整合性、継続運用性を守る開発パートナーとして振る舞う。

**運用注記:** 判断主体とエスカレーション範囲は `docs/agent-relationship-governance.md` を優先し、実装前、危険変更前、停止時、エスカレーション時の手順は `docs/agent-workflow.md` に従う。Codexは依頼者に技術承認を求める前に、文書根拠、現行フェーズ整合、安全性、単純性、可逆性、監査可能性に基づいて推奨案を1つに絞り、自律的に進める。人間確認はスコープ変更、外部契約、本番データ、不可逆操作、純粋なプロダクト方針選択に限定する。

AIエージェントと開発者の正本入口は `AGENTS.md` とする。`/SKILL.md` は現時点では運用正本にしない。将来、target agent互換性のために必要な場合は、本文を重複させない薄い導線として追加できる。

## 1. 最優先原則

Codexは、ユーザーの指示をそのまま実装する前に、必ず以下を確認する。

1. 現行フェーズ契約に含まれる変更か。
2. 現行フェーズのプロダクト方針を壊さないか。
3. DB、RLS、画面、エラー、テストの整合が取れるか。
4. 既存技術スタックで実装できるか。
5. 現行フェーズ契約で除外された将来機能へ寄っていないか。

上記に反する場合、Codexは実装を止め、反対理由と代替案を提示する。

## 2. 実装前に読む文書

Codexは、実装対象に応じて以下を確認する。

| 変更内容 | 必ず確認する文書 |
|---|---|
| リポジトリ入口 | `AGENTS.md`, `docs/INDEX.md` |
| スコープ判断 | `docs/mvp-scope-contract.md` |
| 要件確認 | `docs/app-rdd.md` |
| DB / RLS / RPC | `docs/app-lld.md`, `docs/db-migration-rls-policy.md` |
| UI変更 | `docs/app-design.md`, `docs/screen-acceptance-criteria.md` |
| Supabase操作 | `docs/supabase-data-access-error-contract.md` |
| 技術選定 | `docs/tech-stack.md` |
| デプロイ / ルーティング | `docs/deployment-contract.md` |
| AI判断・作業手順 | `docs/agent-relationship-governance.md`, `docs/agent-workflow.md`, `docs/codex-execution-rules.md` |
| 開発姿勢 | `docs/pj-policy.md`, `docs/codex-execution-rules.md` |

## 3. 現行フェーズで実装してよい変更

実装可否の具体的な列挙は、`docs/INDEX.md` の「現行フェーズ契約」を正とする。現行v1では、特に `docs/mvp-scope-contract.md`、`docs/app-rdd.md`、`docs/app-lld.md`、`docs/screen-acceptance-criteria.md` を確認する。

この文書では、許可機能の一覧を重複管理しない。AIは、対象変更が現行フェーズ契約内であることを確認し、必要な設計、DB/RLS、UI、受け入れ基準がそろう範囲だけ実装する。

## 4. 現行フェーズで実装してはならない変更

現行フェーズ契約で除外、未定義、または後続フェーズ扱いになっている機能は、明示的な契約更新なしに実装しない。除外機能の具体的な列挙は `docs/mvp-scope-contract.md` と関連契約文書に置く。

次はフェーズにかかわらず守る。

- RLSや権限境界を弱める変更をしない。
- secretやservice role相当の権限をフロントエンドに置かない。
- 現行契約でRPCや専用経路に集約されている書き込みを、迂回して直接CRUDにしない。
- 現行フェーズで未実装の将来機能を、無効ボタンや準備中表示として主要画面に置かない。

## 5. 要望が範囲外の場合の対応

ユーザーから現行フェーズ範囲外の要望が出た場合、Codexは次の形で返答する。

1. 現行フェーズでは実装しないと明言する。
2. 理由を、品質、安全性、実装コスト、既存設計との整合性の観点で説明する。
3. 現行フェーズ内で代替できる案を提示する。
4. 後続フェーズで実装する場合に必要な契約文書や検証事項を示す。

## 6. DB変更ルール

DB変更を行う場合、Codexは以下を守る。

1. `docs/db-migration-rls-policy.md` を確認する。
2. migrationを作成する。
3. RLSポリシーを同時に作成または更新する。
4. `USING` と `WITH CHECK` の意図を説明する。
5. RLSテスト観点を提示する。
6. ユーザーAがユーザーBのデータを読めないことを確認する。
7. 現行契約でRPCや専用経路に集約されている書き込みは、その契約に従う。
8. 現行フェーズで除外された将来機能向けの先回りカラムを追加しない。

DB変更だけ行い、RLSやテスト観点を後回しにしてはならない。

DB、RLS、grant/revoke、`security definer`、RPC、認可境界Data Accessに触れる場合は、人間承認待ちではなくAI自己監査ゲートを通す。`docs/agent-workflow.md` の危険変更workflowに従い、設計妥当性、権限境界、影響範囲、代替案比較、テスト条件、証跡記録、停止条件をAI自身が満たすまで、該当依存タスクを完了扱いにしない。

## 7. Supabase操作ルール

Supabase操作を実装する場合、Codexは以下を守る。

1. UIコンポーネントからSupabaseを直接呼ばない。
2. データアクセス層で `AppResult<T>` 相当の戻り値に正規化する。
3. エラーは `docs/supabase-data-access-error-contract.md` の分類に合わせる。
4. Supabaseの生エラーをそのままUIに表示しない。
5. 保存失敗時も入力内容を保持する。
6. `service_role` キーをブラウザに置かない。
7. 現行契約でRPCやData Access層に集約されている操作を、UIから直接書き込まない。

## 8. UI変更ルール

UI変更を行う場合、Codexは以下を守る。

1. `docs/app-design.md` と `docs/screen-acceptance-criteria.md` を確認する。
2. 現行フェーズ対象画面以外を作らない。
3. モバイル1カラムの入力体験を優先する。
4. デザイントークンを使い、任意の色や影を増やさない。
5. 現行フェーズで除外されたUIや導線を追加しない。
6. 空状態、ローディング、保存失敗、認証切れを実装する。
7. アイコンのみのボタンに `aria-label` を付ける。
8. Playwrightでモバイルとデスクトップを確認する。
9. 未実装の将来機能を、無効ボタンや準備中表示として主要画面に置かない。

## 9. ライブラリ追加ルール

Codexは独断でライブラリを追加してはならない。

ライブラリ追加が必要な場合は、実装前に以下を提示する。

1. 追加理由
2. 既存スタックで代替できない理由
3. バンドルサイズや保守コストへの影響
4. 現行フェーズに直接必要である理由
5. 追加しない場合の代替案

現行フェーズで除外されているライブラリや外部サービスは、`docs/tech-stack.md` の契約更新なしに追加しない。UI primitivesを追加する場合も、必要なものだけを個別に追加し、別系統のUIライブラリを併用しない。

## 10. テストと検証

Codexは、変更種別に応じて以下を実行または提案する。

| 変更種別 | 必須確認 |
|---|---|
| 型・ユーティリティ | TypeScript strict、Vitest |
| フォーム | Zod検証、React Testing Library |
| UI | Playwrightのモバイル・デスクトップ確認 |
| Supabase操作 | 正常系、入力エラー、権限エラー、通信失敗 |
| DB / RLS | ユーザーA/B分離テスト |
| 現行契約固有の操作 | 対応する契約文書と受け入れ基準で定義された成功/失敗条件 |

実行できなかった検証がある場合は、最終報告で明示する。

変更規模ごとの完了運用は `docs/agent-workflow.md` の「変更規模の分類と完了条件」に従う。大きなコード変更では、ローカル検証に加えて必要な動作確認、push、push後CI確認、CI失敗時の修正・再push・再確認までを完了条件に含める。軽微変更では、変更種別に応じた最低限の確認を行い、常にpush/CI監視を必須にしない。

### 10.1 機械的停止チェック

実装コードが存在する段階では、Codexは自己監査の宣言だけで完了扱いにしない。変更完了前に、該当範囲へ次のような機械的チェックを実行し、検出があれば内容を確認する。検出が現行フェーズスコープ逸脱、secret混入、direct CRUD、静的export制約違反に該当する場合は、そのまま完了してはならない。

運用文書、入口、template、workflow、CI、scriptsを変更した場合は、最低限 `npm run check:docs` を実行する。

```bash
rg -n -g "!docs/**" -g "!README.md" "SUPABASE_SERVICE_ROLE_KEY|service_role|DB_CONNECTION|DATABASE_URL|OPENAI_API_KEY|R2_|STORAGE_" .
rg -n -g "!docs/**" -g "!README.md" "from\\(['\"]trials['\"]\\)\\.(insert|update|upsert|delete)|from\\(['\"]trial_ingredients['\"]\\)\\.(insert|update|upsert|delete)" .
rg --files -g "!docs/**" -g "!README.md" | rg "(^|/)(pages/api|app/api|functions)(/|$)"
rg --files -g "!docs/**" -g "!README.md" | rg "\\[[^/]+\\]"
rg -n -g "!docs/**" -g "!README.md" "public_slug|share_token|visibility|follow|comment|reaction|photo|storage|AI提案|compare|graph" .
```

上記は最低限の事故検出であり、唯一のテストではない。docs-only状態や対象ファイルが未作成で実行できない場合は、未実施理由として記録する。誤検出がある場合も、なぜ現行フェーズ違反ではないかを最終報告または作業記録に残す。

## 11. ドキュメント更新ルール

以下の変更では、実装と同時に文書を更新する。

| 変更 | 更新対象 |
|---|---|
| MVP範囲の変更 | `mvp-scope-contract.md`, `app-rdd.md`, `pj-policy.md` |
| DB変更 | `app-lld.md`, `db-migration-rls-policy.md` |
| RLS変更 | `app-lld.md`, `db-migration-rls-policy.md` |
| 画面追加・画面状態追加 | `app-design.md`, `screen-acceptance-criteria.md` |
| Supabase操作・エラー変更 | `supabase-data-access-error-contract.md` |
| 技術スタック変更 | `tech-stack.md` |
| デプロイ、環境変数、認証リダイレクト、ルーティング変更 | `deployment-contract.md` |
| AI関係性・作業手順・Codex運用変更 | `AGENTS.md`, `docs/INDEX.md`, `agent-relationship-governance.md`, `agent-workflow.md`, `codex-execution-rules.md`, `pj-policy.md` |
| 入口、作業記録、PR導線、文書チェック変更 | `AGENTS.md`, `README.md`, `docs/INDEX.md`, `docs/templates/worklog.md`, `.github/pull_request_template.md`, `scripts/check-operational-docs.mjs` |

文書更新なしに、スコープ、DB、RLS、画面、外部サービス、技術スタックを変更してはならない。

## 12. 完了報告ルール

Codexの最終報告には、必要に応じて以下を含める。

1. 変更したファイル。
2. 変更内容の要約。
3. 現行フェーズスコープ内であることの確認。
4. 実行したテストまたは確認。
5. 実行できなかった確認。
6. 残るリスク。
7. 次に行うべき具体的作業。

過度に長い説明ではなく、ユーザーが次の判断をできる粒度で報告する。

## 13. 実装開始前チェックリスト

作業前に以下を確認する。

- [ ] 変更は現行フェーズスコープ内である。
- [ ] 対象文書を読んだ。
- [ ] 既存の用語に沿っている。
- [ ] DBやRLSに影響がある場合、migrationとテスト観点を用意する。
- [ ] UIに影響がある場合、画面別受け入れ基準に照らしている。
- [ ] Supabase操作に影響がある場合、エラー契約に沿っている。
- [ ] 新しいライブラリを勝手に追加していない。
- [ ] 範囲外機能を先回りしていない。
