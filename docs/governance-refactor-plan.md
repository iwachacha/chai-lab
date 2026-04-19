# Governance Refactor Plan

**作成日:** 2026-04-19
**目的:** 既存文書を「人間承認ゲート中心」から「AI自律判断 + AI自己監査 + 限定的な人間エスカレーション」へ移行するための改訂計画を定義する。

## 1. 改訂方針

この改訂は、v1スコープや安全制約を緩めるものではない。DB/RLS/RPC、direct CRUD禁止、`security definer` hardening、静的export制約、AppError契約は維持または強化する。

変更するのは次である。

- 技術判断の主体を依頼者からAIへ移す。
- `human review gate` を `AI自己監査ゲート` へ置換する。
- 「承認待ち」を「監査条件未達による局所停止」に変える。
- 人間確認を、スコープ、外部契約、本番運用、不可逆操作、純粋なプロダクト判断に限定する。

## 2. 変更優先度

| 優先度 | 対象 | 理由 |
|---|---|---|
| P0 | 統治モデル、M0ゲート、Q-01からQ-10再分類 | M1開始可否と判断主体に直結する。 |
| P1 | 実装計画、Codex実行ルール、DB/RLS方針 | M2以降の危険領域の停止条件と自己監査条件に直結する。 |
| P2 | README、Deployment、Data Access契約の補足 | 実装開始後の案内と参照性を高める。 |

## 3. 文書ごとの修正方針

| 文書 | 旧問題 | 修正方針 | 優先度 | 影響範囲 |
|---|---|---|---|---|
| `docs/pj-policy.md` | AIが反論する姿勢はあるが、依頼者を技術承認者にしない原則が弱い。 | 役割定義を追加し、依頼者はプロダクト意図の提示者、AIは技術責任者と明示する。 | P1 | 全体運用 |
| `docs/codex-execution-rules.md` | 「提示」「提案」中心で、AIが安全側に決定する範囲が明文化されていない。 | 技術判断はAIが行う、質問前に推奨案を1つに絞る、AI自己監査ゲートを追加する。 | P1 | 実装作業全般 |
| `docs/db-migration-rls-policy.md` | 7章が旧来の人間確認前提になっていた。 | AI自己監査未達なら完了不可へ置換する。監査項目は増やす。 | P1 | DB/RLS/RPC |
| `docs/implementation-plan-v1-revised.md` | Q-01からQ-10、旧監査ゲート、M0完了条件、M1開始不可結論が人間判断待機に寄っていた。 | M1開始可へ変更。旧監査ゲートをAI自己監査ゲートへ置換。各タスクのレビュー列を自己監査列に変更する。 | P0 | M0-M8 |
| 旧 `docs/implementation-plan-v1-remediation-map.md` | 監査指摘解消がhuman review承認と紐づいていた。 | 削除し、criticalな検証条件は `docs/implementation-plan-v1-revised.md` へ統合する。 | P1 | 監査追跡 |
| 旧 `docs/m0-decision-pack.md` | 10件すべてを人間判断扱いにしていた。 | 削除し、新分類は `docs/m0-open-questions-reframed.md` へ統合する。 | P0 | M0/M1 |
| 旧 `docs/m0-readiness-gate.md` | M1開始条件が承認や延期承認に依存していた。 | 削除し、`docs/m0-readiness-gate-reframed.md` を正とする。 | P0 | M0/M1 |
| 旧 `docs/m0-open-questions.md` | 目的が「人間判断が必要な未確定事項」になっていた。 | 削除し、`docs/m0-open-questions-reframed.md` を正とする。 | P0 | M0/M1 |
| `docs/supabase-data-access-error-contract.md` | エラー契約自体は有効だが、RPC識別子の決定主体が明示されていない。 | RPC内部エラー識別子とAppError分類はAIがRPC設計時に決め、自己監査で表にする旨を追記する。 | P2 | M3/M4 |
| `docs/deployment-contract.md` | 実環境確認と人間確認の境界が明示されていない。 | M1は実Production/Preview接続なしで進め、本番/外部project設定時のみ人間確認する旨を追記する。 | P2 | M1/M8 |
| `README.md` | 新統治モデルへの導線がない。 | 実装開始前に読む文書として `autonomous-project-governance.md` を追加する。 | P2 | オンボーディング |

## 4. ゲート構造の変更

| 旧ゲート | 問題 | 新ゲート | 完了条件 |
|---|---|---|---|
| Human Review Gate | 人間承認者の確定待ちになり、技術判断が止まる。 | AI自己監査ゲート | 設計、権限、影響範囲、代替案、テスト条件、証跡、停止条件をAIが満たす。 |
| G0-REVIEW | human review運用の承認待ち。 | G0-AUDIT | 自己監査対象、資料、通過条件、停止範囲をAIが定義済み。 |
| G0-DOMAIN | 未確定仕様の判断期限と停止範囲の承認待ち。 | G0-DOMAIN-REFRAMED | Q-01からQ-10を4分類し、AI即決/仮決定/保留/人間確認を明示する。 |
| M2-11 DB/RLS Human Review | M3進行が承認記録に依存。 | M2-11 DB/RLS AI自己監査 | M2-10検証、direct CRUD拒否、policy/grant確認、scope検索、記録完了で通過。 |
| M3/M4 RPC仕様レビュー | human reviewer承認待ち。 | RPC AI自己監査 | security definer hardening、所有者確認、AppError分類、部分保存なし、検証完了で通過。 |
| M8 Final review | project ownerの技術判断に寄る。 | M8 Release Readiness Audit | build/env/Auth/backup/logging/残リスク記録をAIが整理し、Production deploy可否に必要な人間確認だけ提示する。 |

