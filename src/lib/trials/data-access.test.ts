import type { SupabaseClient } from "@supabase/supabase-js";
import { describe, expect, it, vi } from "vitest";

import { ok, type AppResult } from "@/lib/app-result";
import type { CurrentSession } from "@/lib/auth/data-access";
import { createTrialsDataAccess } from "@/lib/trials/data-access";
import * as trialsDataAccessModule from "@/lib/trials/data-access";

const session: CurrentSession = {
  email: "owner@example.com",
  userId: "11111111-1111-1111-1111-111111111111",
};

const trialId = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1";
const researchLineId = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb1";

type QueryResponse<T> = {
  data: T;
  error: unknown | null;
};

function createTrialRow(
  overrides: Partial<{
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
  }> = {},
) {
  return {
    boil_count: null,
    brewed_at: "2026-04-21T15:00:00.000Z",
    brewing_time_minutes: null,
    created_at: "2026-04-21T16:00:00.000Z",
    id: trialId,
    next_idea: "生姜を少し増やす",
    note: "香りがよい",
    parent_trial_id: null,
    rating: 4,
    research_line_id: researchLineId,
    strainer: null,
    title: "朝の試行",
    updated_at: "2026-04-21T16:00:00.000Z",
    ...overrides,
  };
}

function createQueryBuilder<T>(response: QueryResponse<T>) {
  const promise = Promise.resolve(response);
  const builder = {} as {
    eq: ReturnType<typeof vi.fn>;
    in: ReturnType<typeof vi.fn>;
    is: ReturnType<typeof vi.fn>;
    limit: ReturnType<typeof vi.fn>;
    maybeSingle: ReturnType<typeof vi.fn>;
    order: ReturnType<typeof vi.fn>;
    select: ReturnType<typeof vi.fn>;
    single: ReturnType<typeof vi.fn>;
    then: Promise<QueryResponse<T>>["then"];
    catch: Promise<QueryResponse<T>>["catch"];
    finally: Promise<QueryResponse<T>>["finally"];
  };

  builder.eq = vi.fn(() => builder);
  builder.in = vi.fn(() => builder);
  builder.is = vi.fn(() => builder);
  builder.limit = vi.fn(() => builder);
  builder.maybeSingle = vi.fn(() => promise);
  builder.order = vi.fn(() => builder);
  builder.select = vi.fn(() => builder);
  builder.single = vi.fn(() => promise);
  builder.then = promise.then.bind(promise);
  builder.catch = promise.catch.bind(promise);
  builder.finally = promise.finally.bind(promise);

  return builder;
}

function createClient(options: {
  builders?: ReturnType<typeof createQueryBuilder>[];
  rpcResponse?: QueryResponse<unknown>;
}) {
  const builders = [...(options.builders ?? [])];

  return {
    from: vi.fn().mockImplementation(() => builders.shift()),
    rpc: vi
      .fn()
      .mockResolvedValue(options.rpcResponse ?? { data: trialId, error: null }),
  } as unknown as SupabaseClient;
}

function createApi(
  options: {
    client?: SupabaseClient;
    sessionResult?: AppResult<CurrentSession | null>;
  } = {},
) {
  const client =
    options.client ??
    createClient({
      builders: [createQueryBuilder({ data: [], error: null })],
    });

  return createTrialsDataAccess({
    getCurrentSession: vi
      .fn()
      .mockResolvedValue(options.sessionResult ?? ok(session)),
    getSupabaseBrowserClient: vi.fn(() => ok(client)),
  });
}

