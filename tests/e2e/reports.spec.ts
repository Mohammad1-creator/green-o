import { expect, test } from "@playwright/test";

import { DEMO, requireSupabase, signInAs } from "./helpers";

test.describe("reports", () => {
  test.beforeEach(() => {
    requireSupabase();
  });

  test("the general manager sees every section and exports files", async ({
    page,
  }) => {
    await signInAs(page, DEMO.generalManager);
    await page.goto("/admin/reports");
    for (const section of ["المهام", "الصيانة", "الإنتاج"]) {
      await expect(
        page.getByRole("region", { name: section, exact: true }),
      ).toBeVisible();
    }

    // CSV: UTF-8 with a byte order mark, Arabic headers.
    const csv = await page.request.get(
      "/api/export/tasks-by-person?format=csv",
    );
    expect(csv.status()).toBe(200);
    expect(csv.headers()["content-type"]).toContain("text/csv");
    const body = await csv.body();
    expect([...body.subarray(0, 3)]).toEqual([0xef, 0xbb, 0xbf]);
    expect(body.toString("utf8")).toContain("الموظف");

    // Excel: a real workbook (a zip file).
    const xlsx = await page.request.get(
      "/api/export/production-by-stage?format=xlsx",
    );
    expect(xlsx.status()).toBe(200);
    expect(xlsx.headers()["content-type"]).toContain("spreadsheetml");
    expect((await xlsx.body()).subarray(0, 2).toString()).toBe("PK");

    // The print version has the factory's name and a print button.
    await page.goto("/print/reports");
    await expect(page.getByRole("heading", { level: 1 })).toContainText(
      "تقرير",
    );
    await expect(
      page.getByRole("button", { name: "طباعة أو حفظ PDF" }),
    ).toBeVisible();
  });

  test("each manager sees only their own area", async ({ browser }) => {
    const production = await (await browser.newContext()).newPage();
    await signInAs(production, DEMO.productionManager);
    await production.goto("/admin/reports");
    await expect(
      production.getByRole("region", { name: "الإنتاج", exact: true }),
    ).toBeVisible();
    await expect(
      production.getByRole("region", { name: "الصيانة", exact: true }),
    ).toHaveCount(0);
    const faults = await production.request.get(
      "/api/export/faults-by-machine?format=csv",
    );
    expect(faults.status()).toBe(403);

    const maintenance = await (await browser.newContext()).newPage();
    await signInAs(maintenance, DEMO.maintenanceManager);
    const stages = await maintenance.request.get(
      "/api/export/production-by-stage?format=csv",
    );
    expect(stages.status()).toBe(403);
  });
});
