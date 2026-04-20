"use client";

import { type FormEvent, useEffect, useState } from "react";

import { AuthGate } from "@/components/auth/auth-gate";
import { PageShell } from "@/components/layout/page-shell";
import { Button, LinkButton } from "@/components/ui/button";
import { StatusMessage } from "@/components/ui/status-message";
import { TextArea } from "@/components/ui/text-area";
import { TextInput } from "@/components/ui/text-input";
import type { AppError } from "@/lib/app-result";
import {
  archiveResearchLine,
  createResearchLine,
  listActiveResearchLines,
  type ResearchLine,
} from "@/lib/research-lines/data-access";

type ListState =
  | { status: "loading" }
  | { status: "ready"; lines: ResearchLine[] }
  | { status: "error"; error: AppError };

type SaveState =
  | { status: "idle" }
  | { status: "saving" }
  | { status: "success"; message: string }
  | { status: "error"; error: AppError };

type ArchiveState =
  | { status: "idle" }
  | { status: "saving"; id: string }
  | { status: "success"; title: string }
  | { status: "error"; id: string; error: AppError };

type ResearchLineDraft = {
  description: string;
  title: string;
};

const emptyDraft: ResearchLineDraft = {
  description: "",
  title: "",
};

function optionalDescription(value: string): string | null {
  return value.length > 0 ? value : null;
}

function formatDateTime(value: string): string {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "更新日時を確認できません";
  }

  return new Intl.DateTimeFormat("ja-JP", {
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    month: "long",
    year: "numeric",
  }).format(date);
}

function saveStatusKind(error: AppError): "error" | "warning" {
  return error.code === "CONFLICT" ? "warning" : "error";
}

function saveStatusMessage(error: AppError): string {
  if (error.code === "CONFLICT") {
    return "同じ名前の研究ラインがあります。別の名前にするか、一覧を確認してください。";
  }

  if (error.code === "VALIDATION_ERROR") {
    return "入力内容を確認してください。";
  }

  return error.message;
}

function appendLine(lines: ResearchLine[], line: ResearchLine): ResearchLine[] {
  return [line, ...lines.filter((item) => item.id !== line.id)];
}

