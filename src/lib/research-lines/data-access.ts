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

const RESEARCH_LINE_COLUMNS =
  "id, title, description, created_at, updated_at, archived_at";

const titleSchema = z
  .string()
  .transform((value) => value.trim())
  .pipe(
    z
      .string()
      .min(1, "研究ライン名を入力してください。")
      .max(80, "研究ライン名は80文字以内で入力してください。"),
  );

const descriptionSchema = z
  .union([
    z.string().max(500, "説明は500文字以内で入力してください。"),
    z.null(),
    z.undefined(),
  ])
  .transform((value) => value ?? null);

const researchLineIdSchema = z.object({
  id: z.string().uuid("対象の研究ラインを確認してください。"),
});

const createResearchLineInputSchema = z.object({
  title: titleSchema,
  description: descriptionSchema,
});

const updateResearchLineInputSchema = researchLineIdSchema.extend({
  title: titleSchema,
  description: descriptionSchema,
});

type ResearchLineRow = {
  id: string;
  title: string;
  description: string | null;
  created_at: string;
  updated_at: string;
  archived_at: string | null;
};

type StructuredSupabaseError = {
  code?: string;
  message?: string;
  details?: string;
  hint?: string;
};

type ResearchLinesDeps = {
  getCurrentSession: () => Promise<AppResult<CurrentSession | null>>;
  getSupabaseBrowserClient: () => AppResult<SupabaseClient>;
  now: () => string;
};

const defaultResearchLinesDeps: ResearchLinesDeps = {
  getCurrentSession,
  getSupabaseBrowserClient,
  now: () => new Date().toISOString(),
};

export type ResearchLine = {
  id: string;
  title: string;
  description: string | null;
  createdAt: string;
  updatedAt: string;
  archivedAt: string | null;
};

export type CreateResearchLineInput = {
  title: string;
  description?: string | null;
};

export type UpdateResearchLineInput = CreateResearchLineInput & {
  id: string;
};

export type ResearchLineListOptions = {
  includeArchived?: boolean;
};

