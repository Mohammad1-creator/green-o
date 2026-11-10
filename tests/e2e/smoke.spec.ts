import { expect, test } from "@playwright/test";

test("home page is Arabic and right-to-left", async ({ page }) => {
  await page.goto("/");
  const html = page.locator("html");
  await expect(html).toHaveAttribute("lang", "ar");
  await expect(html).toHaveAttribute("dir", "rtl");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "نظام إدارة المصنع",
  );
});

test("Arabic font is applied", async ({ page }) => {
  await page.goto("/");
  const fontFamily = await page
    .locator("body")
    .evaluate((element) => getComputedStyle(element).fontFamily);
  expect(fontFamily).toContain("IBM Plex Sans Arabic");
});

test("non-production environments show the warning banner", async ({
  page,
}) => {
  await page.goto("/");
  await expect(
    page.getByRole("status").filter({ hasText: "البيانات هنا تجريبية" }),
  ).toBeVisible();
});

test("health page reports the environment and database status", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("link", { name: "فحص حالة النظام" }).click();
  await expect(page).toHaveURL(/\/health$/);
  await expect(page.getByTestId("app-env")).toHaveText("بيئة محلية");
  await expect(page.getByTestId("db-status")).toHaveText(
    /غير مضبوطة بعد|متصلة|تعذّر الاتصال/,
  );
});