export function ResearchLinesListClient() {
  const [archiveState, setArchiveState] = useState<ArchiveState>({
    status: "idle",
  });
  const [confirmArchiveId, setConfirmArchiveId] = useState<string | null>(null);
  const [createDraft, setCreateDraft] = useState<ResearchLineDraft>(emptyDraft);
  const [createState, setCreateState] = useState<SaveState>({
    status: "idle",
  });
  const [listState, setListState] = useState<ListState>({
    status: "loading",
  });
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let active = true;

    void listActiveResearchLines().then((result) => {
      if (!active) {
        return;
      }

      if (!result.ok) {
        setListState({ status: "error", error: result.error });
        return;
      }

      setListState({ status: "ready", lines: result.data });
    });

    return () => {
      active = false;
    };
  }, [reloadKey]);

  async function handleCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setCreateState({ status: "saving" });

    const result = await createResearchLine({
      description: optionalDescription(createDraft.description),
      title: createDraft.title,
    });

    if (!result.ok) {
      setCreateState({ status: "error", error: result.error });
      return;
    }

    setListState((current) => {
      if (current.status !== "ready") {
        return { status: "ready", lines: [result.data] };
      }

      return {
        status: "ready",
        lines: appendLine(current.lines, result.data),
      };
    });
    setCreateDraft(emptyDraft);
    setCreateState({
      status: "success",
      message: "研究ラインを作成しました。",
    });
  }

  async function handleArchive(line: ResearchLine) {
    setArchiveState({ status: "saving", id: line.id });

    const result = await archiveResearchLine(line.id);

    if (!result.ok) {
      setArchiveState({ status: "error", id: line.id, error: result.error });
      return;
    }

    setListState((current) => {
      if (current.status !== "ready") {
        return current;
      }

      return {
        status: "ready",
        lines: current.lines.filter((item) => item.id !== line.id),
      };
    });
    setConfirmArchiveId(null);
    setArchiveState({ status: "success", title: line.title });
  }

  const titleError =
    createState.status === "error"
      ? createState.error.fieldErrors?.title
      : undefined;
  const descriptionError =
    createState.status === "error"
      ? createState.error.fieldErrors?.description
      : undefined;
  const isCreating = createState.status === "saving";

  return (
    <AuthGate>
      <PageShell title="研究ライン">
        <section className="grid gap-4 rounded-md border border-border bg-surface p-4">
          <div className="grid gap-1">
            <h2 className="text-lg font-bold text-text">
              新しい研究ラインを記録
            </h2>
            <p className="text-sm leading-6 text-muted">
              続けて試したい方向性だけを短く残します。説明は後から足せます。
            </p>
          </div>

          <form className="grid gap-4" onSubmit={handleCreate}>
            <TextInput
              autoComplete="off"
              disabled={isCreating}
              error={titleError}
              label="研究ライン名"
              maxLength={80}
              name="title"
              onChange={(event) =>
                setCreateDraft((draft) => ({
                  ...draft,
                  title: event.target.value,
                }))
              }
              value={createDraft.title}
            />
            <TextArea
              disabled={isCreating}
              error={descriptionError}
              label="説明"
              maxLength={500}
              name="description"
              onChange={(event) =>
                setCreateDraft((draft) => ({
                  ...draft,
                  description: event.target.value,
                }))
              }
              rows={4}
              value={createDraft.description}
            />

            {createState.status === "error" ? (
              <StatusMessage
                kind={saveStatusKind(createState.error)}
                role="alert"
              >
                {saveStatusMessage(createState.error)}
              </StatusMessage>
            ) : null}

            {createState.status === "success" ? (
              <StatusMessage kind="success" role="status">
                {createState.message}
              </StatusMessage>
            ) : null}

            <div className="flex flex-col gap-2 sm:flex-row">
              <Button
                className="w-full sm:w-auto"
                disabled={isCreating}
                type="submit"
              >
                {isCreating ? "保存中" : "研究ラインを作成"}
              </Button>
            </div>
          </form>
        </section>

        <section className="grid gap-4">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div className="grid gap-1">
              <h2 className="text-lg font-bold text-text">
                継続中の研究ライン
              </h2>
              <p className="text-sm leading-6 text-muted">
                アーカイブ済みの研究ラインはこの一覧には表示しません。
              </p>
            </div>
            <Button
              className="w-full sm:w-auto"
              onClick={() => {
                setListState({ status: "loading" });
                setReloadKey((key) => key + 1);
              }}
              variant="secondary"
            >
              再読み込み
            </Button>
          </div>

          {archiveState.status === "success" ? (
            <StatusMessage kind="success" role="status">
              「{archiveState.title}」をアーカイブしました。
            </StatusMessage>
          ) : null}

          {listState.status === "loading" ? (
            <StatusMessage role="status">
              研究ラインを読み込んでいます。
            </StatusMessage>
          ) : null}

          {listState.status === "error" ? (
            <div className="grid gap-3 rounded-md border border-border bg-surface p-4">
              <StatusMessage kind="error" role="alert">
                {listState.error.message}
              </StatusMessage>
              <Button
                className="w-full sm:w-auto"
                onClick={() => {
                  setListState({ status: "loading" });
                  setReloadKey((key) => key + 1);
                }}
                variant="secondary"
              >
                もう一度読み込む
              </Button>
            </div>
          ) : null}

          {listState.status === "ready" && listState.lines.length === 0 ? (
            <div className="grid gap-3 rounded-md border border-border bg-surface p-4">
              <h3 className="text-base font-bold text-text">
                まだ研究ラインがありません
              </h3>
              <p className="text-sm leading-6 text-muted">
                まずは「朝に飲みたい」「生姜を強める」など、次も試したい軸を1つ作ります。
              </p>
            </div>
          ) : null}

          {listState.status === "ready" && listState.lines.length > 0 ? (
            <div className="grid gap-3">
              {listState.lines.map((line) => {
                const archiveError =
                  archiveState.status === "error" && archiveState.id === line.id
                    ? archiveState.error
                    : null;
                const isArchiving =
                  archiveState.status === "saving" &&
                  archiveState.id === line.id;
                const isConfirming = confirmArchiveId === line.id;

                return (
                  <article
                    className="grid gap-4 rounded-md border border-border bg-surface p-4"
                    key={line.id}
                  >
                    <div className="grid gap-2">
                      <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
                        <h3 className="text-lg font-bold leading-tight text-text">
                          {line.title}
                        </h3>
                        <span className="text-sm text-muted">
                          更新: {formatDateTime(line.updatedAt)}
                        </span>
                      </div>
                      <p className="text-sm leading-6 text-muted">
                        {line.description
                          ? line.description
                          : "説明はまだありません。"}
                      </p>
                    </div>

                    {archiveError ? (
                      <StatusMessage kind="error" role="alert">
                        {archiveError.message}
                      </StatusMessage>
                    ) : null}

                    {isConfirming ? (
                      <div className="grid gap-3 rounded-md border border-warning/40 bg-warning/10 p-3">
                        <p className="text-sm leading-6 text-text">
                          この研究ラインをアーカイブします。既存の試行は履歴や詳細から参照できる前提で残ります。
                        </p>
                        <div className="flex flex-col gap-2 sm:flex-row">
                          <Button
                            className="w-full sm:w-auto"
                            disabled={isArchiving}
                            onClick={() => void handleArchive(line)}
                            variant="danger"
                          >
                            {isArchiving ? "処理中" : "アーカイブする"}
                          </Button>
                          <Button
                            className="w-full sm:w-auto"
                            disabled={isArchiving}
                            onClick={() => setConfirmArchiveId(null)}
                            variant="secondary"
                          >
                            やめる
                          </Button>
                        </div>
                      </div>
                    ) : null}

                    <div className="flex flex-col gap-2 sm:flex-row">
                      <LinkButton
                        className="w-full sm:w-auto"
                        href={`/research-lines/detail/?id=${encodeURIComponent(
                          line.id,
                        )}`}
                        variant="secondary"
                      >
                        詳細と編集
                      </LinkButton>
                      <Button
                        className="w-full sm:w-auto"
                        disabled={isArchiving}
                        onClick={() => setConfirmArchiveId(line.id)}
                        variant="danger"
                      >
                        アーカイブ
                      </Button>
                    </div>
                  </article>
                );
              })}
            </div>
          ) : null}
        </section>
      </PageShell>
    </AuthGate>
  );
}
