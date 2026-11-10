import { expect, test } from "@playwright/test";

import { DEMO, randomDigits, requireSupabase, signInAs } from "./helpers";

// A 1x1 PNG, enough to exercise the shrink-and-upload path.
const PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
  "base64",
);

/** "YYYY-MM-DDTHH:mm" in Riyadh, some minutes from now (for datetime-local). */
function riyadhLocal(minutesFromNow: number): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Riyadh",
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).formatToParts(new Date(Date.now() + minutesFromNow * 60_000));
  const get = (type: string) =>
    parts.find((part) => part.type === type)?.value ?? "";
  return `${get("year")}-${get("month")}-${get("day")}T${get("hour")}:${get("minute")}`;
}

test.describe("working together on a task", () => {
  test.beforeEach(() => {
    requireSupabase();
  });

  test("comments, a photo and a reminder", async ({ browser }, testInfo) => {
    const technician =
      testInfo.project.name === "mobile"
        ? { employeeNo: DEMO.maintenanceTech2, name: "يوسف كريم" }
        : { employeeNo: DEMO.maintenanceTech, name: "عمر حسن" };
    const title = `تغيير السير ${randomDigits(5)}`;

    const manager = await (await browser.newContext()).newPage();
    await signInAs(manager, DEMO.maintenanceManager);
    await expect(manager).toHaveURL(/\/admin$/);
    await manager.goto("/admin/tasks/new");
    await manager.getByLabel("العنوان").fill(title);
    await manager.getByLabel("الموظف").selectOption({ label: technician.name });
    await manager.getByRole("button", { name: "إنشاء المهمة" }).click();
    await expect(
      manager.getByText("أُنشئت المهمة وأُرسل إشعار للمسند إليهم."),
    ).toBeVisible();
    const taskId = new URL(manager.url()).pathname.split("/").pop() ?? "";

    // The technician comments and attaches a photo from the phone.
    const tech = await (await browser.newContext()).newPage();
    await signInAs(tech, technician.employeeNo);
    await tech.goto(`/m/tasks/${taskId}`);
    await tech.getByLabel("تعليق جديد").fill("وصلت القطعة البديلة");
    await tech.getByRole("button", { name: "إضافة التعليق" }).click();
    await expect(tech.getByRole("list", { name: "التعليقات" })).toContainText(
      "وصلت القطعة البديلة",
    );

    await tech.getByLabel("اختيار صورة").setInputFiles({
      name: "belt.png",
      mimeType: "image/png",
      buffer: PNG,
    });
    await expect(tech.getByText("أُرفقت الصورة")).toBeVisible();
    await expect(
      tech.getByRole("list", { name: "صور المهمة" }).getByRole("img"),
    ).toHaveCount(1);

    // The manager sees both, adds a reminder, and removes the photo.
    await manager.reload();
    await expect(
      manager.getByRole("list", { name: "التعليقات" }),
    ).toContainText("وصلت القطعة البديلة");
    await expect(
      manager.getByRole("list", { name: "صور المهمة" }).getByRole("img"),
    ).toHaveCount(1);

    await manager
      .getByLabel("وقت التذكير (بتوقيت المصنع)")
      .fill(riyadhLocal(90));
    await manager.getByRole("button", { name: "إضافة تذكير" }).click();
    await expect(manager.getByText("أُضيف التذكير")).toBeVisible();
    await expect(
      manager.getByRole("list", { name: "التذكيرات" }).getByRole("listitem"),
    ).toHaveCount(1);

    manager.once("dialog", (dialog) => dialog.accept());
    await manager.getByRole("button", { name: "حذف الصورة" }).click();
    await expect(manager.getByText("لا توجد صور.")).toBeVisible();
  });
});
