"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { type FormEvent, useEffect, useMemo, useState } from "react";

import { AuthGate } from "@/components/auth/auth-gate";
import { PageShell } from "@/components/layout/page-shell";
import { Button, LinkButton } from "@/components/ui/button";
import { StatusMessage } from "@/components/ui/status-message";
import { TextArea } from "@/components/ui/text-area";
import { TextInput } from "@/components/ui/text-input";
import { appError, type AppError } from "@/lib/app-result";
import {
  listActiveResearchLines,
  type ResearchLine,
} from "@/lib/research-lines/data-access";
import {
  getTrialById,
  ingredientCategoryLabels,
  saveTrial,
  toJstDateInputValue,
  unitSuggestions,
  type IngredientCategory,
  type TrialDetail,
} from "@/lib/trials/data-access";

type TrialFormMode = "new" | "edit";

type LineOption = {
  archivedAt: string | null;
  id: string;
  title: string;
};

type IngredientDraft = {
  amount: string;
  category: IngredientCategory;
  name: string;
  unit: string;
};

type TrialDraft = {
  boilCount: string;
  brewedAtDate: string;
  brewingTimeMinutes: string;
  ingredients: IngredientDraft[];
  nextIdea: string;
  note: string;
  rating: string;
  researchLineId: string;
  strainer: string;
  title: string;
};

type LoadState =
  | { status: "loading" }
  | {
      status: "ready";
      canSave: boolean;
      lineOptions: LineOption[];
      originalTrial: TrialDetail | null;
    }
  | { status: "error"; error: AppError };

type SaveState =
  | { status: "idle" }
  | { status: "saving" }
  | { status: "error"; error: AppError };

const ingredientCategoryOptions: IngredientCategory[] = [
  "tea",
  "water",
  "milk",
  "sweetener",
  "spice",
  "other",
];

function getTodayJstDateInputValue(): string {
  return toJstDateInputValue(new Date().toISOString());
}

function emptyIngredient(
  category: IngredientCategory = "tea",
): IngredientDraft {
  return {
    amount: "",
    category,
    name: "",
    unit: "",
  };
}

function emptyDraft(researchLineId = ""): TrialDraft {
  return {
    boilCount: "",
    brewedAtDate: getTodayJstDateInputValue(),
    brewingTimeMinutes: "",
    ingredients: [emptyIngredient()],
    nextIdea: "",
    note: "",
    rating: "3",
    researchLineId,
    strainer: "",
    title: "",
  };
}

function lineOptionFromResearchLine(line: ResearchLine): LineOption {
  return {
    archivedAt: line.archivedAt,
    id: line.id,
    title: line.title,
  };
}

function draftFromTrial(trial: TrialDetail): TrialDraft {
  return {
    boilCount: trial.boilCount === null ? "" : String(trial.boilCount),
    brewedAtDate: trial.brewedAtDate,
    brewingTimeMinutes:
      trial.brewingTimeMinutes === null ? "" : String(trial.brewingTimeMinutes),
    ingredients:
      trial.ingredients.length > 0
        ? trial.ingredients.map((ingredient) => ({
            amount: ingredient.amount === null ? "" : String(ingredient.amount),
            category: ingredient.category,
            name: ingredient.name,
            unit: ingredient.unit ?? "",
          }))
        : [emptyIngredient()],
    nextIdea: trial.nextIdea,
    note: trial.note,
    rating: String(trial.rating),
    researchLineId: trial.researchLineId,
    strainer: trial.strainer ?? "",
    title: trial.title,
  };
}

function fieldError(error: AppError | null, field: string): string | undefined {
  return error?.fieldErrors?.[field];
}

function ingredientFieldError(
  error: AppError | null,
  index: number,
  field: keyof IngredientDraft,
): string | undefined {
  return error?.fieldErrors?.[`ingredients.${index}.${field}`];
}

