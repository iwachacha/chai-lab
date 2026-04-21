"use client";

import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";

import {
  appError,
  err,
  ok,
  unknownAppError,
  type AppError,
  type AppResult,
} from "@/lib/app-result";
import { getCurrentSession, type CurrentSession } from "@/lib/auth/data-access";
import { getSupabaseBrowserClient } from "@/lib/supabase/browser-client";

const TRIAL_COLUMNS =
  "id, research_line_id, parent_trial_id, title, brewed_at, rating, brewing_time_minutes, boil_count, strainer, note, next_idea, created_at, updated_at";
const INGREDIENT_COLUMNS =
  "id, trial_id, category, name, amount, unit, timing, display_order";
const RESEARCH_LINE_SUMMARY_COLUMNS = "id, title, archived_at";
const TRIAL_STATS_COLUMNS = "research_line_id, brewed_at";

const ingredientCategoryValues = [
  "tea",
  "water",
  "milk",
  "sweetener",
  "spice",
  "other",
] as const;

export type IngredientCategory = (typeof ingredientCategoryValues)[number];

export const ingredientCategoryLabels: Record<IngredientCategory, string> = {
  milk: "ミルク",
  other: "その他",
  spice: "スパイス",
  sweetener: "甘味",
  tea: "茶葉",
  water: "水",
};

export const unitSuggestions = ["g", "ml", "tsp", "tbsp", "piece", "pinch"];

type TrialRow = {
  id: string;
  research_line_id: string;
  parent_trial_id: string | null;
  title: string;
  brewed_at: string;
  rating: number;
  brewing_time_minutes: number | null;
  boil_count: number | null;
  strainer: string | null;
  note: string;
  next_idea: string;
  created_at: string;
  updated_at: string;
};

type TrialIngredientRow = {
  id: string;
  trial_id: string;
  category: IngredientCategory;
  name: string;
  amount: number | null;
  unit: string | null;
  timing: string | null;
  display_order: number;
};

type ResearchLineSummaryRow = {
  id: string;
  title: string;
  archived_at: string | null;
};

type ParentTrialRow = {
  id: string;
  title: string;
};

type StructuredSupabaseError = {
  code?: string;
  details?: string;
  hint?: string;
  message?: string;
};

type TrialsDeps = {
  getCurrentSession: () => Promise<AppResult<CurrentSession | null>>;
  getSupabaseBrowserClient: () => AppResult<SupabaseClient>;
};

const defaultTrialsDeps: TrialsDeps = {
  getCurrentSession,
  getSupabaseBrowserClient,
};

export type TrialIngredient = {
  id: string;
  trialId: string;
  category: IngredientCategory;
  name: string;
  amount: number | null;
  unit: string | null;
  timing: string | null;
  displayOrder: number;
};

export type TrialSummary = {
  id: string;
  researchLineId: string;
  parentTrialId: string | null;
  title: string;
  brewedAt: string;
  brewedAtDate: string;
  rating: number;
  note: string;
  nextIdea: string;
  createdAt: string;
  updatedAt: string;
};

export type TrialDetail = TrialSummary & {
  brewingTimeMinutes: number | null;
  boilCount: number | null;
  strainer: string | null;
  ingredients: TrialIngredient[];
  parentTrial: ParentTrialRow | null;
  researchLine: {
    id: string;
    title: string;
    archivedAt: string | null;
  };
};

export type SaveTrialIngredientInput = {
  amount?: number | string | null;
  category: IngredientCategory;
  displayOrder?: number | string | null;
  name: string;
  timing?: string | null;
  unit?: string | null;
};

export type SaveTrialInput = {
  boilCount?: number | string | null;
  brewedAtDate: string;
  brewingTimeMinutes?: number | string | null;
  id?: string | null;
  ingredients: SaveTrialIngredientInput[];
  nextIdea: string;
  note: string;
  parentTrialId?: string | null;
  rating: number | string;
  researchLineId: string;
  strainer?: string | null;
  title: string;
};

export type TrialListOptions = {
  limit?: number;
  researchLineId?: string;
};

export type TrialStatsByResearchLine = Record<
  string,
  {
    lastBrewedAt: string | null;
    lastBrewedAtDate: string | null;
    trialCount: number;
  }
>;

const uuidSchema = z.string().uuid("対象の試行を確認してください。");

const uuidArraySchema = z.array(
  z.string().uuid("研究ラインを確認してください。"),
);

