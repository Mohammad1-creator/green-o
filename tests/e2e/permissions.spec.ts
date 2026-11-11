import { expect, test } from "@playwright/test";

import { DEMO, requireSupabase, signIn } from "./helpers";

test.describe("permissions", () => {
  test.beforeEach(() => {
    requireSupabase();
  });

  test("the developer gives and takes away a manager role", async ({
    browser,
  }, testInfo) => {
    // Changes a shared demo account, so it runs once, not per device.
    test.skip(testInfo.project.name === "mobile", "desktop only");
    const name = "نادية فؤاد";

    const developer = await (await browser.newContext()).newPage();
    await signIn(developer, DEMO.developer);
    await expect(developer).toHaveURL(/\/admin$/);
    await developer.getByRole("link", { name: "الصلاحيات" }).first().click();
    await expect(developer).toHaveURL(/\/admin\/permissions$/);
    // The developer's own row cannot be changed.
    await expect(
      developer.getByRole("combobox", { name: "دور المبرمج" }),
    ).toHaveCount(0);

    // Promote the quality inspector to production manager of her department.
    await developer
      .getByRole("combobox", { name: `دور ${name}` })
      .selectOption({ label: "مدير الإنتاج" });
    const row = developer.getByRole("row").filter({ hasText: name });
    await row.getByRole("button", { name: "حفظ" }).click();
    await expect(row.getByText("حُفظت الصلاحية")).toBeVisible();
    await expect(row).toContainText("مدير الإنتاج");

    // She now opens the admin panel.
    const inspector = await (await browser.newContext()).newPage();
    await signIn(inspector, DEMO.qualityInspector);
    await expect(inspector).toHaveURL(/\/admin$/);

    // Take it away again: back to the mobile app.
    await developer
      .getByRole("combobox", { name: `دور ${name}` })
      .selectOption({ label: "موظف" });
    await row.getByRole("button", { name: "حفظ" }).click();
    await expect(row.getByText("حُفظت الصلاحية")).toBeVisible();
    await inspector.goto("/admin");
    await expect(inspector).toHaveURL(/\/m/);

    // Department managers have no permissions page.
    const manager = await (await browser.newContext()).newPage();
    await signIn(manager, DEMO.maintenanceManager);
    await expect(manager).toHaveURL(/\/admin$/);
    await expect(manager.getByRole("link", { name: "الصلاحيات" })).toHaveCount(
      0,
    );
    await manager.goto("/admin/permissions");
    await expect(manager).not.toHaveURL(/\/admin\/permissions/);
  });
});
