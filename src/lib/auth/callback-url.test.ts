import { describe, expect, it } from "vitest";

import { readCallbackUrlState } from "@/lib/auth/callback-url";
import { getSafeRedirectPath } from "@/lib/routes";

describe("getSafeRedirectPath", () => {
  it("allows fixed internal routes with query strings", () => {
    expect(getSafeRedirectPath("/trials/detail/?id=abc")).toBe(
      "/trials/detail/?id=abc",
    );
  });

  it("rejects external URLs", () => {
    expect(getSafeRedirectPath("https://example.com/home/")).toBe("/home/");
  });

  it("rejects protocol-relative URLs", () => {
    expect(getSafeRedirectPath("//example.com/home/")).toBe("/home/");
  });

  it("rejects auth callback as a next destination", () => {
    expect(getSafeRedirectPath("/auth/callback/?code=test")).toBe("/home/");
  });
});

describe("readCallbackUrlState", () => {
  it("reads PKCE code callbacks without exposing token-like values", () => {
    const state = readCallbackUrlState(
      new URL("https://app.local/auth/callback/?code=abc&next=/settings/"),
    );

    expect(state).toEqual({
      status: "code",
      code: "abc",
      redirectTo: "/settings/",
    });
  });

  it("reads fragment token callbacks", () => {
    const state = readCallbackUrlState(
      new URL(
        "https://app.local/auth/callback/#access_token=access&refresh_token=refresh&next=/home/",
      ),
    );

    expect(state).toEqual({
      status: "tokens",
      accessToken: "access",
      refreshToken: "refresh",
      redirectTo: "/home/",
    });
  });

  it("normalizes callback errors to a safe AppError", () => {
    const state = readCallbackUrlState(
      new URL(
        "https://app.local/auth/callback/?error=access_denied&error_description=secret",
      ),
    );

    expect(state.status).toBe("error");
    if (state.status === "error") {
      expect(state.error.code).toBe("AUTH_REQUIRED");
      expect(state.error.message).not.toContain("secret");
    }
  });
});
