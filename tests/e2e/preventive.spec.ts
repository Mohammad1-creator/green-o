import { expect, type Page, test } from "@playwright/test";

import { DEMO, randomDigits, requireSupabase, signInAs } from "./helpers";

const PLANS = "/admin/maintenance/preventive";

async function runScheduleNow(page: Page) {
  await page.goto(PLANS);
  await page.getByRole("button", { name: "تشغيل الآن" }).click();
  // The other test project may have created this plan's task a moment ago,
  // so either message is fine; what counts is the task list below.
  await expect(
    page.getByRole("status").filter({ hasText: /أُنشئت|لا توجد مواعيد/ }),
  ).toBeVisible();
}

test.describe("preventive maintenance", () => {
  test.beforeEach(() => {
    requireSupabase();
  });

  test("a daily plan creates exactly one task per day", async ({
    browser,
  }, testInfo) => {
    const mobile = testInfo.project.name === "mobile";
    const technician = mobile
      ? { employeeNo: DEMO.maintenanceTech2, name: "يوسف كريم" }
      : { employeeNo: DEMO.maintenanceTech, name: "عمر حسن" };
    const title = `فحص دوري ${randomDigits(5)}`;

    const manager = await (await browser.newContext()).newPage();
    await signInAs(manager, DEMO.maintenanceManager);
    await manager.goto(PLANS);
    await manager
      .getByLabel("الآلة", { exact: true })
      .selectOption({ index: 1 });
    await manager.getByLabel("عنوان الخطة").fill(title);
    await manager.getByLabel("التكرار كل").fill("1");
    await manager.getByLabel("الوحدة").selectOption("day");
    await manager
      .getByLabel("الموظف", { exact: true })
      .selectOption({ label: technician.name });
    await manager.getByRole("button", { name: "إضافة الخطة" }).click();
    await expect(manager).toHaveURL(
      /\/admin\/maintenance\/preventive\/[0-9a-f-]+\?created=1/,
    );
    const planUrl = new URL(manager.url()).pathname;
    await expect(manager.getByText("أُضيفت الخطة")).toBeVisible();

    // The first date is today, so running the schedule creates its task;
    // running it again must not create a second one.
    const createdTasks = manager
      .getByRole("list", { name: "المهام المنشأة" })
      .getByRole("listitem");
    for (let run = 0; run < 2; run += 1) {
      await runScheduleNow(manager);
      await manager.goto(planUrl);
      await expect(createdTasks).toHaveCount(1);
    }

    // The technician finds it in their tasks.
    const tech = await (await browser.newContext()).newPage();
    await signInAs(tech, technician.employeeNo);
    await tech.goto("/m");
    await expect(
      tech.getByRole("link", { name: new RegExp(title) }),
    ).toBeVisible();
  });

  test("a production manager cannot open the plans", async ({ page }) => {
    await signInAs(page, DEMO.productionManager);
    await page.goto(PLANS);
    await expect(page).not.toHaveURL(/preventive/);
  });
});
