import { expect, test } from "@playwright/test";

import { DEMO, randomDigits, requireSupabase, signIn } from "./helpers";

test.describe("safety violations", () => {
  test.beforeEach(() => {
    requireSupabase();
  });

  test("a supervisor records a violation, the employee objects, the safety manager decides", async ({
    browser,
  }, testInfo) => {
    const worker =
      testInfo.project.name === "mobile"
        ? { employeeNo: DEMO.productionWorker2, name: "حسن جواد" }
        : { employeeNo: DEMO.productionWorker3, name: "ليلى ناصر" };
    const description = `بلا خوذة قرب الرافعة ${randomDigits(5)}`;

    // The supervisor records it from the phone.
    const supervisor = await (await browser.newContext()).newPage();
    await signIn(supervisor, DEMO.safetySupervisor);
    await expect(supervisor).toHaveURL(/\/m$/);
    await supervisor.getByRole("link", { name: "السلامة" }).click();
    await supervisor.getByRole("link", { name: "تسجيل مخالفة" }).click();
    await supervisor.getByLabel("الموظف").selectOption({ label: worker.name });
    await supervisor
      .getByLabel("نوع المخالفة")
      .selectOption({ label: "عدم ارتداء الخوذة · متوسطة · خصم 10" });
    await supervisor.getByLabel("ماذا حدث؟").fill(description);
    await supervisor.getByRole("button", { name: "تسجيل المخالفة" }).click();
    await expect(
      supervisor.getByText("سُجّلت المخالفة وأُرسل إشعار للموظف."),
    ).toBeVisible();
    const violationId =
      new URL(supervisor.url()).pathname.split("/").pop() ?? "";

    // The employee sees the alert on the phone and objects.
    const employee = await (await browser.newContext()).newPage();
    await signIn(employee, worker.employeeNo);
    await expect(employee).toHaveURL(/\/m$/);
    await expect(
      employee.getByRole("alert").filter({ hasText: "بانتظار ردك" }),
    ).toBeVisible();
    await employee.goto(`/m/violations/${violationId}`);
    await expect(employee.getByText(description)).toBeVisible();
    await employee.getByRole("button", { name: "إرسال الاعتراض" }).click();
    await expect(employee.getByText("اكتب سبب الاعتراض").first()).toBeVisible();
    await employee
      .getByLabel("أو اعترض عليها مع ذكر السبب")
      .fill("كنت أرتدي الخوذة، خلعتها للحظة فقط");
    await employee.getByRole("button", { name: "إرسال الاعتراض" }).click();
    await expect(employee.getByText("اعتراض بانتظار القرار")).toBeVisible();

    // The safety manager rejects the objection in the admin panel.
    const manager = await (await browser.newContext()).newPage();
    await signIn(manager, DEMO.safetyManager);
    await expect(manager).toHaveURL(/\/admin$/);
    await manager.goto(`/admin/safety/violations/${violationId}`);
    await manager.getByLabel("سبب القرار").fill("الصورة تثبت المخالفة");
    await manager
      .getByRole("button", { name: "رفض الاعتراض (تثبت المخالفة)" })
      .click();
    await expect(
      manager.getByText("رُفض الاعتراض وثبتت المخالفة"),
    ).toBeVisible();

    // The employee sees the outcome.
    await employee.reload();
    await expect(employee.getByText("ثابتة بعد الاعتراض")).toBeVisible();
    await expect(employee.getByText("الصورة تثبت المخالفة")).toBeVisible();

    // A plain employee cannot record violations.
    await employee.goto("/m/violations/new");
    await expect(employee).toHaveURL(/\/m\/violations$/);
  });
});
