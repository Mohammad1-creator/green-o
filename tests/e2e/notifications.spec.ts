import { expect, test } from "@playwright/test";

import { DEMO, requireSupabase, signIn } from "./helpers";

test.describe("notifications", () => {
  test.beforeEach(() => {
    requireSupabase();
  });

  test("a test notification appears in the list and in the bell", async ({
    page,
  }, testInfo) => {
    // Desktop and mobile run at the same time, so each uses its own account.
    const user =
      testInfo.project.name === "mobile"
        ? DEMO.productionWorker2
        : DEMO.maintenanceTech2;
    await signIn(page, user);
    await expect(page).toHaveURL(/\/m$/);

    await page.goto("/m/notifications");
    await expect(
      page.getByRole("heading", { name: "الإشعارات", level: 1 }),
    ).toBeVisible();
    const items = page
      .getByRole("list", { name: "الإشعارات" })
      .getByRole("listitem");
    const before = await items.count();

    await page.getByRole("button", { name: "إرسال إشعار تجريبي" }).click();
    await expect(page.getByText("أُرسل إشعار تجريبي")).toBeVisible();
    await expect(items).toHaveCount(before + 1);
    await expect(items.first()).toContainText("إشعار تجريبي");

    // The bell picks the new notification up live (Supabase Realtime).
    await expect(page.getByTestId("unread-count")).toBeVisible();

    await page.getByRole("button", { name: "تعليم الكل كمقروء" }).click();
    await expect(page.getByTestId("unread-count")).toBeHidden();
  });
});

// Needs no database, so it runs everywhere.
test("the app can be installed: manifest and service worker are served", async ({
  page,
  request,
}) => {
  const manifest = await request.get("/manifest.webmanifest");
  expect(manifest.ok()).toBe(true);
  const body = await manifest.json();
  expect(body).toMatchObject({
    dir: "rtl",
    lang: "ar",
    display: "standalone",
    start_url: "/m",
  });

  const worker = await request.get("/sw.js");
  expect(worker.ok()).toBe(true);
  expect(await worker.text()).toContain("showNotification");

  const icon = await request.get("/icons/512");
  expect(icon.headers()["content-type"]).toContain("image/png");

  await page.goto("/m/install");
  await expect(
    page.getByRole("heading", { name: "تثبيت التطبيق على الجوال" }),
  ).toBeVisible();
});
