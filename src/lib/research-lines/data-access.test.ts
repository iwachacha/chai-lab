import type { SupabaseClient } from "@supabase/supabase-js";
import { describe, expect, it, vi } from "vitest";

import { ok, type AppResult } from "@/lib/app-result";
import type { CurrentSession } from "@/lib/auth/data-access";
import {
  createResearchLinesDataAccess,
  type ResearchLine,
} from "@/lib/research-lines/data-access";
import * as researchLinesDataAccessModule from "@/lib/research-lines/data-access";

const session: CurrentSession = {
  userId: "11111111-1111-1111-1111-111111111111",
  email: "owner@example.com",
};

const fixedNow = "2026-04-21T12:34:56.000Z";
const activeResearchLineId = "11111111-1111-4111-8111-111111111111";
const reusedResearchLineId = "22222222-2222-4222-8222-222222222222";

type QueryResponse<T> = {
  data: T;
  error: unknown | null;
};

function createResearchLineRow(
  overrides: Partial<{
    id: string;
    title: string;
    description: string | null;
    created_at: string;
    updated_at: string;
    archived_at: string | null;
  }> = {},
) {
  return {
    id: activeResearchLineId,
    title: "朝用",
    description: null,
    created_at: "2026-04-21T10:00:00.000Z",
    updated_at: "2026-04-21T11:00:00.000Z",
    archived_at: null,
    ...overrides,
  };
}

function createQueryBuilder<T>(response: QueryResponse<T>) {
  const promise = Promise.resolve(response);
  const builder = {} as {
    select: ReturnType<typeof vi.fn>;
    is: ReturnType<typeof vi.fn>;
    eq: ReturnType<typeof vi.fn>;
    order: ReturnType<typeof vi.fn>;
    insert: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
    single: ReturnType<typeof vi.fn>;
    then: Promise<QueryResponse<T>>["then"];
    catch: Promise<QueryResponse<T>>["catch"];
    finally: Promise<QueryResponse<T>>["finally"];
  };

  builder.select = vi.fn(() => builder);
  builder.is = vi.fn(() => builder);
  builder.eq = vi.fn(() => builder);
  builder.order = vi.fn(() => builder);
  builder.insert = vi.fn(() => builder);
  builder.update = vi.fn(() => builder);
  builder.single = vi.fn(() => promise);
  builder.then = promise.then.bind(promise);
  builder.catch = promise.catch.bind(promise);
  builder.finally = promise.finally.bind(promise);

  return builder;
}

function createClient(...builders: ReturnType<typeof createQueryBuilder>[]) {
  return {
    from: vi.fn().mockImplementation(() => builders.shift()),
  } as unknown as SupabaseClient;
}

function createApi(
  options: {
    client?: SupabaseClient;
    now?: string;
    sessionResult?: AppResult<CurrentSession | null>;
  } = {},
) {
  const client =
    options.client ??
    createClient(createQueryBuilder({ data: [], error: null }));

  return createResearchLinesDataAccess({
    getCurrentSession: vi
      .fn()
      .mockResolvedValue(options.sessionResult ?? ok(session)),
    getSupabaseBrowserClient: vi.fn(() => ok(client)),
    now: () => options.now ?? fixedNow,
  });
}