## 5. M0からM8への反映方針

| マイルストーン | 旧扱い | 新扱い |
|---|---|---|
| M0 | M1以降へ進む前の承認待ち。 | AI準備完了ゲート。M1は自律開始可。 |
| M1 | M0承認がないと進めない。 | 実環境に触れない静的基盤は自律開始可。 |
| M2 | human review手順確定が前提。 | 非本番/localでAI自己監査とRLS検証を満たせば進める。 |
| M3 | RPC分類などをhuman reviewer承認。 | AIがRPC別AppError分類表を作り、監査通過で進める。 |
| M4 | clone UXやRPC契約の承認待ち。 | clone即DB作成 + 編集画面遷移 + soft delete導線を仮決定し進める。 |
| M5 | timezone未決なら停止。 | JSTカレンダー日を安全側仮決定し、テストに落とす。 |
| M6 | 下書きリスクのレビュー推奨。 | localStorage名前空間、共有端末リスク、破棄導線をAI自己監査する。 |
| M7 | human review記録確認。 | AI自己監査記録、未実施記録、受け入れ基準、RLS/RPC再実行を確認する。 |
| M8 | project owner承認中心。 | backup/export、Production env、外部projectだけ人間確認し、技術監査はAIが行う。 |

## 6. 未解消論点の再分類方針

`docs/m0-open-questions-reframed.md` を正とする。

| 分類 | 件数 | 対象 |
|---|---:|---|
| AIが即時決定してよい | 6 | Q-02、Q-03、Q-04、Q-06、Q-09、Q-10 |
| AIが安全側の仮決定で進めてよい | 2 | Q-05、Q-07 |
| 人間確認が必要 | 1 | Q-01 |
| 後続マイルストーンまで保留可能 | 1 | Q-08 |

## 7. ロールアウト

1. `docs/autonomous-project-governance.md` を上位運用モデルとして追加する。
2. `docs/m0-readiness-gate-reframed.md` と `docs/m0-open-questions-reframed.md` をM0判断の正とする。
3. 本文書の追跡表で旧表現から新表現への対応を残す。
4. P1文書の本文をAI自律判断モデルへ置換済みとして扱う。
5. 残存する「人間レビュー」「承認」は、旧表現の説明または限定的人間確認の文脈に限り許容し、実装ゲートとしてはAI自己監査を正とする。

## 8. 追跡表

| ID | 文書 | 旧問題 | 新しい扱い |
|---|---|---|---|
| GOV-01 | `docs/pj-policy.md` | AIの反論義務はあるが、AIが技術判断を引き取る範囲が弱い。 | `docs/autonomous-project-governance.md` を上位運用にし、依頼者は技術承認者ではないと明示する。 |
| GOV-02 | `docs/codex-execution-rules.md` | 範囲外やライブラリ追加で提示中心。 | 技術論点はAIが決定し、スコープ変更や外部契約だけ人間確認へ送る。 |
| GOV-03 | `docs/db-migration-rls-policy.md` | DB変更が人間レビュー前提。 | AI自己監査ゲートへ置換。監査項目は維持または強化する。 |
| GOV-04 | `docs/implementation-plan-v1-revised.md` | Q-01からQ-10の判断者がproject owner/human reviewer中心。 | `docs/m0-open-questions-reframed.md` の4分類を正とする。 |
| GOV-05 | `docs/implementation-plan-v1-revised.md` | M0でレビュー運用、検証方式、記録先が確定するまでM1へ進めない。 | `docs/m0-readiness-gate-reframed.md` により、M1静的基盤は自律開始可とする。 |
| GOV-06 | `docs/implementation-plan-v1-revised.md` | M2/M3/M4の危険領域がhuman review承認前提。 | DB/RLS/RPC AI自己監査へ置換。検証結果、scope検索、権限確認で通過する。 |
| GOV-07 | 旧 `docs/implementation-plan-v1-remediation-map.md` | critical指摘の解消がhuman review承認に紐づく。 | 削除済み。critical検証条件は `docs/implementation-plan-v1-revised.md` へ統合し、通過主体をAI自己監査へ変える。 |
| GOV-08 | 旧 `docs/m0-decision-pack.md` | 10件すべてを人間判断扱い。 | 削除済み。`docs/m0-open-questions-reframed.md` へ統合。 |
| GOV-09 | 旧 `docs/m0-readiness-gate.md` | 承認要否が必須でM1が止まりやすい。 | 削除済み。`docs/m0-readiness-gate-reframed.md` を正とする。 |
| GOV-10 | 旧 `docs/m0-open-questions.md` | 目的が「人間判断が必要な未確定事項」。 | 削除済み。`docs/m0-open-questions-reframed.md` を正とする。 |
| GOV-11 | 旧 `docs/m0-owner-decision-sheet.md` | 依頼者にQ-01からQ-10の技術決裁を求める。 | 削除済み。Q-01だけ限定的人間確認とし、残りはAI判断へ統合。 |
| GOV-12 | 旧 `docs/autonomous-governance-model.md` | M0中心の旧版で、全体統治モデルと重複。 | 削除済み。`docs/autonomous-project-governance.md` を正とする。 |

## 9. 完了条件

この改訂計画は、次を満たすことで完了とする。

- 依頼者を技術承認者として扱わない。
- Q-01からQ-10が4分類で整理されている。
- M1開始を止める不要な承認条件がない。
- DB/RLS/RPC/Data Accessの危険領域はAI自己監査未達なら局所停止する。
- Production、外部project、secret、本番データ、スコープ変更だけ人間確認へエスカレーションする。
