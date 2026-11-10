import { expect, test } from "@playwright/test";

import { DEMO, randomDigits, requireSupabase, signInAs } from "./helpers";

test.describe("production catalog", () => {
  test.beforeEach(() => {
    requireSupabase();
  });

  test("a new specification appears in the product form", async ({ page }) => {
    const tag = randomDigits(5);
    const specLabel = `الطول ${tag}`;
    await signInAs(page, DEMO.productionManager);

    // Define a number specification with a unit and limits.
    await page.goto("/admin/production/settings");
    const addSpec = page.locator("form").filter({
      has: page.getByRole("button", { name: "إضافة المواصفة" }),
    });
    await addSpec.getByLabel("اسم المواصفة").fill(specLabel);
    await addSpec.getByLabel("الوحدة (اختياري)").fill("سم");
    await addSpec.getByLabel("الحد الأدنى (اختياري)").fill("1");
    await addSpec.getByLabel("الحد الأعلى (اختياري)").fill("300");
    await addSpec.getByRole("button", { name: "إضافة المواصفة" }).click();
    await expect(addSpec.getByRole("status")).toContainText("أُضيفت المواصفة");
    await expect(addSpec.getByLabel("اسم المواصفة")).toHaveValue("");

    // The product form now has the field, and checks its limits.
    await page.goto("/admin/production/products");
    await page.getByLabel("رمز المنتج").fill(`E2E-${tag}`);
    await page.getByLabel("اسم المنتج").fill(`منتج تجريبي ${tag}`);
    await page.getByLabel("وحدة القياس").fill("قطعة");
    await page.getByLabel("السماكة", { exact: true }).fill("18");
    await page.getByLabel(specLabel, { exact: true }).fill("٥٠٠");
    await page.getByRole("button", { name: "إضافة المنتج" }).click();
    await expect(page.getByText("لا تزيد على 300")).toBeVisible();
    // A validation error keeps everything typed so far.
    await expect(page.getByLabel("اسم المنتج")).toHaveValue(
      `منتج تجريبي ${tag}`,
    );
    await page.getByLabel(specLabel, { exact: true }).fill("120٫5");
    await page.getByRole("button", { name: "إضافة المنتج" }).click();
    await expect(page).toHaveURL(
      /\/admin\/production\/products\/[0-9a-f-]+\?created=1/,
    );
    await expect(page.getByText("120.5 سم")).toBeVisible();

    // Its route: packing first, then cutting.
    const next = page.getByLabel("مرحلة تالية");
    await next.selectOption({ label: "قص" });
    await page.getByRole("button", { name: "إضافة للمسار" }).click();
    await next.selectOption({ label: "تغليف" });
    await page.getByRole("button", { name: "إضافة للمسار" }).click();
    await page.getByRole("button", { name: "تقديم تغليف" }).click();
    await page.getByRole("button", { name: "حفظ المسار" }).click();
    await expect(page.getByText("حُفظ مسار المنتج")).toBeVisible();
    await page.reload();
    await expect(
      page.getByRole("list", { name: "مراحل المسار" }).getByRole("listitem"),
    ).toHaveText([/تغليف/, /قص/]);
  });

  test("the maintenance manager reads products but cannot edit them", async ({
    page,
  }) => {
    await signInAs(page, DEMO.maintenanceManager);
    await page.goto("/admin/production/products");
    await expect(
      page.getByRole("link", { name: "لوح MDF أبيض 18 مم" }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "إضافة المنتج" }),
    ).toHaveCount(0);
    await page.goto("/admin/production/settings");
    await expect(page).not.toHaveURL(/production\/settings/);
  });
});
