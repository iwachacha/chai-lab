import { describe, expect, it } from "vitest";

import { validateMagicLinkEmail } from "@/lib/auth/data-access";

describe("validateMagicLinkEmail", () => {
  it("trims valid email addresses", () => {
    const result = validateMagicLinkEmail("  owner@example.com  ");

    expect(result).toEqual({ ok: true, data: "owner@example.com" });
  });

  it("returns field errors for invalid email addresses", () => {
    const result = validateMagicLinkEmail("not-email");

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("VALIDATION_ERROR");
      expect(result.error.fieldErrors?.email).toBe(
        "メールアドレスの形式を確認してください。",
      );
    }
  });
});
