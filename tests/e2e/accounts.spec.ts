import { expect, test } from "@playwright/test";

import {
  DEMO,
  randomDigits,
  requireSupabase,
  signIn,
  signOut,
} from "./helpers";

test.describe("sign-in and accounts", () => {
  test.beforeEach(() => {
    requireSupabase();
  });

  test("a wrong password shows an Arabic error", async ({ page }) => {
    await signIn(page, DEMO.generalManager, "wrong-password-123");
    await expect(page.getByRole("alert")).toContainText(
      "رقم الموظف أو كلمة المرور غير صحيحة",
    );
  });

  test("Arabic-Indic digits in the employee number are accepted", async ({
    page,
  }) => {
    await signIn(page, "١٠٠٠");
    await expect(page).toHaveURL(/\/admin$/);
  });

  test("the general manager lands on the admin panel and adds a department", async ({
    page,
  }) => {
    await signIn(page, DEMO.generalManager);
    await expect(page).toHaveURL(/\/admin$/);
    await expect(page.getByRole("heading", { level: 1 })).toContainText(
      "مرحباً",
    );

    await page.goto("/admin/departments");
    const name = `قسم ${randomDigits(6)}`;
    await page.getByLabel("اسم القسم الجديد").fill(name);
    await page.getByRole("button", { name: "إضافة" }).click();
    await expect(page.getByText("أُضيف القسم")).toBeVisible();
    await expect(page.locator(`input[value="${name}"]`)).toBeVisible();
  });

  test("a department manager creates an employee who can then sign in", async ({
    page,
  }) => {
    const employeeNo = `7${randomDigits(7)}`;
    const password = "Maint-Test-2026";

    await signIn(page, DEMO.maintenanceManager);
    await expect(page).toHaveURL(/\/admin$/);
    await page.goto("/admin/users/new");
    await page.getByLabel("الاسم الكامل").fill("موظف اختبار جديد");
    await page.getByLabel("رقم الموظف").fill(employeeNo);
    await page.getByLabel("كلمة المرور").fill(password);
    await page.getByRole("button", { name: "إنشاء الحساب" }).click();
    await expect(page.getByText("أُنشئ الحساب")).toBeVisible();
    await signOut(page);

    await signIn(page, employeeNo, password);
    await expect(page).toHaveURL(/\/m$/);
    await expect(page.getByRole("heading", { level: 1 })).toContainText(
      "موظف اختبار جديد",
    );
  });

  test("an employee cannot open the admin panel", async ({ page }) => {
    await signIn(page, DEMO.productionWorker);
    await expect(page).toHaveURL(/\/m$/);
    await page.goto("/admin/users");
    await expect(page).toHaveURL(/\/m$/);
  });

  test("a deactivated account is signed out and cannot sign back in", async ({
    browser,
  }) => {
    const employeeNo = `6${randomDigits(7)}`;
    const password = "Deact-Test-2026";

    const manager = await browser.newPage();
    await signIn(manager, DEMO.productionManager);
    await expect(manager).toHaveURL(/\/admin$/);
    await manager.goto("/admin/users/new");
    await manager.getByLabel("الاسم الكامل").fill("موظف سيُوقف");
    await manager.getByLabel("رقم الموظف").fill(employeeNo);
    await manager.getByLabel("كلمة المرور").fill(password);
    await manager.getByRole("button", { name: "إنشاء الحساب" }).click();
    await expect(manager.getByText("أُنشئ الحساب")).toBeVisible();

    const employee = await browser.newPage();
    await signIn(employee, employeeNo, password);
    await expect(employee).toHaveURL(/\/m$/);

    manager.once("dialog", (dialog) => dialog.accept());
    await manager.getByRole("button", { name: "إيقاف الحساب" }).click();
    await expect(manager.getByText("أُوقف الحساب")).toBeVisible();

    await employee.reload();
    await expect(employee).toHaveURL(/\/login\?reason=inactive/);
    await expect(employee.getByRole("alert")).toContainText("موقوف");

    await signIn(employee, employeeNo, password);
    await expect(employee.getByRole("alert")).toContainText("موقوف");
  });
});