const optionalUuidSchema = z
  .union([z.string().uuid(), z.literal(""), z.null(), z.undefined()])
  .transform((value) => (value ? value : null));

const requiredTrimmedText = (message: string, max: number) =>
  z
    .string()
    .transform((value) => value.trim())
    .pipe(
      z.string().min(1, message).max(max, `${max}文字以内で入力してください。`),
    );

const optionalTrimmedText = (max: number) =>
  z
    .union([z.string(), z.null(), z.undefined()])
    .transform((value) => {
      const trimmed = (value ?? "").trim();
      return trimmed.length > 0 ? trimmed : null;
    })
    .pipe(z.string().max(max, `${max}文字以内で入力してください。`).nullable());

const optionalNonnegativeNumber = z.preprocess(
  (value) =>
    value === "" || value === null || value === undefined ? null : value,
  z.coerce
    .number("数値で入力してください。")
    .nonnegative("0以上で入力してください。")
    .nullable(),
);

const optionalBoilCount = z.preprocess(
  (value) =>
    value === "" || value === null || value === undefined ? null : value,
  z.coerce
    .number("数値で入力してください。")
    .int("整数で入力してください。")
    .min(0, "0以上で入力してください。")
    .max(20, "20回以内で入力してください。")
    .nullable(),
);

const optionalDisplayOrder = z.preprocess(
  (value) =>
    value === "" || value === null || value === undefined ? null : value,
  z.coerce
    .number("数値で入力してください。")
    .int("整数で入力してください。")
    .min(0, "0以上で入力してください。")
    .nullable(),
);

const jstDateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "日付を選択してください。")
  .refine((value) => dateOnlyToJstStartIso(value) !== null, {
    message: "日付を確認してください。",
  });

const ingredientInputSchema = z.object({
  amount: optionalNonnegativeNumber.optional(),
  category: z.enum(ingredientCategoryValues),
  displayOrder: optionalDisplayOrder.optional(),
  name: requiredTrimmedText("材料名を入力してください。", 80),
  timing: optionalTrimmedText(80).optional(),
  unit: optionalTrimmedText(16).optional(),
});

const saveTrialInputSchema = z.object({
  boilCount: optionalBoilCount.optional(),
  brewedAtDate: jstDateSchema,
  brewingTimeMinutes: optionalNonnegativeNumber.optional(),
  id: optionalUuidSchema.optional(),
  ingredients: z
    .array(ingredientInputSchema)
    .min(1, "材料行を1件以上入力してください。"),
  nextIdea: requiredTrimmedText("次回の狙いを入力してください。", 1000),
  note: requiredTrimmedText("一言メモを入力してください。", 1000),
  parentTrialId: optionalUuidSchema.optional(),
  rating: z.coerce
    .number("総合評価を選択してください。")
    .int("総合評価を選択してください。")
    .min(1, "総合評価を選択してください。")
    .max(5, "総合評価を選択してください。"),
  researchLineId: z.string().uuid("研究ラインを選択してください。"),
  strainer: optionalTrimmedText(80).optional(),
  title: requiredTrimmedText("試行名を入力してください。", 80),
});

const listOptionsSchema = z.object({
  limit: z.number().int().min(1).max(50).optional(),
  researchLineId: z.string().uuid("研究ラインを確認してください。").optional(),
});

function dateOnlyToJstStartIso(value: string): string | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);

  if (!match) {
    return null;
  }

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const utcDate = new Date(Date.UTC(year, month - 1, day));

  if (
    utcDate.getUTCFullYear() !== year ||
    utcDate.getUTCMonth() !== month - 1 ||
    utcDate.getUTCDate() !== day
  ) {
    return null;
  }

  return new Date(Date.UTC(year, month - 1, day, -9, 0, 0)).toISOString();
}

export function toJstDateInputValue(value: string): string {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  const parts = new Intl.DateTimeFormat("ja-JP", {
    day: "2-digit",
    month: "2-digit",
    timeZone: "Asia/Tokyo",
    year: "numeric",
  }).formatToParts(date);
  const lookup = new Map(parts.map((part) => [part.type, part.value]));

  return `${lookup.get("year")}-${lookup.get("month")}-${lookup.get("day")}`;
}

export function formatJstCalendarDate(value: string): string {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "日付を確認できません";
  }

  return new Intl.DateTimeFormat("ja-JP", {
    day: "numeric",
    month: "long",
    timeZone: "Asia/Tokyo",
    year: "numeric",
  }).format(date);
}

