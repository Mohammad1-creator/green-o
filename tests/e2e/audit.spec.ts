import { expect, test } from "@playwright/test";

import { DEMO, randomDigits, requireSupabase, signInAs } from "./helpers";

test.describe("audit trail", () => {
  test.beforeEach(() => {
    requireSupabase();
  });

  test("the general manager traces a change and checks the chain", async ({
    page,
  }) => {
    await signInAs(page, DEMO.generalManager);
    await page.goto("/admin/departments");
    const name = `قسم تدقيق ${randomDigits(6)}`;
    await page.getByLabel("اسم القسم الجديد").fill(name);
    await page.getByRole("button", { name: "إضافة" }).click();
    await expect(page.getByText("أُضيف القسم")).toBeVisible();

    // The new department is in the log, with who added it.
    await page.goto("/admin/audit?table=public.departments&action=insert");
    const entry = page
      .getByRole("list", { name: "سجلات التدقيق" })
      .getByRole("listitem")
      .filter({ hasText: name });
    await expect(entry).toContainText("إضافة في الأقسام");
    await entry.getByText(/التفاصيل/).click();
    await expect(entry.getByText(name)).toBeVisible();

    await page.getByRole("button", { name: "تحقق الآن" }).click();
    await expect(page.getByText(/السجل سليم/)).toBeVisible();

    const csv = await page.request.get(
      "/api/export/audit?table=public.departments&format=csv",
    );
    expect(csv.status()).toBe(200);
    expect((await csv.body()).toString("utf8")).toContain(name);
  });

  test("only the general manager reads the log", async ({ page }) => {
    await signInAs(page, DEMO.productionManager);
    await page.goto("/admin/audit");
    await expect(page).not.toHaveURL(/\/admin\/audit/);
    const csv = await page.request.get("/api/export/audit?format=csv");
    expect(csv.status()).toBe(403);
  });
});