function validationErrorFromZod(error: z.ZodError): AppError {
  const flattened = error.flatten()
    .fieldErrors as Record<string, string[] | undefined>;
  const fieldErrors: Record<string, string> = {};

  for (const [field, messages] of Object.entries(flattened)) {
    const message = messages?.[0];

    if (message) {
      fieldErrors[field] = message;
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

function mapResearchLineError(cause: unknown): AppError {
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
    switch (cause.code) {
      case "23505":
        return appError("CONFLICT", "同じ名前の研究ラインが既にあります。", {
          fieldErrors: {
            title: "同じ名前の研究ラインが既にあります。",
          },
          retryable: false,
          cause,
        });
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
      case "PGRST116":
        return appError(
          "NOT_FOUND",
          "対象のデータが見つからないか、表示できません。",
          {
            retryable: false,
            cause,
          },
        );
      default:
        return appError(
          "SERVER_ERROR",
          "研究ラインの処理に失敗しました。時間をおいて再試行してください。",
          {
            retryable: true,
            cause,
          },
        );
    }
  }

  return unknownAppError(cause);
}

function mapResearchLineRow(row: ResearchLineRow): ResearchLine {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    archivedAt: row.archived_at,
  };
}

async function requireAuthenticatedContext(
  deps: ResearchLinesDeps,
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

export function createResearchLinesDataAccess(
  overrides: Partial<ResearchLinesDeps> = {},
) {
  const deps: ResearchLinesDeps = {
    ...defaultResearchLinesDeps,
    ...overrides,
  };

  const listResearchLines = async (
    options: ResearchLineListOptions = {},
  ): Promise<AppResult<ResearchLine[]>> => {
    const context = await requireAuthenticatedContext(deps);

    if (!context.ok) {
      return err(context.error);
    }

    try {
      let query = context.data.client
        .from("research_lines")
        .select(RESEARCH_LINE_COLUMNS);

      if (!options.includeArchived) {
        query = query.is("archived_at", null);
      }

      const { data, error } = await query
        .order("updated_at", { ascending: false })
        .order("created_at", { ascending: false });

      if (error) {
        return err(mapResearchLineError(error));
      }

      return ok((data ?? []).map(mapResearchLineRow));
    } catch (cause) {
      return err(unknownAppError(cause));
    }
  };

  return {
    listResearchLines,

    async listActiveResearchLines(): Promise<AppResult<ResearchLine[]>> {
      return listResearchLines({ includeArchived: false });
    },

    async getResearchLineById(id: string): Promise<AppResult<ResearchLine>> {
      const parsed = researchLineIdSchema.safeParse({ id });

      if (!parsed.success) {
        return err(validationErrorFromZod(parsed.error));
      }

      const context = await requireAuthenticatedContext(deps);

      if (!context.ok) {
        return err(context.error);
      }

      try {
        const { data, error } = await context.data.client
          .from("research_lines")
          .select(RESEARCH_LINE_COLUMNS)
          .eq("id", parsed.data.id)
          .single();

        if (error) {
          return err(mapResearchLineError(error));
        }

        return ok(mapResearchLineRow(data));
      } catch (cause) {
        return err(unknownAppError(cause));
      }
    },

    async createResearchLine(
      input: CreateResearchLineInput,
    ): Promise<AppResult<ResearchLine>> {
      const parsed = createResearchLineInputSchema.safeParse(input);

      if (!parsed.success) {
        return err(validationErrorFromZod(parsed.error));
      }

      const context = await requireAuthenticatedContext(deps);

      if (!context.ok) {
        return err(context.error);
      }

      try {
        const { data, error } = await context.data.client
          .from("research_lines")
          .insert({
            user_id: context.data.session.userId,
            title: parsed.data.title,
            description: parsed.data.description,
          })
          .select(RESEARCH_LINE_COLUMNS)
          .single();

        if (error) {
          return err(mapResearchLineError(error));
        }

        return ok(mapResearchLineRow(data));
      } catch (cause) {
        return err(unknownAppError(cause));
      }
    },

    async updateResearchLine(
      input: UpdateResearchLineInput,
    ): Promise<AppResult<ResearchLine>> {
      const parsed = updateResearchLineInputSchema.safeParse(input);

      if (!parsed.success) {
        return err(validationErrorFromZod(parsed.error));
      }

      const context = await requireAuthenticatedContext(deps);

      if (!context.ok) {
        return err(context.error);
      }

      try {
        const { data, error } = await context.data.client
          .from("research_lines")
          .update({
            title: parsed.data.title,
            description: parsed.data.description,
            updated_at: deps.now(),
          })
          .eq("id", parsed.data.id)
          .select(RESEARCH_LINE_COLUMNS)
          .single();

        if (error) {
          return err(mapResearchLineError(error));
        }

        return ok(mapResearchLineRow(data));
      } catch (cause) {
        return err(unknownAppError(cause));
      }
    },

    async archiveResearchLine(id: string): Promise<AppResult<ResearchLine>> {
      const parsed = researchLineIdSchema.safeParse({ id });

      if (!parsed.success) {
        return err(validationErrorFromZod(parsed.error));
      }

      const context = await requireAuthenticatedContext(deps);

      if (!context.ok) {
        return err(context.error);
      }

      const archivedAt = deps.now();

      try {
        const { data, error } = await context.data.client
          .from("research_lines")
          .update({
            archived_at: archivedAt,
            updated_at: archivedAt,
          })
          .eq("id", parsed.data.id)
          .select(RESEARCH_LINE_COLUMNS)
          .single();

        if (error) {
          return err(mapResearchLineError(error));
        }

        return ok(mapResearchLineRow(data));
      } catch (cause) {
        return err(unknownAppError(cause));
      }
    },
  };
}

const defaultResearchLinesDataAccess = createResearchLinesDataAccess();

export const listResearchLines =
  defaultResearchLinesDataAccess.listResearchLines;
export const listActiveResearchLines =
  defaultResearchLinesDataAccess.listActiveResearchLines;
export const getResearchLineById =
  defaultResearchLinesDataAccess.getResearchLineById;
export const createResearchLine =
  defaultResearchLinesDataAccess.createResearchLine;
export const updateResearchLine =
  defaultResearchLinesDataAccess.updateResearchLine;
export const archiveResearchLine =
  defaultResearchLinesDataAccess.archiveResearchLine;