function validationErrorFromZod(error: z.ZodError): AppError {
  const fieldErrors: Record<string, string> = {};

  for (const issue of error.issues) {
    const field = issue.path.join(".") || "form";

    if (!fieldErrors[field]) {
      fieldErrors[field] = issue.message;
    }
  }

  return appError("VALIDATION_ERROR", "入力内容を確認してください。", {
    fieldErrors: Object.keys(fieldErrors).length > 0 ? fieldErrors : undefined,
    retryable: false,
    cause: error,
  });
}

function isStructuredSupabaseError(
  cause: unknown,
): cause is StructuredSupabaseError {
  return Boolean(cause) && typeof cause === "object";
}

function mapTrialError(cause: unknown): AppError {
  if (cause instanceof TypeError) {
    return appError(
      "NETWORK_ERROR",
      "通信に失敗しました。接続を確認して再試行してください。",
      {
        retryable: true,
        cause,
      },
    );
  }

  if (isStructuredSupabaseError(cause)) {
    switch (cause.hint) {
      case "CHAI_TRIAL_AUTH_REQUIRED":
        return appError(
          "AUTH_REQUIRED",
          "ログインが必要です。メール認証を行ってください。",
          {
            retryable: true,
            cause,
          },
        );
      case "CHAI_TRIAL_FORBIDDEN":
        return appError(
          "FORBIDDEN",
          "対象のデータを表示または変更できません。",
          {
            retryable: false,
            cause,
          },
        );
      case "CHAI_TRIAL_NOT_FOUND":
        return appError(
          "NOT_FOUND",
          "対象のデータが見つからないか、表示できません。",
          {
            retryable: false,
            cause,
          },
        );
      case "CHAI_TRIAL_VALIDATION":
        return appError("VALIDATION_ERROR", "入力内容を確認してください。", {
          retryable: false,
          cause,
        });
      case "CHAI_TRIAL_CONFLICT":
        return appError(
          "CONFLICT",
          "データの状態が変わっています。再読み込みして確認してください。",
          {
            retryable: false,
            cause,
          },
        );
    }

    switch (cause.code) {
      case "23503":
      case "PGRST116":
        return appError(
          "NOT_FOUND",
          "対象のデータが見つからないか、表示できません。",
          {
            retryable: false,
            cause,
          },
        );
      case "23514":
      case "22P02":
        return appError("VALIDATION_ERROR", "入力内容を確認してください。", {
          retryable: false,
          cause,
        });
      case "42501":
        return appError(
          "FORBIDDEN",
          "対象のデータを表示または変更できません。",
          {
            retryable: false,
            cause,
          },
        );
      default:
        return appError(
          "SERVER_ERROR",
          "試行の処理に失敗しました。入力内容は保持されています。",
          {
            retryable: true,
            cause,
          },
        );
    }
  }

  return unknownAppError(cause);
}

function mapTrialSummary(row: TrialRow): TrialSummary {
  return {
    brewedAt: row.brewed_at,
    brewedAtDate: toJstDateInputValue(row.brewed_at),
    createdAt: row.created_at,
    id: row.id,
    nextIdea: row.next_idea,
    note: row.note,
    parentTrialId: row.parent_trial_id,
    rating: row.rating,
    researchLineId: row.research_line_id,
    title: row.title,
    updatedAt: row.updated_at,
  };
}

function mapIngredient(row: TrialIngredientRow): TrialIngredient {
  return {
    amount: row.amount,
    category: row.category,
    displayOrder: row.display_order,
    id: row.id,
    name: row.name,
    timing: row.timing,
    trialId: row.trial_id,
    unit: row.unit,
  };
}

function mapTrialDetail(
  row: TrialRow,
  ingredients: TrialIngredientRow[],
  researchLine: ResearchLineSummaryRow,
  parentTrial: ParentTrialRow | null,
): TrialDetail {
  return {
    ...mapTrialSummary(row),
    boilCount: row.boil_count,
    brewingTimeMinutes: row.brewing_time_minutes,
    ingredients: ingredients.map(mapIngredient),
    parentTrial,
    researchLine: {
      archivedAt: researchLine.archived_at,
      id: researchLine.id,
      title: researchLine.title,
    },
    strainer: row.strainer,
  };
}

