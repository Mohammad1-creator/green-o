import { expect, test } from "@playwright/test";

import { DEMO, randomDigits, requireSupabase, signInAs } from "./helpers";

test.describe("maintenance", () => {
  test.beforeEach(() => {
    requireSupabase();
  });

  test("a fault is reported, repaired, approved and closed", async ({
    browser,
  }, testInfo) => {
    const mobile = testInfo.project.name === "mobile";
    const reporterNo = mobile ? DEMO.productionWorker2 : DEMO.productionWorker;
    const technician = mobile
      ? { employeeNo: DEMO.maintenanceTech2, name: "يوسف كريم" }
      : { employeeNo: DEMO.maintenanceTech, name: "عمر حسن" };
    const description = `تسرب زيت ${randomDigits(5)}`;

    // A production worker reports a fault that stopped the machine.
    const reporter = await (await browser.newContext()).newPage();
    await signInAs(reporter, reporterNo);
    await reporter.goto("/m/faults/new");
    await reporter.getByLabel("الآلة").selectOption({ index: 1 });
    await reporter.getByLabel("ما المشكلة؟").fill(description);
    await reporter.getByLabel("الآلة متوقفة عن العمل بسبب هذا العطل").check();
    await reporter.getByRole("button", { name: "إرسال البلاغ" }).click();
    await expect(
      reporter.getByText("وصل بلاغك إلى مدير الصيانة"),
    ).toBeVisible();
    const faultId = new URL(reporter.url()).pathname.split("/").pop() ?? "";

    // The general manager can see it but cannot assign the repair.
    const gm = await (await browser.newContext()).newPage();
    await signInAs(gm, DEMO.generalManager);
    await gm.goto(`/admin/maintenance/faults/${faultId}`);
    await expect(gm.getByText(description)).toBeVisible();
    await expect(gm.getByRole("button", { name: "إسناد الإصلاح" })).toHaveCount(
      0,
    );

    // The maintenance manager assigns the repair.
    const manager = await (await browser.newContext()).newPage();
    await signInAs(manager, DEMO.maintenanceManager);
    await manager.goto(`/admin/maintenance/faults/${faultId}`);
    await manager.getByLabel("الموظف").selectOption({ label: technician.name });
    await manager.getByRole("button", { name: "إسناد الإصلاح" }).click();
    await expect(manager).toHaveURL(/\/admin\/tasks\/[0-9a-f-]+\?created=1/);
    const taskId = new URL(manager.url()).pathname.split("/").pop() ?? "";

    // The technician repairs and hands in; the manager approves.
    const tech = await (await browser.newContext()).newPage();
    await signInAs(tech, technician.employeeNo);
    await tech.goto(`/m/tasks/${taskId}`);
    await tech.getByRole("button", { name: "بدء التنفيذ" }).click();
    await tech.getByLabel("ملاحظة للمدير (اختياري)").fill("غيّرت الحشوة");
    await tech
      .getByRole("button", { name: "تم الإنجاز: أرسل للاعتماد" })
      .click();
    await expect(tech.getByText("بانتظار اعتماد المدير")).toBeVisible();

    await manager.goto(`/admin/tasks/${taskId}`);
    await manager.getByRole("button", { name: "اعتماد المهمة" }).click();
    await expect(manager.getByText("مكتملة").first()).toBeVisible();

    // The reporter sees the fault fixed, with the technician's note.
    await reporter.goto(`/m/faults/${faultId}`);
    await expect(reporter.getByText("تم الإصلاح").first()).toBeVisible();
    await expect(reporter.getByText("غيّرت الحشوة").first()).toBeVisible();
  });
});
