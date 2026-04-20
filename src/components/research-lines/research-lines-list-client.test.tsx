import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { appError, ok } from "@/lib/app-result";
import {
  archiveResearchLine,
  createResearchLine,
  listActiveResearchLines,
  type ResearchLine,
} from "@/lib/research-lines/data-access";

import { ResearchLinesListClient } from "./research-lines-list-client";

vi.mock("@/components/auth/auth-gate", () => ({
  AuthGate: ({ children }: { children: ReactNode }) => <>{children}</>,
}));

vi.mock("@/lib/research-lines/data-access", () => ({
  archiveResearchLine: vi.fn(),
  createResearchLine: vi.fn(),
  listActiveResearchLines: vi.fn(),
}));

const activeLine: ResearchLine = {
  archivedAt: null,
  createdAt: "2026-04-20T01:00:00.000Z",
  description: "朝の濃さを少しずつ見る",
  id: "11111111-1111-4111-8111-111111111111",
  title: "朝用",
  updatedAt: "2026-04-21T01:00:00.000Z",
};

function mockActiveList(lines: ResearchLine[] = [activeLine]) {
  vi.mocked(listActiveResearchLines).mockResolvedValue(ok(lines));
}

describe("ResearchLinesListClient", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockActiveList();
    vi.mocked(createResearchLine).mockResolvedValue(ok(activeLine));
    vi.mocked(archiveResearchLine).mockResolvedValue(ok(activeLine));
  });

  it("renders the active list with edit and archive paths", async () => {
    render(<ResearchLinesListClient />);

    expect(
      screen.getByText("研究ラインを読み込んでいます。"),
    ).toBeInTheDocument();

    const card = await screen.findByRole("article");

    expect(within(card).getByText("朝用")).toBeInTheDocument();
    expect(
      within(card).getByText("朝の濃さを少しずつ見る"),
    ).toBeInTheDocument();
    expect(
      within(card).getByRole("link", { name: "詳細と編集" }),
    ).toHaveAttribute("href", `/research-lines/detail?id=${activeLine.id}`);
    expect(
      within(card).getByRole("button", { name: "アーカイブ" }),
    ).toBeInTheDocument();
    expect(listActiveResearchLines).toHaveBeenCalledTimes(1);
  });

  it("separates duplicate errors from validation errors on create", async () => {
    const user = userEvent.setup();
    vi.mocked(createResearchLine).mockResolvedValue({
      ok: false,
      error: appError("CONFLICT", "同じ名前の研究ラインが既にあります。", {
        fieldErrors: {
          title: "同じ名前の研究ラインが既にあります。",
        },
      }),
    });

    render(<ResearchLinesListClient />);

    await screen.findByText("朝用");
    await user.type(screen.getByLabelText("研究ライン名"), "朝用");
    await user.click(screen.getByRole("button", { name: "研究ラインを作成" }));

    expect(
      await screen.findByText(
        "同じ名前の研究ラインがあります。別の名前にするか、一覧を確認してください。",
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByText("同じ名前の研究ラインが既にあります。"),
    ).toBeInTheDocument();
  });

  it("removes an archived line from the active list after confirmation", async () => {
    const user = userEvent.setup();

    render(<ResearchLinesListClient />);

    const card = await screen.findByRole("article");
    await user.click(within(card).getByRole("button", { name: "アーカイブ" }));
    await user.click(
      within(card).getByRole("button", { name: "アーカイブする" }),
    );

    await waitFor(() => {
      expect(screen.queryByRole("article")).not.toBeInTheDocument();
    });
    expect(
      screen.getByText("「朝用」をアーカイブしました。"),
    ).toBeInTheDocument();
    expect(archiveResearchLine).toHaveBeenCalledWith(activeLine.id);
  });
});
