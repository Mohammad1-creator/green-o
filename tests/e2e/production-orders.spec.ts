import { expect, type Page, test } from "@playwright/test";

import { DEMO, requireSupabase, signInAs } from "./helpers";

const PRODUCT = "MDF-12-G · لوح MDF رمادي 12 مم مقاوم للرطوبة";

async function assignWorker(page: Page, stage: string, worker: string) {
  const section = page.getByRole("region", { name: new RegExp(stage) });
  await section.getByText("إسناد العمال").click();
  await section.getByLabel(worker).check();
  await section.getByRole("button", { name: "حفظ العمال" }).click();
  await expect(section.getByText(`العمال: ${worker}`)).toBeVisible();
}

async function openMyStage(page: Page, orderCode: string, stage: string) {
  await page.goto("/m/production");
  await page
    .getByRole("link")
    .filter({ hasText: orderCode })
    .filter({ hasText: stage })
    .click();
  await expect(page.getByRole("heading", { name: stage })).toBeVisible();
}

test.describe("production orders", () => {
  test.beforeEach(() => {
    requireSupabase();
  });

  test("stages record in parallel within what is available", async ({
    browser,
  }) => {
    // The production manager creates an order of 50 (cut, then pack).
    const manager = await (await browser.newContext()).newPage();
    manager.on("dialog", (dialog) => void dialog.accept());
    await signInAs(manager, DEMO.productionManager);
    await manager.goto("/admin/production/orders");
    await manager.getByLabel("المنتج").selectOption({ label: PRODUCT });
    await manager.getByLabel("الكمية", { exact: true }).fill("50");
    await manager.getByRole("button", { name: "إنشاء الأمر" }).click();
    await expect(manager).toHaveURL(
      /\/admin\/production\/orders\/[0-9a-f-]+\?created=1/,
    );
    const title = await manager.getByRole("heading", { level: 1 }).innerText();
    const orderCode = /P-\d{6}/.exec(title)?.[0] ?? "";
    expect(orderCode).not.toBe("");

    await assignWorker(manager, "قص", "علي محمود");
    await assignWorker(manager, "تغليف", "ليلى ناصر");

    // The cutter records 30 good and 2 defective on the phone.
    const cutter = await (await browser.newContext()).newPage();
    await signInAs(cutter, DEMO.productionWorker);
    await openMyStage(cutter, orderCode, "قص");
    await expect(cutter.getByTestId("available-now")).toHaveText("50 لوح");
    await cutter.getByLabel("الكمية السليمة").fill("30");
    await cutter.getByLabel("الكمية المعيبة").fill("2");
    await cutter.getByLabel("نوع العيب").selectOption({ label: "مقاس خاطئ" });
    await cutter.getByRole("button", { name: "تسجيل الكمية" }).click();
    await expect(cutter.getByTestId("available-now")).toHaveText("18 لوح");

    // More than what is left is refused, and the typed value stays.
    await cutter.getByLabel("الكمية السليمة").fill("20");
    await cutter.getByRole("button", { name: "تسجيل الكمية" }).click();
    await expect(
      cutter.getByText("الكمية أكبر من المتاح لهذه المرحلة. المتاح الآن: 18"),
    ).toBeVisible();
    await expect(cutter.getByLabel("الكمية السليمة")).toHaveValue("20");

    // Packing works on the 30 good pieces while cutting continues.
    const packer = await (await browser.newContext()).newPage();
    await signInAs(packer, "3003");
    await openMyStage(packer, orderCode, "تغليف");
    await expect(packer.getByTestId("available-now")).toHaveText("30 لوح");
    await packer.getByLabel("الكمية السليمة").fill("30");
    await packer.getByRole("button", { name: "تسجيل الكمية" }).click();
    await expect(packer.getByTestId("available-now")).toHaveText("0 لوح");

    // The manager closes the stages in order, which completes the order.
    await manager.reload();
    const cutting = manager.getByRole("region", { name: /قص/ });
    await cutting.getByRole("button", { name: "إغلاق المرحلة" }).click();
    await expect(cutting.getByText("مغلقة")).toBeVisible();
    const packing = manager.getByRole("region", { name: /تغليف/ });
    await packing.getByRole("button", { name: "إغلاق المرحلة" }).click();
    await expect(manager.getByText("مكتمل").first()).toBeVisible();
  });
});
