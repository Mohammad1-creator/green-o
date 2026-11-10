import { expect, test } from "@playwright/test";

import { DEMO, randomDigits, requireSupabase, signIn } from "./helpers";

test.describe("tasks", () => {
  test.beforeEach(() => {
    requireSupabase();
  });

  test("a task goes from creation to approval, with one return for follow-up", async ({
    browser,
  }, testInfo) => {
    // Desktop and mobile runs happen together, so each uses its own technician.
    const technician =
      testInfo.project.name === "mobile"
        ? { employeeNo: DEMO.maintenanceTech2, name: "يوسف كريم" }
        : { employeeNo: DEMO.maintenanceTech, name: "عمر حسن" };
    const title = `فحص المضخة ${randomDigits(5)}`;

    // The maintenance manager creates the task.
    const manager = await (await browser.newContext()).newPage();
    await signIn(manager, DEMO.maintenanceManager);
    await expect(manager).toHaveURL(/\/admin$/);
    await manager.goto("/admin/tasks/new");
    await manager.getByLabel("العنوان").fill(title);
    await manager
      .getByLabel("التفاصيل (اختياري)")
      .fill("افحص التسريب وغيّر الحشوة إن لزم.");
    await manager.getByLabel("الموظف").selectOption({ label: technician.name });
    await manager.getByRole("button", { name: "إنشاء المهمة" }).click();
    await expect(manager.getByText("أُنشئت المهمة")).toBeVisible();
    const taskUrl = new URL(manager.url());
    const taskId = taskUrl.pathname.split("/").pop() ?? "";

    // The technician finds it on the phone, acknowledges, starts and hands it in.
    const tech = await (await browser.newContext()).newPage();
    await signIn(tech, technician.employeeNo);
    await expect(tech).toHaveURL(/\/m$/);
    await tech.getByRole("link", { name: new RegExp(title) }).click();
    await expect(tech).toHaveURL(new RegExp(`/m/tasks/${taskId}`));
    await tech.getByRole("button", { name: "استلمتها" }).click();
    await expect(tech.getByText("مستلمة").first()).toBeVisible();
    await tech.getByRole("button", { name: "بدء التنفيذ" }).click();
    await expect(tech.getByText("قيد التنفيذ").first()).toBeVisible();
    await tech.getByLabel("ملاحظة للمدير (اختياري)").fill("غيّرت الحشوة.");
    await tech
      .getByRole("button", { name: "تم الإنجاز: أرسل للاعتماد" })
      .click();
    await expect(tech.getByText("بانتظار اعتماد المدير")).toBeVisible();

    // The manager sees who saw it, and returns it with a reason.
    await manager.goto(`/admin/tasks/${taskId}`);
    await expect(manager.getByText("بانتظار الاعتماد").first()).toBeVisible();
    await expect(
      manager.getByRole("list", { name: "المسند إليهم" }),
    ).toContainText("شاهدها");
    await manager
      .getByLabel("أو أعدها للمتابعة مع ذكر السبب")
      .fill("ما زال هناك تسريب بسيط");
    await manager.getByRole("button", { name: "إعادة للمتابعة" }).click();
    await expect(manager.getByText("تحتاج متابعة").first()).toBeVisible();

    // The technician sees the reason, follows up and hands it in again.
    await tech.reload();
    await expect(
      tech.getByText("ما زال هناك تسريب بسيط").first(),
    ).toBeVisible();
    await tech.getByRole("button", { name: "بدء التنفيذ" }).click();
    await tech
      .getByRole("button", { name: "تم الإنجاز: أرسل للاعتماد" })
      .click();
    await expect(tech.getByText("بانتظار اعتماد المدير")).toBeVisible();

    // The manager approves.
    await manager.reload();
    await manager.getByRole("button", { name: "اعتماد المهمة" }).click();
    await expect(manager.getByText("مكتملة").first()).toBeVisible();
    await expect(
      manager.getByRole("list", { name: "سجل المهمة" }),
    ).toContainText("من «بانتظار الاعتماد» إلى «مكتملة»");
  });
});