describe("research line data access", () => {
  it("rejects blank titles after trimming", async () => {
    const builder = createQueryBuilder({
      data: createResearchLineRow(),
      error: null,
    });
    const client = createClient(builder);
    const api = createApi({ client });

    const result = await api.createResearchLine({
      title: "   ",
      description: null,
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("VALIDATION_ERROR");
      expect(result.error.fieldErrors?.title).toBe(
        "研究ライン名を入力してください。",
      );
    }
    expect(builder.insert).not.toHaveBeenCalled();
  });

  it("rejects titles longer than 80 characters", async () => {
    const api = createApi();

    const result = await api.createResearchLine({
      title: "a".repeat(81),
      description: null,
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("VALIDATION_ERROR");
      expect(result.error.fieldErrors?.title).toBe(
        "研究ライン名は80文字以内で入力してください。",
      );
    }
  });

  it("trims titles before insert so the payload matches the DB contract", async () => {
    const builder = createQueryBuilder({
      data: createResearchLineRow({ title: "朝用" }),
      error: null,
    });
    const client = createClient(builder);
    const api = createApi({ client });

    const result = await api.createResearchLine({
      title: "  朝用  ",
      description: "説明",
    });

    expect(result).toEqual({
      ok: true,
      data: {
        id: activeResearchLineId,
        title: "朝用",
        description: null,
        createdAt: "2026-04-21T10:00:00.000Z",
        updatedAt: "2026-04-21T11:00:00.000Z",
        archivedAt: null,
      } satisfies ResearchLine,
    });
    expect(builder.insert).toHaveBeenCalledWith({
      user_id: session.userId,
      title: "朝用",
      description: "説明",
    });
  });

  it("maps active duplicate errors to CONFLICT without surfacing SQL details", async () => {
    const builder = createQueryBuilder<null>({
      data: null,
      error: {
        code: "23505",
      },
    });
    const client = createClient(builder);
    const api = createApi({ client });

    const result = await api.createResearchLine({
      title: "朝用",
      description: null,
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("CONFLICT");
      expect(result.error.message).toBe("同じ名前の研究ラインが既にあります。");
      expect(result.error.fieldErrors?.title).toBe(
        "同じ名前の研究ラインが既にあります。",
      );
    }
  });

  it("allows the same trimmed title to be reused after archive", async () => {
    const archiveBuilder = createQueryBuilder({
      data: createResearchLineRow({
        archived_at: fixedNow,
        updated_at: fixedNow,
      }),
      error: null,
    });
    const createBuilder = createQueryBuilder({
      data: createResearchLineRow({
        id: reusedResearchLineId,
        title: "朝用",
        archived_at: null,
      }),
      error: null,
    });
    const client = createClient(archiveBuilder, createBuilder);
    const api = createApi({ client });

    const archiveResult = await api.archiveResearchLine(activeResearchLineId);
    const createResult = await api.createResearchLine({
      title: "  朝用  ",
      description: null,
    });

    expect(archiveResult.ok).toBe(true);
    expect(archiveBuilder.update).toHaveBeenCalledWith({
      archived_at: fixedNow,
      updated_at: fixedNow,
    });
    expect(createResult.ok).toBe(true);
    expect(createBuilder.insert).toHaveBeenCalledWith({
      user_id: session.userId,
      title: "朝用",
      description: null,
    });
  });

  it("applies archived_at is null and deterministic ordering in the default list", async () => {
    const builder = createQueryBuilder({
      data: [createResearchLineRow()],
      error: null,
    });
    const client = createClient(builder);
    const api = createApi({ client });

    const result = await api.listResearchLines();

    expect(result.ok).toBe(true);
    expect(builder.is).toHaveBeenCalledWith("archived_at", null);
    expect(builder.order).toHaveBeenNthCalledWith(1, "updated_at", {
      ascending: false,
    });
    expect(builder.order).toHaveBeenNthCalledWith(2, "created_at", {
      ascending: false,
    });
  });

  it("returns AUTH_REQUIRED before querying when there is no session", async () => {
    const builder = createQueryBuilder({ data: [], error: null });
    const client = createClient(builder);
    const api = createApi({ client, sessionResult: ok(null) });

    const result = await api.listResearchLines();

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("AUTH_REQUIRED");
    }
    expect(builder.select).not.toHaveBeenCalled();
  });

  it("maps permission failures to FORBIDDEN on owner-only updates", async () => {
    const builder = createQueryBuilder<null>({
      data: null,
      error: {
        code: "42501",
      },
    });
    const client = createClient(builder);
    const api = createApi({ client });

    const result = await api.updateResearchLine({
      id: activeResearchLineId,
      title: "  深煎り  ",
      description: null,
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("FORBIDDEN");
      expect(result.error.message).toBe(
        "対象のデータを表示または変更できません。",
      );
    }
    expect(builder.update).toHaveBeenCalledWith({
      title: "深煎り",
      description: null,
      updated_at: fixedNow,
    });
  });

  it("does not expose a physical delete API", () => {
    expect(researchLinesDataAccessModule).not.toHaveProperty(
      "deleteResearchLine",
    );
  });
});
