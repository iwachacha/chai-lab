"use client";

import { useEffect, useState } from "react";

import { AuthGate } from "@/components/auth/auth-gate";
import { PageShell } from "@/components/layout/page-shell";
import { Button, LinkButton } from "@/components/ui/button";
import { StatusMessage } from "@/components/ui/status-message";
import { type AppError } from "@/lib/app-result";
import {
  listResearchLines,
  type ResearchLine,
} from "@/lib/research-lines/data-access";
import {
  formatJstCalendarDate,
  listTrials,
  type TrialSummary,
} from "@/lib/trials/data-access";

type HistoryState =
  | { status: "loading" }
  | {
      status: "ready";
      lineTitlesById: Record<string, string>;
      trials: TrialSummary[];
    }
  | { status: "error"; error: AppError };

function lineTitleMap(lines: ResearchLine[]): Record<string, string> {
  return Object.fromEntries(lines.map((line) => [line.id, line.title]));
}

export function TrialHistoryClient() {
  const [historyState, setHistoryState] = useState<HistoryState>({
    status: "loading",
  });
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let active = true;

    async function load() {
      setHistoryState({ status: "loading" });

      const [trialsResult, linesResult] = await Promise.all([
        listTrials(),
        listResearchLines({ includeArchived: true }),
      ]);

      if (!active) {
        return;
      }

      if (!trialsResult.ok) {
        setHistoryState({ status: "error", error: trialsResult.error });
        return;
      }

      if (!linesResult.ok) {
        setHistoryState({ status: "error", error: linesResult.error });
        return;
      }

      setHistoryState({
        status: "ready",
        lineTitlesById: lineTitleMap(linesResult.data),
        trials: trialsResult.data,
      });
    }

    void load();

    return () => {
      active = false;
    };
  }, [reloadKey]);

  return (
    <AuthGate>
      <PageShell
        actions={
          <LinkButton href="/trials/new/" variant="primary">
            新しい試行
          </LinkButton>
        }
        title="試行履歴"
      >
        {historyState.status === "loading" ? (
          <StatusMessage role="status">
            試行履歴を読み込んでいます。
          </StatusMessage>
        ) : null}

        {historyState.status === "error" ? (
          <section className="grid gap-3 rounded-md border border-border bg-surface p-4">
            <StatusMessage kind="error" role="alert">
              {historyState.error.message}
            </StatusMessage>
            <Button
              className="w-full sm:w-auto"
              onClick={() => setReloadKey((key) => key + 1)}
              variant="secondary"
            >
              もう一度読み込む
            </Button>
          </section>
        ) : null}

        {historyState.status === "ready" && historyState.trials.length === 0 ? (
          <section className="grid gap-3 rounded-md border border-border bg-surface p-4">
            <h2 className="text-lg font-bold text-text">
              まだ試行がありません
            </h2>
            <p className="text-sm leading-6 text-muted">
              研究ラインを選び、最初の試行を記録します。
            </p>
            <LinkButton className="w-full sm:w-auto" href="/trials/new/">
              新しい試行
            </LinkButton>
          </section>
        ) : null}

        {historyState.status === "ready" && historyState.trials.length > 0 ? (
          <section className="grid gap-3">
            {historyState.trials.map((trial) => (
              <article
                className="grid gap-3 rounded-md border border-border bg-surface p-4"
                key={trial.id}
              >
                <div className="grid gap-1">
                  <p className="text-sm font-semibold text-primary">
                    {historyState.lineTitlesById[trial.researchLineId] ??
                      "研究ラインを確認できません"}
                  </p>
                  <h2 className="text-lg font-bold leading-tight text-text">
                    {trial.title}
                  </h2>
                  <p className="text-sm text-muted">
                    {formatJstCalendarDate(trial.brewedAt)} / 評価{" "}
                    {trial.rating}
                  </p>
                </div>
                <p className="line-clamp-2 text-sm leading-6 text-muted">
                  {trial.note}
                </p>
                <div className="flex flex-col gap-2 sm:flex-row">
                  <LinkButton
                    className="w-full sm:w-auto"
                    href={`/trials/detail/?id=${encodeURIComponent(trial.id)}`}
                    variant="secondary"
                  >
                    詳細
                  </LinkButton>
                  <LinkButton
                    className="w-full sm:w-auto"
                    href={`/trials/edit/?id=${encodeURIComponent(trial.id)}`}
                    variant="secondary"
                  >
                    編集
                  </LinkButton>
                </div>
              </article>
            ))}
          </section>
        ) : null}
      </PageShell>
    </AuthGate>
  );
}
