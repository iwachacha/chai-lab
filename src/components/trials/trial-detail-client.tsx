"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

import { AuthGate } from "@/components/auth/auth-gate";
import { PageShell } from "@/components/layout/page-shell";
import { Button, LinkButton } from "@/components/ui/button";
import { StatusMessage } from "@/components/ui/status-message";
import { appError, type AppError } from "@/lib/app-result";
import {
  archiveTrial,
  formatJstCalendarDate,
  getTrialById,
  ingredientCategoryLabels,
  type TrialDetail,
} from "@/lib/trials/data-access";

type DetailState =
  | { status: "loading" }
  | { status: "ready"; trial: TrialDetail }
  | { status: "error"; error: AppError };

type ArchiveState =
  | { status: "idle" }
  | { status: "confirming" }
  | { status: "saving" }
  | { status: "error"; error: AppError };

function amountText(amount: number | null, unit: string | null): string {
  if (amount === null && !unit) {
    return "量は未記録";
  }

  return [amount === null ? null : String(amount), unit]
    .filter(Boolean)
    .join(" ");
}

function optionalDetail(value: string | number | null, suffix = ""): string {
  if (value === null || value === "") {
    return "未記録";
  }

  return `${value}${suffix}`;
}

export function TrialDetailClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const id = searchParams.get("id");

  const [archiveState, setArchiveState] = useState<ArchiveState>({
    status: "idle",
  });
  const [detailState, setDetailState] = useState<DetailState>({
    status: "loading",
  });
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let active = true;

    if (!id) {
      return () => {
        active = false;
      };
    }

    void getTrialById(id).then((result) => {
      if (!active) {
        return;
      }

      if (!result.ok) {
        setDetailState({ status: "error", error: result.error });
        return;
      }

      setDetailState({ status: "ready", trial: result.data });
      setArchiveState({ status: "idle" });
    });

    return () => {
      active = false;
    };
  }, [id, reloadKey]);

  async function handleArchive(trial: TrialDetail) {
    setArchiveState({ status: "saving" });

    const result = await archiveTrial(trial.id);

    if (!result.ok) {
      setArchiveState({ status: "error", error: result.error });
      return;
    }

    router.push(
      `/research-lines/detail/?id=${encodeURIComponent(trial.researchLineId)}`,
    );
  }

  const visibleDetailState = !id
    ? {
        status: "error" as const,
        error: appError(
          "VALIDATION_ERROR",
          "表示する試行を確認してください。",
          {
            retryable: false,
          },
        ),
      }
    : detailState.status === "ready" && detailState.trial.id !== id
      ? { status: "loading" as const }
      : detailState;
  const readyTrial =
    visibleDetailState.status === "ready" ? visibleDetailState.trial : null;
  const backHref = readyTrial
    ? `/research-lines/detail/?id=${encodeURIComponent(
        readyTrial.researchLineId,
      )}`
    : "/trials/history/";

  return (
    <AuthGate>
      <PageShell
        actions={
          <LinkButton href={backHref} variant="secondary">
            戻る
          </LinkButton>
        }
        title="試行詳細"
      >
        {visibleDetailState.status === "loading" ? (
          <StatusMessage role="status">試行を読み込んでいます。</StatusMessage>
        ) : null}

        {visibleDetailState.status === "error" ? (
          <section className="grid gap-3 rounded-md border border-border bg-surface p-4">
            <StatusMessage kind="error" role="alert">
              {visibleDetailState.error.message}
            </StatusMessage>
            <div className="flex flex-col gap-2 sm:flex-row">
              <Button
                className="w-full sm:w-auto"
                onClick={() => {
                  setDetailState({ status: "loading" });
                  setReloadKey((key) => key + 1);
                }}
                variant="secondary"
              >
                もう一度読み込む
              </Button>
              <LinkButton
                className="w-full sm:w-auto"
                href="/trials/history/"
                variant="secondary"
              >
                履歴へ戻る
              </LinkButton>
            </div>
          </section>
        ) : null}

        {readyTrial ? (
          <div className="grid gap-4">
            <section className="grid gap-4 rounded-md border border-border bg-surface p-4">
              <div className="grid gap-2">
                <p className="text-sm font-semibold text-primary">
                  {readyTrial.researchLine.title}
                </p>
                <h2 className="text-2xl font-bold leading-tight text-text">
                  {readyTrial.title}
                </h2>
                <p className="text-sm text-muted">
                  {formatJstCalendarDate(readyTrial.brewedAt)}
                </p>
              </div>

              <dl className="grid gap-2 text-sm">
                <div className="flex flex-col gap-1 sm:flex-row sm:gap-2">
                  <dt className="font-semibold text-text">総合評価</dt>
                  <dd className="text-muted">{readyTrial.rating}</dd>
                </div>
                <div className="flex flex-col gap-1 sm:flex-row sm:gap-2">
                  <dt className="font-semibold text-text">煮出し時間</dt>
                  <dd className="text-muted">
                    {optionalDetail(readyTrial.brewingTimeMinutes, "分")}
                  </dd>
                </div>
                <div className="flex flex-col gap-1 sm:flex-row sm:gap-2">
                  <dt className="font-semibold text-text">沸騰回数</dt>
                  <dd className="text-muted">
                    {optionalDetail(readyTrial.boilCount, "回")}
                  </dd>
                </div>
                <div className="flex flex-col gap-1 sm:flex-row sm:gap-2">
                  <dt className="font-semibold text-text">こし方</dt>
                  <dd className="text-muted">
                    {optionalDetail(readyTrial.strainer)}
                  </dd>
                </div>
              </dl>

              {readyTrial.parentTrial ? (
                <div className="grid gap-2 rounded-md border border-border p-3">
                  <p className="text-sm font-semibold text-text">
                    元にした試行
                  </p>
                  <LinkButton
                    className="w-full sm:w-auto"
                    href={`/trials/detail/?id=${encodeURIComponent(
                      readyTrial.parentTrial.id,
                    )}`}
                    variant="secondary"
                  >
                    {readyTrial.parentTrial.title}
                  </LinkButton>
                </div>
              ) : readyTrial.parentTrialId ? (
                <StatusMessage kind="warning" role="status">
                  元にした試行は表示できません。
                </StatusMessage>
              ) : null}
            </section>

            <section className="grid gap-3 rounded-md border border-border bg-surface p-4">
              <h2 className="text-lg font-bold text-text">材料</h2>
              <div className="grid gap-3">
                {readyTrial.ingredients.map((ingredient) => (
                  <article
                    className="grid gap-1 rounded-md border border-border p-3"
                    key={ingredient.id}
                  >
                    <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                      <h3 className="font-semibold text-text">
                        {ingredient.name}
                      </h3>
                      <span className="text-sm text-muted">
                        {ingredientCategoryLabels[ingredient.category]}
                      </span>
                    </div>
                    <p className="text-sm text-muted">
                      {amountText(ingredient.amount, ingredient.unit)}
                    </p>
                  </article>
                ))}
              </div>
            </section>

            <section className="grid gap-4 rounded-md border border-border bg-surface p-4">
              <div className="grid gap-2">
                <h2 className="text-lg font-bold text-text">一言メモ</h2>
                <p className="whitespace-pre-wrap text-sm leading-6 text-muted">
                  {readyTrial.note}
                </p>
              </div>
              <div className="grid gap-2">
                <h2 className="text-lg font-bold text-text">次回の狙い</h2>
                <p className="whitespace-pre-wrap text-sm leading-6 text-muted">
                  {readyTrial.nextIdea}
                </p>
              </div>
            </section>

            <section className="grid gap-3 rounded-md border border-border bg-surface p-4">
              <h2 className="text-lg font-bold text-text">操作</h2>
              <div className="flex flex-col gap-2 sm:flex-row">
                <LinkButton
                  className="w-full sm:w-auto"
                  href={`/trials/edit/?id=${encodeURIComponent(readyTrial.id)}`}
                >
                  編集
                </LinkButton>
                <LinkButton
                  className="w-full sm:w-auto"
                  href={`/research-lines/detail/?id=${encodeURIComponent(
                    readyTrial.researchLineId,
                  )}`}
                  variant="secondary"
                >
                  研究ラインへ
                </LinkButton>
                <Button
                  className="w-full sm:w-auto"
                  disabled={archiveState.status === "saving"}
                  onClick={() => setArchiveState({ status: "confirming" })}
                  variant="danger"
                >
                  アーカイブ
                </Button>
              </div>

              {archiveState.status === "confirming" ? (
                <div className="grid gap-3 rounded-md border border-warning/40 bg-warning/10 p-3">
                  <p className="text-sm leading-6 text-text">
                    この試行をアーカイブします。通常の一覧と詳細からは表示しません。
                  </p>
                  <div className="flex flex-col gap-2 sm:flex-row">
                    <Button
                      className="w-full sm:w-auto"
                      onClick={() =>
                        readyTrial ? void handleArchive(readyTrial) : undefined
                      }
                      variant="danger"
                    >
                      アーカイブする
                    </Button>
                    <Button
                      className="w-full sm:w-auto"
                      onClick={() => setArchiveState({ status: "idle" })}
                      variant="secondary"
                    >
                      やめる
                    </Button>
                  </div>
                </div>
              ) : null}

              {archiveState.status === "saving" ? (
                <StatusMessage role="status">処理しています。</StatusMessage>
              ) : null}

              {archiveState.status === "error" ? (
                <StatusMessage kind="error" role="alert">
                  {archiveState.error.message}
                </StatusMessage>
              ) : null}
            </section>
          </div>
        ) : null}
      </PageShell>
    </AuthGate>
  );
}
