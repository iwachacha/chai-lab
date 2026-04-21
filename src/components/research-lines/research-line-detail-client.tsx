"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { type FormEvent, useEffect, useState } from "react";

import { AuthGate } from "@/components/auth/auth-gate";
import { PageShell } from "@/components/layout/page-shell";
import { Button, LinkButton } from "@/components/ui/button";
import { StatusMessage } from "@/components/ui/status-message";
import { TextArea } from "@/components/ui/text-area";
import { TextInput } from "@/components/ui/text-input";
import { appError, type AppError } from "@/lib/app-result";
import {
  archiveResearchLine,
  getResearchLineById,
  updateResearchLine,
  type ResearchLine,
} from "@/lib/research-lines/data-access";
import {
  formatJstCalendarDate,
  listTrialsByResearchLine,
  type TrialSummary,
} from "@/lib/trials/data-access";

type DetailState =
  | { status: "loading" }
  | { status: "ready"; line: ResearchLine }
  | { status: "error"; error: AppError };

type TrialsState =
  | { status: "loading" }
  | { status: "ready"; researchLineId: string; trials: TrialSummary[] }
  | { status: "error"; error: AppError; researchLineId: string };

type SaveState =
  | { status: "idle" }
  | { status: "saving" }
  | { status: "success"; message: string }
  | { status: "error"; error: AppError };

type ResearchLineDraft = {
  description: string;
  title: string;
};

function optionalDescription(value: string): string | null {
  return value.length > 0 ? value : null;
}

function saveStatusKind(error: AppError): "error" | "warning" {
  return error.code === "CONFLICT" ? "warning" : "error";
}

function saveStatusMessage(error: AppError): string {
  if (error.code === "CONFLICT") {
    return "同じ名前の研究ラインがあります。別の名前を使ってください。";
  }

  if (error.code === "VALIDATION_ERROR") {
    return "入力内容を確認してください。";
  }

  return error.message;
}

function formatDateTime(value: string): string {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "日時を確認できません";
  }

  return new Intl.DateTimeFormat("ja-JP", {
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    month: "long",
    year: "numeric",
  }).format(date);
}