describe("trials data access", () => {
  it("lists active trials with explicit deleted_at filtering and deterministic order", async () => {
    const builder = createQueryBuilder({
      data: [createTrialRow()],
      error: null,
    });
    const client = createClient({ builders: [builder] });
    const api = createApi({ client });

    const result = await api.listTrials({ limit: 25, researchLineId });

    expect(result.ok).toBe(true);
    expect(builder.is).toHaveBeenCalledWith("deleted_at", null);
    expect(builder.eq).toHaveBeenCalledWith("research_line_id", researchLineId);
    expect(builder.order).toHaveBeenNthCalledWith(1, "brewed_at", {
      ascending: false,
    });
    expect(builder.order).toHaveBeenNthCalledWith(2, "created_at", {
      ascending: false,
    });
    expect(builder.limit).toHaveBeenCalledWith(25);
  });

  it("converts date-only input to JST midnight before calling the save RPC", async () => {
    const client = createClient({
      rpcResponse: { data: trialId, error: null },
    });
    const api = createApi({ client });

    const result = await api.saveTrial({
      brewedAtDate: "2026-04-22",
      ingredients: [
        {
          amount: "8",
          category: "tea",
          name: "アッサム",
          unit: "g",
        },
      ],
      nextIdea: "ミルクを少し増やす",
      note: "香りは良い",
      rating: "4",
      researchLineId,
      title: "朝の試行",
    });

    expect(result).toEqual({ ok: true, data: { id: trialId } });
    expect(client.rpc).toHaveBeenCalledWith("save_trial_with_ingredients", {
      input: expect.objectContaining({
        brewed_at: "2026-04-21T15:00:00.000Z",
        research_line_id: researchLineId,
        title: "朝の試行",
      }),
    });
    expect(client.from).not.toHaveBeenCalled();
  });

  it("maps stable RPC hints to AppError without relying on message text", async () => {
    const client = createClient({
      rpcResponse: {
        data: null,
        error: {
          hint: "CHAI_TRIAL_CONFLICT",
          message: "internal message must not be shown",
        },
      },
    });
    const api = createApi({ client });

    const result = await api.archiveTrial(trialId);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("CONFLICT");
      expect(result.error.message).toBe(
        "データの状態が変わっています。再読み込みして確認してください。",
      );
    }
  });

  it("clones a trial through clone_trial RPC without direct table writes", async () => {
    const clonedTrialId = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa2";
    const client = createClient({
      rpcResponse: { data: clonedTrialId, error: null },
    });
    const api = createApi({ client });

    const result = await api.cloneTrial(trialId);

    expect(result).toEqual({ ok: true, data: { id: clonedTrialId } });
    expect(client.rpc).toHaveBeenCalledWith("clone_trial", {
      source_trial_id: trialId,
    });
    expect(client.from).not.toHaveBeenCalled();
  });

  it("maps clone_trial hidden source failures to not found", async () => {
    const client = createClient({
      rpcResponse: {
        data: null,
        error: {
          hint: "CHAI_TRIAL_NOT_FOUND",
          message: "internal message must not be shown",
        },
      },
    });
    const api = createApi({ client });

    const result = await api.cloneTrial(trialId);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("NOT_FOUND");
      expect(result.error.message).toBe(
        "対象のデータが見つからないか、表示できません。",
      );
    }
  });

  it("summarizes trial counts and last brewed date for research line cards", async () => {
    const builder = createQueryBuilder({
      data: [
        {
          brewed_at: "2026-04-20T15:00:00.000Z",
          research_line_id: researchLineId,
        },
        {
          brewed_at: "2026-04-22T15:00:00.000Z",
          research_line_id: researchLineId,
        },
      ],
      error: null,
    });
    const client = createClient({ builders: [builder] });
    const api = createApi({ client });

    const result = await api.listTrialStatsByResearchLineIds([researchLineId]);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data[researchLineId]).toEqual({
        lastBrewedAt: "2026-04-22T15:00:00.000Z",
        lastBrewedAtDate: "2026-04-23",
        trialCount: 2,
      });
    }
    expect(builder.in).toHaveBeenCalledWith("research_line_id", [
      researchLineId,
    ]);
    expect(builder.is).toHaveBeenCalledWith("deleted_at", null);
  });

  it("does not expose direct table write or physical delete APIs for trials", () => {
    expect(trialsDataAccessModule).not.toHaveProperty("deleteTrial");
    expect(trialsDataAccessModule).not.toHaveProperty("updateTrial");
    expect(trialsDataAccessModule).not.toHaveProperty("insertTrial");
  });
});
