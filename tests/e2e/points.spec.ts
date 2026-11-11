import { expect, test } from "@playwright/test";

import { DEMO, randomDigits, requireSupabase, signIn } from "./helpers";

test.describe("task points", () => {
  test.beforeEach(() => {
    requireSupabase();
  });

  test("a manager awards points on a completed task and sees the ranking", async ({
    browser,
  }, testInfo) => {
    const technician =
      testInfo.project.name === "mobile"
        ? { employeeNo: DEMO.maintenanceTech2, name: "يوسف كريم" }
        : { employeeNo: DEMO.maintenanceTech, name: "عمر حسن" };
    const title = `مهمة نقاط ${randomDigits(5)}`;

    const manager = await (await browser.newContext()).newPage();
    await signIn(manager, DEMO.maintenanceManager);
    await expect(manager).toHaveURL(/\/admin$/);
    await manager.goto("/admin/tasks/new");
    await manager.getByLabel("العنوان").fill(title);
    await manager.getByLabel("الموظف").selectOption({ label: technician.name });
    await manager.getByRole("button", { name: "إنشاء المهمة" }).click();
    await expect(
      manager.getByText("أُنشئت المهمة وأُرسل إشعار للمسند إليهم."),
    ).toBeVisible();
    const taskId = new URL(manager.url()).pathname.split("/").pop() ?? "";

    // No points while the task is open.
    await expect(
      manager.getByRole("button", { name: "إضافة النقاط" }),
    ).toHaveCount(0);

    const tech = await (await browser.newContext()).newPage();
    await signIn(tech, technician.employeeNo);
    await expect(tech).toHaveURL(/\/m$/);
    await tech.goto(`/m/tasks/${taskId}`);
    await tech.getByRole("button", { name: "بدء التنفيذ" }).click();
    await tech
      .getByRole("button", { name: "تم الإنجاز: أرسل للاعتماد" })
      .click();
    await expect(tech.getByText("بانتظار اعتماد المدير")).toBeVisible();

    await manager.reload();
    await manager.getByRole("button", { name: "اعتماد المهمة" }).click();
    await expect(manager.getByText("مكتملة").first()).toBeVisible();

    // A wrong amount is refused, then the manager awards 12 points.
    const points = manager.getByLabel(technician.name, { exact: true });
    await points.fill("0");
    await manager.getByRole("button", { name: "إضافة النقاط" }).click();
    await expect(
      manager.getByText("النقاط رقم صحيح من 1 إلى 1000").first(),
    ).toBeVisible();
    await points.fill("12");
    await manager.getByLabel("ملاحظة (اختيارية)").fill("أنجزها بسرعة");
    await manager.getByRole("button", { name: "إضافة النقاط" }).click();
    await expect(
      manager.getByRole("list", { name: "النقاط الممنوحة" }),
    ).toContainText(`${technician.name}: 12 نقطة`);
    await expect(manager.getByText("المجموع:")).toContainText("12");

    // The ranking lists the technician.
    await manager.goto("/admin/points");
    await expect(
      manager.getByRole("table", { name: "ترتيب الموظفين بالنقاط" }),
    ).toContainText(technician.name);

    // Employees have no access to points.
    await tech.goto("/admin/points");
    await expect(tech).not.toHaveURL(/\/admin\/points/);
  });
});