function saveStatusMessage(error: AppError): string {
  if (error.code === "VALIDATION_ERROR") {
    return "入力内容を確認してください。";
  }

  if (error.code === "CONFLICT") {
    return "データの状態が変わっています。再読み込みして確認してください。";
  }

  return error.message;
}

export function TrialFormClient({ mode }: { mode: TrialFormMode }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const trialId = searchParams.get("id");
  const requestedResearchLineId = searchParams.get("researchLineId");

  const [draft, setDraft] = useState<TrialDraft>(() => emptyDraft());
  const [loadState, setLoadState] = useState<LoadState>({
    status: "loading",
  });
  const [saveState, setSaveState] = useState<SaveState>({ status: "idle" });

  useEffect(() => {
    let active = true;

    async function load() {
      setLoadState({ status: "loading" });
      setSaveState({ status: "idle" });

      const linesResult = await listActiveResearchLines();

      if (!active) {
        return;
      }

      if (!linesResult.ok) {
        setLoadState({ status: "error", error: linesResult.error });
        return;
      }

      const activeLineOptions = linesResult.data.map(
        lineOptionFromResearchLine,
      );

      if (mode === "new") {
        const preferredLineId =
          activeLineOptions.find((line) => line.id === requestedResearchLineId)
            ?.id ??
          activeLineOptions[0]?.id ??
          "";

        setDraft(emptyDraft(preferredLineId));
        setLoadState({
          status: "ready",
          canSave: activeLineOptions.length > 0,
          lineOptions: activeLineOptions,
          originalTrial: null,
        });
        return;
      }

      if (!trialId) {
        setLoadState({
          status: "error",
          error: appError(
            "VALIDATION_ERROR",
            "編集する試行を確認してください。",
            {
              retryable: false,
            },
          ),
        });
        return;
      }

      const trialResult = await getTrialById(trialId);

      if (!active) {
        return;
      }

      if (!trialResult.ok) {
        setLoadState({ status: "error", error: trialResult.error });
        return;
      }

      const trial = trialResult.data;
      const lineOptions = activeLineOptions.some(
        (line) => line.id === trial.researchLine.id,
      )
        ? activeLineOptions
        : [
            {
              archivedAt: trial.researchLine.archivedAt,
              id: trial.researchLine.id,
              title: trial.researchLine.title,
            },
            ...activeLineOptions,
          ];

      setDraft(draftFromTrial(trial));
      setLoadState({
        status: "ready",
        canSave: trial.researchLine.archivedAt === null,
        lineOptions,
        originalTrial: trial,
      });
    }

    void load();

    return () => {
      active = false;
    };
  }, [mode, requestedResearchLineId, trialId]);

  const saveError = saveState.status === "error" ? saveState.error : null;
  const isSaving = saveState.status === "saving";
  const pageTitle = mode === "new" ? "新しい試行" : "試行編集";
  const backHref = useMemo(() => {
    if (loadState.status === "ready" && loadState.originalTrial) {
      return `/trials/detail/?id=${encodeURIComponent(
        loadState.originalTrial.id,
      )}`;
    }

    if (draft.researchLineId) {
      return `/research-lines/detail/?id=${encodeURIComponent(
        draft.researchLineId,
      )}`;
    }

    return "/trials/history/";
  }, [draft.researchLineId, loadState]);

  function updateIngredient(
    index: number,
    patch: Partial<IngredientDraft>,
  ): void {
    setDraft((current) => ({
      ...current,
      ingredients: current.ingredients.map((ingredient, itemIndex) =>
        itemIndex === index ? { ...ingredient, ...patch } : ingredient,
      ),
    }));
  }

  function removeIngredient(index: number): void {
    setDraft((current) => {
      if (current.ingredients.length <= 1) {
        return current;
      }

      return {
        ...current,
        ingredients: current.ingredients.filter(
          (_ingredient, itemIndex) => itemIndex !== index,
        ),
      };
    });
  }

  async function handleSave(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (loadState.status !== "ready" || !loadState.canSave) {
      return;
    }

    setSaveState({ status: "saving" });

    const result = await saveTrial({
      boilCount: draft.boilCount,
      brewedAtDate: draft.brewedAtDate,
      brewingTimeMinutes: draft.brewingTimeMinutes,
      id: mode === "edit" ? loadState.originalTrial?.id : null,
      ingredients: draft.ingredients,
      nextIdea: draft.nextIdea,
      note: draft.note,
      parentTrialId: loadState.originalTrial?.parentTrialId ?? null,
      rating: draft.rating,
      researchLineId: draft.researchLineId,
      strainer: draft.strainer,
      title: draft.title,
    });

    if (!result.ok) {
      setSaveState({ status: "error", error: result.error });
      return;
    }

    router.push(`/trials/detail/?id=${encodeURIComponent(result.data.id)}`);
  }

  return (
    <AuthGate>
      <PageShell
        actions={
          <LinkButton href={backHref} variant="secondary">
            戻る
          </LinkButton>
        }
        title={pageTitle}
      >
        {loadState.status === "loading" ? (
          <StatusMessage role="status">
            試行入力を準備しています。
          </StatusMessage>
        ) : null}

        {loadState.status === "error" ? (
          <section className="grid gap-3 rounded-md border border-border bg-surface p-4">
            <StatusMessage kind="error" role="alert">
              {loadState.error.message}
            </StatusMessage>
            <div className="flex flex-col gap-2 sm:flex-row">
              <LinkButton
                className="w-full sm:w-auto"
                href="/trials/history/"
                variant="secondary"
              >
                履歴へ戻る
              </LinkButton>
              <LinkButton
                className="w-full sm:w-auto"
                href="/research-lines/"
                variant="secondary"
              >
                研究ラインへ
              </LinkButton>
            </div>
          </section>
        ) : null}

        {loadState.status === "ready" ? (
          <form className="grid max-w-3xl gap-4" onSubmit={handleSave}>
            {loadState.lineOptions.length === 0 ? (
              <section className="grid gap-3 rounded-md border border-border bg-surface p-4">
                <StatusMessage kind="warning" role="status">
                  新しい試行を保存するには、先に研究ラインを作成してください。
                </StatusMessage>
                <LinkButton
                  className="w-full sm:w-auto"
                  href="/research-lines/"
                  variant="secondary"
                >
                  研究ラインを作成
                </LinkButton>
              </section>
            ) : null}

            {!loadState.canSave ? (
              <StatusMessage kind="warning" role="status">
                この試行の研究ラインはアーカイブ済みです。内容は確認できますが、編集保存はできません。
              </StatusMessage>
            ) : null}

            <section className="grid gap-4 rounded-md border border-border bg-surface p-4">
              <div className="grid gap-1">
                <h2 className="text-lg font-bold text-text">基本</h2>
              </div>

              <label className="grid gap-2 text-sm font-semibold text-text">
                研究ライン
                <select
                  aria-invalid={
                    fieldError(saveError, "researchLineId") ? "true" : "false"
                  }
                  className="min-h-11 rounded-md border border-border bg-surface px-3 py-2 text-base font-normal text-text outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
                  disabled={isSaving || !loadState.canSave}
                  name="researchLineId"
                  onChange={(event) =>
                    setDraft((current) => ({
                      ...current,
                      researchLineId: event.target.value,
                    }))
                  }
                  value={draft.researchLineId}
                >
                  {loadState.lineOptions.map((line) => (
                    <option
                      disabled={line.archivedAt !== null}
                      key={line.id}
                      value={line.id}
                    >
                      {line.archivedAt
                        ? `${line.title}（アーカイブ済み）`
                        : line.title}
                    </option>
                  ))}
                </select>
                {fieldError(saveError, "researchLineId") ? (
                  <span className="text-sm font-normal text-error">
                    {fieldError(saveError, "researchLineId")}
                  </span>
                ) : null}
              </label>

              <TextInput
                disabled={isSaving || !loadState.canSave}
                error={fieldError(saveError, "title")}
                label="試行名"
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

              <TextInput
                disabled={isSaving || !loadState.canSave}
                error={fieldError(saveError, "brewedAtDate")}
                label="日付"
                name="brewedAtDate"
                onChange={(event) =>
                  setDraft((current) => ({
                    ...current,
                    brewedAtDate: event.target.value,
                  }))
                }
                type="date"
                value={draft.brewedAtDate}
              />

              <label className="grid gap-2 text-sm font-semibold text-text">
                総合評価
                <select
                  className="min-h-11 rounded-md border border-border bg-surface px-3 py-2 text-base font-normal text-text outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
                  disabled={isSaving || !loadState.canSave}
                  name="rating"
                  onChange={(event) =>
                    setDraft((current) => ({
                      ...current,
                      rating: event.target.value,
                    }))
                  }
                  value={draft.rating}
                >
                  {[1, 2, 3, 4, 5].map((rating) => (
                    <option key={rating} value={rating}>
                      {rating}
                    </option>
                  ))}
                </select>
                {fieldError(saveError, "rating") ? (
                  <span className="text-sm font-normal text-error">
                    {fieldError(saveError, "rating")}
                  </span>
                ) : null}
              </label>
            </section>

            <section className="grid gap-4 rounded-md border border-border bg-surface p-4">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <h2 className="text-lg font-bold text-text">材料</h2>
                <Button
                  className="w-full sm:w-auto"
                  disabled={isSaving || !loadState.canSave}
                  onClick={() =>
                    setDraft((current) => ({
                      ...current,
                      ingredients: [
                        ...current.ingredients,
                        emptyIngredient("other"),
                      ],
                    }))
                  }
                  variant="secondary"
                >
                  材料を追加
                </Button>
              </div>

              {fieldError(saveError, "ingredients") ? (
                <StatusMessage kind="error" role="alert">
                  {fieldError(saveError, "ingredients")}
                </StatusMessage>
              ) : null}

              <datalist id="trial-unit-suggestions">
                {unitSuggestions.map((unit) => (
                  <option key={unit} value={unit} />
                ))}
              </datalist>

              <div className="grid gap-3">
                {draft.ingredients.map((ingredient, index) => (
                  <div
                    className="grid gap-3 rounded-md border border-border p-3"
                    key={index}
                  >
                    <label className="grid gap-2 text-sm font-semibold text-text">
                      カテゴリ
                      <select
                        className="min-h-11 rounded-md border border-border bg-surface px-3 py-2 text-base font-normal text-text outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
                        disabled={isSaving || !loadState.canSave}
                        name={`ingredient-${index}-category`}
                        onChange={(event) =>
                          updateIngredient(index, {
                            category: event.target.value as IngredientCategory,
                          })
                        }
                        value={ingredient.category}
                      >
                        {ingredientCategoryOptions.map((category) => (
                          <option key={category} value={category}>
                            {ingredientCategoryLabels[category]}
                          </option>
                        ))}
                      </select>
                    </label>

                    <TextInput
                      disabled={isSaving || !loadState.canSave}
                      error={ingredientFieldError(saveError, index, "name")}
                      label="材料名"
                      maxLength={80}
                      name={`ingredient-${index}-name`}
                      onChange={(event) =>
                        updateIngredient(index, { name: event.target.value })
                      }
                      value={ingredient.name}
                    />

                    <div className="grid gap-3 sm:grid-cols-2">
                      <TextInput
                        disabled={isSaving || !loadState.canSave}
                        error={ingredientFieldError(saveError, index, "amount")}
                        label="量"
                        min="0"
                        name={`ingredient-${index}-amount`}
                        onChange={(event) =>
                          updateIngredient(index, {
                            amount: event.target.value,
                          })
                        }
                        step="0.01"
                        type="number"
                        value={ingredient.amount}
                      />
                      <TextInput
                        disabled={isSaving || !loadState.canSave}
                        error={ingredientFieldError(saveError, index, "unit")}
                        label="単位"
                        list="trial-unit-suggestions"
                        maxLength={16}
                        name={`ingredient-${index}-unit`}
                        onChange={(event) =>
                          updateIngredient(index, { unit: event.target.value })
                        }
                        value={ingredient.unit}
                      />
                    </div>

                    <Button
                      className="w-full sm:w-auto"
                      disabled={
                        isSaving ||
                        !loadState.canSave ||
                        draft.ingredients.length <= 1
                      }
                      onClick={() => removeIngredient(index)}
                      variant="danger"
                    >
                      材料を外す
                    </Button>
                  </div>
                ))}
              </div>
            </section>

            <section className="grid gap-4 rounded-md border border-border bg-surface p-4">
              <h2 className="text-lg font-bold text-text">記録</h2>
              <TextArea
                disabled={isSaving || !loadState.canSave}
                error={fieldError(saveError, "note")}
                label="一言メモ"
                maxLength={1000}
                name="note"
                onChange={(event) =>
                  setDraft((current) => ({
                    ...current,
                    note: event.target.value,
                  }))
                }
                rows={5}
                value={draft.note}
              />
              <TextArea
                disabled={isSaving || !loadState.canSave}
                error={fieldError(saveError, "nextIdea")}
                label="次回の狙い"
                maxLength={1000}
                name="nextIdea"
                onChange={(event) =>
                  setDraft((current) => ({
                    ...current,
                    nextIdea: event.target.value,
                  }))
                }
                rows={5}
                value={draft.nextIdea}
              />
            </section>

            <details className="rounded-md border border-border bg-surface p-4">
              <summary className="cursor-pointer text-lg font-bold text-text">
                詳細項目
              </summary>
              <div className="mt-4 grid gap-4">
                <TextInput
                  disabled={isSaving || !loadState.canSave}
                  error={fieldError(saveError, "brewingTimeMinutes")}
                  label="煮出し時間（分）"
                  min="0"
                  name="brewingTimeMinutes"
                  onChange={(event) =>
                    setDraft((current) => ({
                      ...current,
                      brewingTimeMinutes: event.target.value,
                    }))
                  }
                  step="0.01"
                  type="number"
                  value={draft.brewingTimeMinutes}
                />
                <TextInput
                  disabled={isSaving || !loadState.canSave}
                  error={fieldError(saveError, "boilCount")}
                  label="沸騰回数"
                  max="20"
                  min="0"
                  name="boilCount"
                  onChange={(event) =>
                    setDraft((current) => ({
                      ...current,
                      boilCount: event.target.value,
                    }))
                  }
                  step="1"
                  type="number"
                  value={draft.boilCount}
                />
                <TextInput
                  disabled={isSaving || !loadState.canSave}
                  error={fieldError(saveError, "strainer")}
                  label="こし方"
                  maxLength={80}
                  name="strainer"
                  onChange={(event) =>
                    setDraft((current) => ({
                      ...current,
                      strainer: event.target.value,
                    }))
                  }
                  value={draft.strainer}
                />
              </div>
            </details>

            {saveState.status === "error" ? (
              <StatusMessage
                kind={saveState.error.code === "CONFLICT" ? "warning" : "error"}
                role="alert"
              >
                {saveStatusMessage(saveState.error)}
              </StatusMessage>
            ) : null}

            <div className="flex flex-col gap-2 sm:flex-row">
              <Button
                className="w-full sm:w-auto"
                disabled={isSaving || !loadState.canSave}
                type="submit"
              >
                {isSaving ? "保存中" : "試行を保存"}
              </Button>
              <LinkButton
                className="w-full sm:w-auto"
                href={backHref}
                variant="secondary"
              >
                キャンセル
              </LinkButton>
            </div>
          </form>
        ) : null}
      </PageShell>
    </AuthGate>
  );
}
