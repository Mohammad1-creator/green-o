# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: notifications.spec.ts >> notifications >> a test notification appears in the list and in the bell
- Location: tests/e2e/notifications.spec.ts:10:3

# Error details

```
Error: expect(locator).toBeHidden() failed

Locator:  getByTestId('unread-count')
Expected: hidden
Received: visible
Timeout:  5000ms

Call log:
  - Expect "toBeHidden" getByTestId('unread-count') with timeout 5000ms
  - waiting for getByTestId('unread-count')
    14 × locator resolved to <span data-testid="unread-count" class="absolute -end-0.5 -top-0.5 min-w-5 rounded-full bg-destructive px-1 text-center text-[11px] leading-5 font-bold text-white">2</span>
       - unexpected value "visible"

```

```yaml
- text: "2"
```

# Test source

```ts
  1  | import { expect, test } from "@playwright/test";
  2  | 
  3  | import { DEMO, requireSupabase, signIn } from "./helpers";
  4  | 
  5  | test.describe("notifications", () => {
  6  |   test.beforeEach(() => {
  7  |     requireSupabase();
  8  |   });
  9  | 
  10 |   test("a test notification appears in the list and in the bell", async ({
  11 |     page,
  12 |   }, testInfo) => {
  13 |     // Desktop and mobile run at the same time, so each uses its own account.
  14 |     const user =
  15 |       testInfo.project.name === "mobile"
  16 |         ? DEMO.productionWorker2
  17 |         : DEMO.maintenanceTech2;
  18 |     await signIn(page, user);
  19 |     await expect(page).toHaveURL(/\/m$/);
  20 | 
  21 |     await page.goto("/m/notifications");
  22 |     await expect(
  23 |       page.getByRole("heading", { name: "الإشعارات", level: 1 }),
  24 |     ).toBeVisible();
  25 |     const items = page
  26 |       .getByRole("list", { name: "الإشعارات" })
  27 |       .getByRole("listitem");
  28 |     const before = await items.count();
  29 | 
  30 |     await page.getByRole("button", { name: "إرسال إشعار تجريبي" }).click();
  31 |     await expect(page.getByText("أُرسل إشعار تجريبي")).toBeVisible();
  32 |     await expect(items).toHaveCount(before + 1);
  33 |     await expect(items.first()).toContainText("إشعار تجريبي");
  34 | 
  35 |     // The bell picks the new notification up live (Supabase Realtime).
  36 |     await expect(page.getByTestId("unread-count")).toBeVisible();
  37 | 
  38 |     await page.getByRole("button", { name: "تعليم الكل كمقروء" }).click();
> 39 |     await expect(page.getByTestId("unread-count")).toBeHidden();
     |                                                    ^ Error: expect(locator).toBeHidden() failed
  40 |   });
  41 | });
  42 | 
  43 | // Needs no database, so it runs everywhere.
  44 | test("the app can be installed: manifest and service worker are served", async ({
  45 |   page,
  46 |   request,
  47 | }) => {
  48 |   const manifest = await request.get("/manifest.webmanifest");
  49 |   expect(manifest.ok()).toBe(true);
  50 |   const body = await manifest.json();
  51 |   expect(body).toMatchObject({
  52 |     dir: "rtl",
  53 |     lang: "ar",
  54 |     display: "standalone",
  55 |     start_url: "/m",
  56 |   });
  57 | 
  58 |   const worker = await request.get("/sw.js");
  59 |   expect(worker.ok()).toBe(true);
  60 |   expect(await worker.text()).toContain("showNotification");
  61 | 
  62 |   const icon = await request.get("/icons/512");
  63 |   expect(icon.headers()["content-type"]).toContain("image/png");
  64 | 
  65 |   await page.goto("/m/install");
  66 |   await expect(
  67 |     page.getByRole("heading", { name: "تثبيت التطبيق على الجوال" }),
  68 |   ).toBeVisible();
  69 | });
  70 | 
```