async function requireAuthenticatedContext(
  deps: TrialsDeps,
): Promise<AppResult<{ client: SupabaseClient; session: CurrentSession }>> {
  const session = await deps.getCurrentSession();

  if (!session.ok) {
    return err(session.error);
  }

  if (!session.data) {
    return err(
      appError(
        "AUTH_REQUIRED",
        "ログインが必要です。メール認証を行ってください。",
        {
          retryable: true,
        },
      ),
    );
  }

  const client = deps.getSupabaseBrowserClient();

  if (!client.ok) {
    return err(client.error);
  }

  return ok({
    client: client.data,
    session: session.data,
  });
}

export function createTrialsDataAccess(overrides: Partial<TrialsDeps> = {}) {
  const deps: TrialsDeps = {
    ...defaultTrialsDeps,
    ...overrides,
  };

  const listTrials = async (
    options: TrialListOptions = {},
  ): Promise<AppResult<TrialSummary[]>> => {
    const parsed = listOptionsSchema.safeParse(options);

    if (!parsed.success) {
      return err(validationErrorFromZod(parsed.error));
    }

    const context = await requireAuthenticatedContext(deps);

    if (!context.ok) {
      return err(context.error);
    }

    try {
      let query = context.data.client
        .from("trials")
        .select(TRIAL_COLUMNS)
        .is("deleted_at", null);

      if (parsed.data.researchLineId) {
        query = query.eq("research_line_id", parsed.data.researchLineId);
      }

      const { data, error } = await query
        .order("brewed_at", { ascending: false })
        .order("created_at", { ascending: false })
        .limit(parsed.data.limit ?? 50);

      if (error) {
        return err(mapTrialError(error));
      }

      return ok((data ?? []).map((row) => mapTrialSummary(row as TrialRow)));
    } catch (cause) {
      return err(unknownAppError(cause));
    }
  };

  return {
    listTrials,

    async listTrialsByResearchLine(
      researchLineId: string,
    ): Promise<AppResult<TrialSummary[]>> {
      return listTrials({ researchLineId });
    },

    async getTrialById(id: string): Promise<AppResult<TrialDetail>> {
      const parsed = uuidSchema.safeParse(id);

      if (!parsed.success) {
        return err(validationErrorFromZod(parsed.error));
      }

      const context = await requireAuthenticatedContext(deps);

      if (!context.ok) {
        return err(context.error);
      }

      try {
        const { data: trial, error: trialError } = await context.data.client
          .from("trials")
          .select(TRIAL_COLUMNS)
          .eq("id", parsed.data)
          .is("deleted_at", null)
          .single();

        if (trialError) {
          return err(mapTrialError(trialError));
        }

        const trialRow = trial as TrialRow;

        const { data: ingredients, error: ingredientsError } =
          await context.data.client
            .from("trial_ingredients")
            .select(INGREDIENT_COLUMNS)
            .eq("trial_id", trialRow.id)
            .order("display_order", { ascending: true });

        if (ingredientsError) {
          return err(mapTrialError(ingredientsError));
        }

        const { data: researchLine, error: researchLineError } =
          await context.data.client
            .from("research_lines")
            .select(RESEARCH_LINE_SUMMARY_COLUMNS)
            .eq("id", trialRow.research_line_id)
            .single();

        if (researchLineError) {
          return err(mapTrialError(researchLineError));
        }

        let parentTrial: ParentTrialRow | null = null;

        if (trialRow.parent_trial_id) {
          const { data: parent, error: parentError } = await context.data.client
            .from("trials")
            .select("id, title")
            .eq("id", trialRow.parent_trial_id)
            .is("deleted_at", null)
            .maybeSingle();

          if (parentError && parentError.code !== "PGRST116") {
            return err(mapTrialError(parentError));
          }

          parentTrial = parent ? (parent as ParentTrialRow) : null;
        }

        return ok(
          mapTrialDetail(
            trialRow,
            (ingredients ?? []) as TrialIngredientRow[],
            researchLine as ResearchLineSummaryRow,
            parentTrial,
          ),
        );
      } catch (cause) {
        return err(unknownAppError(cause));
      }
    },

    async listTrialStatsByResearchLineIds(
      researchLineIds: string[],
    ): Promise<AppResult<TrialStatsByResearchLine>> {
      const parsed = uuidArraySchema.safeParse(researchLineIds);

      if (!parsed.success) {
        return err(validationErrorFromZod(parsed.error));
      }

      if (parsed.data.length === 0) {
        return ok({});
      }

      const context = await requireAuthenticatedContext(deps);

      if (!context.ok) {
        return err(context.error);
      }

      try {
        const { data, error } = await context.data.client
          .from("trials")
          .select(TRIAL_STATS_COLUMNS)
          .in("research_line_id", parsed.data)
          .is("deleted_at", null);

        if (error) {
          return err(mapTrialError(error));
        }

        const stats: TrialStatsByResearchLine = {};

        for (const id of parsed.data) {
          stats[id] = {
            lastBrewedAt: null,
            lastBrewedAtDate: null,
            trialCount: 0,
          };
        }

        for (const row of (data ?? []) as Array<{
          brewed_at: string;
          research_line_id: string;
        }>) {
          const current = stats[row.research_line_id];

          if (!current) {
            continue;
          }

          current.trialCount += 1;

          if (
            !current.lastBrewedAt ||
            new Date(row.brewed_at).getTime() >
              new Date(current.lastBrewedAt).getTime()
          ) {
            current.lastBrewedAt = row.brewed_at;
            current.lastBrewedAtDate = toJstDateInputValue(row.brewed_at);
          }
        }

        return ok(stats);
      } catch (cause) {
        return err(unknownAppError(cause));
      }
    },

    async saveTrial(input: SaveTrialInput): Promise<AppResult<{ id: string }>> {
      const parsed = saveTrialInputSchema.safeParse(input);

      if (!parsed.success) {
        return err(validationErrorFromZod(parsed.error));
      }

      const brewedAt = dateOnlyToJstStartIso(parsed.data.brewedAtDate);

      if (!brewedAt) {
        return err(
          appError("VALIDATION_ERROR", "入力内容を確認してください。", {
            fieldErrors: {
              brewedAtDate: "日付を確認してください。",
            },
            retryable: false,
          }),
        );
      }

      const context = await requireAuthenticatedContext(deps);

      if (!context.ok) {
        return err(context.error);
      }

      const payload = {
        id: parsed.data.id,
        research_line_id: parsed.data.researchLineId,
        parent_trial_id: parsed.data.parentTrialId,
        title: parsed.data.title,
        brewed_at: brewedAt,
        rating: parsed.data.rating,
        brewing_time_minutes: parsed.data.brewingTimeMinutes ?? null,
        boil_count: parsed.data.boilCount ?? null,
        strainer: parsed.data.strainer ?? null,
        note: parsed.data.note,
        next_idea: parsed.data.nextIdea,
        ingredients: parsed.data.ingredients.map((ingredient, index) => ({
          amount: ingredient.amount ?? null,
          category: ingredient.category,
          display_order: ingredient.displayOrder ?? index,
          name: ingredient.name,
          timing: ingredient.timing ?? null,
          unit: ingredient.unit ?? null,
        })),
      };

      try {
        const { data, error } = await context.data.client.rpc(
          "save_trial_with_ingredients",
          {
            input: payload,
          },
        );

        if (error) {
          return err(mapTrialError(error));
        }

        if (typeof data !== "string") {
          return err(
            appError(
              "SERVER_ERROR",
              "試行の処理に失敗しました。入力内容は保持されています。",
              {
                retryable: true,
              },
            ),
          );
        }

        return ok({ id: data });
      } catch (cause) {
        return err(unknownAppError(cause));
      }
    },

    async archiveTrial(id: string): Promise<AppResult<{ id: string }>> {
      const parsed = uuidSchema.safeParse(id);

      if (!parsed.success) {
        return err(validationErrorFromZod(parsed.error));
      }

      const context = await requireAuthenticatedContext(deps);

      if (!context.ok) {
        return err(context.error);
      }

      try {
        const { data, error } = await context.data.client.rpc(
          "soft_delete_trial",
          {
            trial_id: parsed.data,
          },
        );

        if (error) {
          return err(mapTrialError(error));
        }

        return ok({ id: typeof data === "string" ? data : parsed.data });
      } catch (cause) {
        return err(unknownAppError(cause));
      }
    },
  };
}

const defaultTrialsDataAccess = createTrialsDataAccess();

export const listTrials = defaultTrialsDataAccess.listTrials;
export const listTrialsByResearchLine =
  defaultTrialsDataAccess.listTrialsByResearchLine;
export const getTrialById = defaultTrialsDataAccess.getTrialById;
export const saveTrial = defaultTrialsDataAccess.saveTrial;
export const archiveTrial = defaultTrialsDataAccess.archiveTrial;
export const listTrialStatsByResearchLineIds =
  defaultTrialsDataAccess.listTrialStatsByResearchLineIds;
