import { expect, test } from "@playwright/test";

test("the login page is Arabic and right-to-left", async ({ page }) => {
  await page.goto("/login");
  const html = page.locator("html");
  await expect(html).toHaveAttribute("lang", "ar");
  await expect(html).toHaveAttribute("dir", "rtl");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "تسجيل الدخول",
  );
});

test("the Arabic font is applied", async ({ page }) => {
  await page.goto("/login");
  const fontFamily = await page
    .locator("body")
    .evaluate((element) => getComputedStyle(element).fontFamily);
  expect(fontFamily).toContain("IBM Plex Sans Arabic");
});

test("non-production environments show the warning banner", async ({
  page,
}) => {
  await page.goto("/login");
  await expect(
    page.getByRole("status").filter({ hasText: "البيانات هنا تجريبية" }),
  ).toBeVisible();
});

test("the health page reports the environment and database status", async ({
  page,
}) => {
  await page.goto("/health");
  await expect(page.getByTestId("app-env")).toHaveText("بيئة محلية");
  await expect(page.getByTestId("db-status")).toHaveText(
    /غير مضبوطة بعد|متصلة|تعذّر الاتصال/,
  );
});