export function ResearchLineDetailClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const id = searchParams.get("id");

  const [archiveConfirming, setArchiveConfirming] = useState(false);
  const [archiveState, setArchiveState] = useState<SaveState>({
    status: "idle",
  });
  const [detailState, setDetailState] = useState<DetailState>({
    status: "loading",
  });
  const [trialsState, setTrialsState] = useState<TrialsState>({
    status: "loading",
  });
  const [draft, setDraft] = useState<ResearchLineDraft>({
    description: "",
    title: "",
  });
  const [saveState, setSaveState] = useState<SaveState>({
    status: "idle",
  });
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let active = true;

    if (!id) {
      return () => {
        active = false;
      };
    }

    void getResearchLineById(id).then((result) => {
      if (!active) {
        return;
      }

      if (!result.ok) {
        setDetailState({ status: "error", error: result.error });
        return;
      }

      setDetailState({ status: "ready", line: result.data });
      setDraft({
        description: result.data.description ?? "",
        title: result.data.title,
      });
      setArchiveConfirming(false);
      setArchiveState({ status: "idle" });
      setSaveState({ status: "idle" });
    });

    void listTrialsByResearchLine(id).then((result) => {
      if (!active) {
        return;
      }

      if (!result.ok) {
        setTrialsState({
          status: "error",
          error: result.error,
          researchLineId: id,
        });
        return;
      }

      setTrialsState({
        status: "ready",
        researchLineId: id,
        trials: result.data,
      });
    });

    return () => {
      active = false;
    };
  }, [id, reloadKey]);

  async function handleSave(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (detailState.status !== "ready") {
      return;
    }

    setSaveState({ status: "saving" });

    const result = await updateResearchLine({
      description: optionalDescription(draft.description),
      id: detailState.line.id,
      title: draft.title,
    });

    if (!result.ok) {
      setSaveState({ status: "error", error: result.error });
      return;
    }

    setDetailState({ status: "ready", line: result.data });
    setDraft({
      description: result.data.description ?? "",
      title: result.data.title,
    });
    setSaveState({
      status: "success",
      message: "研究ラインを更新しました。",
    });
  }

  async function handleArchive() {
    if (detailState.status !== "ready") {
      return;
    }

    setArchiveState({ status: "saving" });

    const result = await archiveResearchLine(detailState.line.id);

    if (!result.ok) {
      setArchiveState({ status: "error", error: result.error });
      return;
    }

    router.push("/research-lines/");
  }

  const titleError =
    saveState.status === "error"
      ? saveState.error.fieldErrors?.title
      : undefined;
  const descriptionError =
    saveState.status === "error"
      ? saveState.error.fieldErrors?.description
      : undefined;
  const isSaving = saveState.status === "saving";
  const isArchiving = archiveState.status === "saving";
  const visibleDetailState = !id
    ? {
        status: "error" as const,
        error: appError(
          "VALIDATION_ERROR",
          "表示する研究ラインを確認してください。",
          {
            retryable: false,
          },
        ),
      }
    : detailState.status === "ready" && detailState.line.id !== id
      ? { status: "loading" as const }
      : detailState;
  const visibleTrialsState =
    visibleDetailState.status === "ready" &&
    trialsState.status !== "loading" &&
    trialsState.researchLineId !== visibleDetailState.line.id
      ? { status: "loading" as const }
      : trialsState;

  return (
    <AuthGate>
      <PageShell
        actions={
          <LinkButton href="/research-lines/" variant="secondary">
            一覧へ
          </LinkButton>
        }
        title="研究ライン詳細"
      >
        {visibleDetailState.status === "loading" ? (
          <StatusMessage role="status">
            研究ラインを読み込んでいます。
          </StatusMessage>
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
                href="/research-lines/"
                variant="secondary"
              >
                一覧へ戻る
              </LinkButton>
            </div>
          </section>
        ) : null}

        {visibleDetailState.status === "ready" ? (
          <div className="grid gap-4">
            <section className="grid gap-3 rounded-md border border-border bg-surface p-4">
              <div className="grid gap-2">
                <h2 className="text-xl font-bold leading-tight text-text">
                  {visibleDetailState.line.title}
                </h2>
                <p className="text-sm leading-6 text-muted">
                  {visibleDetailState.line.description
                    ? visibleDetailState.line.description
                    : "説明はまだありません。"}
                </p>
              </div>
              <dl className="grid gap-1 text-sm text-muted">
                <div className="flex flex-col gap-1 sm:flex-row sm:gap-2">
                  <dt className="font-semibold text-text">作成</dt>
                  <dd>{formatDateTime(visibleDetailState.line.createdAt)}</dd>
                </div>
                <div className="flex flex-col gap-1 sm:flex-row sm:gap-2">
                  <dt className="font-semibold text-text">更新</dt>
                  <dd>{formatDateTime(visibleDetailState.line.updatedAt)}</dd>
                </div>
              </dl>
            </section>

            <section className="grid gap-4 rounded-md border border-border bg-surface p-4">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div className="grid gap-1">
                  <h2 className="text-lg font-bold text-text">試行</h2>
                  <p className="text-sm leading-6 text-muted">
                    この研究ラインで記録した試行を最新順に表示します。
                  </p>
                </div>
                {visibleDetailState.line.archivedAt ? null : (
                  <LinkButton
                    className="w-full sm:w-auto"
                    href={`/trials/new/?researchLineId=${encodeURIComponent(
                      visibleDetailState.line.id,
                    )}`}
                  >
                    新しい試行
                  </LinkButton>
                )}
              </div>

              {visibleTrialsState.status === "loading" ? (
                <StatusMessage role="status">
                  試行を読み込んでいます。
                </StatusMessage>
              ) : null}

              {visibleTrialsState.status === "error" ? (
                <div className="grid gap-3">
                  <StatusMessage kind="error" role="alert">
                    {visibleTrialsState.error.message}
                  </StatusMessage>
                  <Button
                    className="w-full sm:w-auto"
                    onClick={() => {
                      setDetailState({ status: "loading" });
                      setTrialsState({ status: "loading" });
                      setReloadKey((key) => key + 1);
                    }}
                    variant="secondary"
                  >
                    もう一度読み込む
                  </Button>
                </div>
              ) : null}

              {visibleTrialsState.status === "ready" &&
              visibleTrialsState.trials.length === 0 ? (
                <div className="grid gap-3 rounded-md border border-border p-3">
                  <h3 className="text-base font-bold text-text">
                    まだ試行がありません
                  </h3>
                  <p className="text-sm leading-6 text-muted">
                    この研究ラインで最初の試行を記録します。
                  </p>
                  {visibleDetailState.line.archivedAt ? null : (
                    <LinkButton
                      className="w-full sm:w-auto"
                      href={`/trials/new/?researchLineId=${encodeURIComponent(
                        visibleDetailState.line.id,
                      )}`}
                    >
                      最初の試行を記録
                    </LinkButton>
                  )}
                </div>
              ) : null}

              {visibleTrialsState.status === "ready" &&
              visibleTrialsState.trials.length > 0 ? (
                <div className="grid gap-3">
                  {visibleTrialsState.trials.map((trial) => (
                    <article
                      className="grid gap-3 rounded-md border border-border p-3"
                      key={trial.id}
                    >
                      <div className="grid gap-1">
                        <h3 className="text-base font-bold leading-tight text-text">
                          {trial.title}
                        </h3>
                        <p className="text-sm text-muted">
                          {formatJstCalendarDate(trial.brewedAt)} / 評価{" "}
                          {trial.rating}
                        </p>
                      </div>
                      <p className="text-sm leading-6 text-muted">
                        {trial.note}
                      </p>
                      <div className="flex flex-col gap-2 sm:flex-row">
                        <LinkButton
                          className="w-full sm:w-auto"
                          href={`/trials/detail/?id=${encodeURIComponent(
                            trial.id,
                          )}`}
                          variant="secondary"
                        >
                          詳細
                        </LinkButton>
                        <LinkButton
                          className="w-full sm:w-auto"
                          href={`/trials/edit/?id=${encodeURIComponent(
                            trial.id,
                          )}`}
                          variant="secondary"
                        >
                          編集
                        </LinkButton>
                      </div>
                    </article>
                  ))}
                </div>
              ) : null}
            </section>

            {visibleDetailState.line.archivedAt ? (
              <StatusMessage kind="warning" role="status">
                この研究ラインはアーカイブ済みです。通常一覧と新しい試行の選択肢には表示しません。
              </StatusMessage>
            ) : (
              <>
                <section className="grid gap-4 rounded-md border border-border bg-surface p-4">
                  <div className="grid gap-1">
                    <h2 className="text-lg font-bold text-text">編集</h2>
                    <p className="text-sm leading-6 text-muted">
                      研究の軸だけを整えます。保存に失敗しても入力内容は保持します。
                    </p>
                  </div>

                  <form className="grid gap-4" onSubmit={handleSave}>
                    <TextInput
                      autoComplete="off"
                      disabled={isSaving}
                      error={titleError}
                      label="研究ライン名"
                      maxLength={80}
                      name="title"
                      onChange={(event) =>
                        setDraft((current) => ({
                          ...current,
                          title: event.target.value,
                        }))
                      }
                      value={draft.title}
                    />
                    <TextArea
                      disabled={isSaving}
                      error={descriptionError}
                      label="説明"
                      maxLength={500}
                      name="description"
                      onChange={(event) =>
                        setDraft((current) => ({
                          ...current,
                          description: event.target.value,
                        }))
                      }
                      rows={5}
                      value={draft.description}
                    />

                    {saveState.status === "error" ? (
                      <StatusMessage
                        kind={saveStatusKind(saveState.error)}
                        role="alert"
                      >
                        {saveStatusMessage(saveState.error)}
                      </StatusMessage>
                    ) : null}

                    {saveState.status === "success" ? (
                      <StatusMessage kind="success" role="status">
                        {saveState.message}
                      </StatusMessage>
                    ) : null}

                    <Button
                      className="w-full sm:w-auto"
                      disabled={isSaving}
                      type="submit"
                    >
                      {isSaving ? "保存中" : "変更を保存"}
                    </Button>
                  </form>
                </section>

                <section className="grid gap-3 rounded-md border border-border bg-surface p-4">
                  <div className="grid gap-1">
                    <h2 className="text-lg font-bold text-text">アーカイブ</h2>
                    <p className="text-sm leading-6 text-muted">
                      使わなくなった研究ラインを通常一覧から外します。物理削除はしません。
                    </p>
                  </div>

                  {archiveState.status === "error" ? (
                    <StatusMessage kind="error" role="alert">
                      {archiveState.error.message}
                    </StatusMessage>
                  ) : null}

                  {archiveConfirming ? (
                    <div className="grid gap-3 rounded-md border border-warning/40 bg-warning/10 p-3">
                      <p className="text-sm leading-6 text-text">
                        アーカイブ後も、既存の試行は履歴や詳細から参照できる前提で残ります。
                      </p>
                      <div className="flex flex-col gap-2 sm:flex-row">
                        <Button
                          className="w-full sm:w-auto"
                          disabled={isArchiving}
                          onClick={() => void handleArchive()}
                          variant="danger"
                        >
                          {isArchiving ? "処理中" : "アーカイブする"}
                        </Button>
                        <Button
                          className="w-full sm:w-auto"
                          disabled={isArchiving}
                          onClick={() => setArchiveConfirming(false)}
                          variant="secondary"
                        >
                          やめる
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <Button
                      className="w-full sm:w-auto"
                      onClick={() => setArchiveConfirming(true)}
                      variant="danger"
                    >
                      アーカイブ
                    </Button>
                  )}
                </section>
              </>
            )}
          </div>
        ) : null}
      </PageShell>
    </AuthGate>
  );
}
