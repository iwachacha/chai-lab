import { expect, test } from "@playwright/test";

test("auth page validates email input without losing the typed value", async ({
  page,
}) => {
  await page.goto("/auth/");

  const emailInput = page.getByLabel("メールアドレス");
  await emailInput.fill("not-email");
  await page.getByRole("button", { name: "認証メールを送信" }).click();

  await expect(
    page.getByText("メールアドレスの形式を確認してください。"),
  ).toBeVisible();
  await expect(emailInput).toHaveValue("not-email");
});
