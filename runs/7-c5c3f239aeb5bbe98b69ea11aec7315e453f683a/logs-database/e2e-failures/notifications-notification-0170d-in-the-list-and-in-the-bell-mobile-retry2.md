# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: notifications.spec.ts >> notifications >> a test notification appears in the list and in the bell
- Location: tests/e2e/notifications.spec.ts:10:3

# Error details

```
Error: expect(locator).toHaveCount(expected) failed

Locator:  getByRole('list', { name: 'الإشعارات' }).getByRole('listitem')
Expected: 1
Received: 3
Timeout:  5000ms

Call log:
  - Expect "toHaveCount" getByRole('list', { name: 'الإشعارات' }).getByRole('listitem') with timeout 5000ms
  - waiting for getByRole('list', { name: 'الإشعارات' }).getByRole('listitem')
    14 × locator resolved to 3 elements
       - unexpected value "3"

```

# Page snapshot

```yaml
- generic [active] [ref=f1e1]:
  - status [ref=f1e2]: "بيئة محلية: البيانات هنا تجريبية وليست بيانات المصنع الحقيقية"
  - generic [ref=f1e3]:
    - banner [ref=f1e4]:
      - generic [ref=f1e5]: المصنع
      - link "الإشعارات" [ref=f1e7] [cursor=pointer]:
        - /url: /m/notifications
    - main [ref=f1e11]:
      - generic [ref=f1e12]:
        - heading "الإشعارات" [level=1] [ref=f1e13]
        - generic [ref=f1e14]:
          - generic [ref=f1e15]:
            - generic [ref=f1e16]: إشعارات هذا الجهاز
            - generic [ref=f1e19]:
              - alert [ref=f1e20]:
                - generic [ref=f1e21]: الإشعارات غير مفعّلة على الخادم بعد. راجع مسؤول النظام.
              - button "إرسال إشعار تجريبي" [ref=f1e23]
          - generic [ref=f1e24]:
            - button "تعليم الكل كمقروء" [ref=f1e25]
            - list "الإشعارات" [ref=f1e26]:
              - listitem [ref=f1e27]:
                - link "إشعار تجريبي (غير مقروء) إذا وصلك هذا الإشعار فالإشعارات تعمل على هذا الجهاز. 10 نوفمبر 2026 في 10:35 م" [ref=f1e28] [cursor=pointer]:
                  - /url: /m/notifications
                  - generic [ref=f1e31]:
                    - paragraph [ref=f1e32]:
                      - text: إشعار تجريبي
                      - generic [ref=f1e33]: (غير مقروء)
                    - paragraph [ref=f1e34]: إذا وصلك هذا الإشعار فالإشعارات تعمل على هذا الجهاز.
                    - paragraph [ref=f1e35]: 10 نوفمبر 2026 في 10:35 م
              - listitem [ref=f1e36]:
                - link [ref=f1e37] [cursor=pointer]:
                  - /url: /m/notifications
                  - generic [ref=f1e40]:
                    - paragraph [ref=f1e41]: إشعار تجريبي
                    - paragraph [ref=f1e42]: إذا وصلك هذا الإشعار فالإشعارات تعمل على هذا الجهاز.
                    - paragraph [ref=f1e43]: 10 نوفمبر 2026 في 10:35 م
              - listitem [ref=f1e44]:
                - link [ref=f1e45] [cursor=pointer]:
                  - /url: /m/notifications
                  - generic [ref=f1e48]:
                    - paragraph [ref=f1e49]: إشعار تجريبي
                    - paragraph [ref=f1e50]: إذا وصلك هذا الإشعار فالإشعارات تعمل على هذا الجهاز.
                    - paragraph [ref=f1e51]: 10 نوفمبر 2026 في 10:34 م
    - navigation "التنقل" [ref=f1e52]:
      - list [ref=f1e53]:
        - listitem [ref=f1e54]:
          - link "الرئيسية" [ref=f1e55] [cursor=pointer]:
            - /url: /m
        - listitem [ref=f1e59]:
          - link "حسابي" [ref=f1e60] [cursor=pointer]:
            - /url: /m/account
  - region "Notifications alt+T"
  - alert [ref=f1e64]
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
> 32 |     await expect(items).toHaveCount(before + 1);
     |                         ^ Error: expect(locator).toHaveCount(expected) failed
  33 |     await expect(items.first()).toContainText("إشعار تجريبي");
  34 | 
  35 |     // The bell picks the new notification up live (Supabase Realtime).
  36 |     await expect(page.getByTestId("unread-count")).toBeVisible();
  37 | 
  38 |     await page.getByRole("button", { name: "تعليم الكل كمقروء" }).click();
  39 |     await expect(page.getByTestId("unread-count")).toBeHidden();
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
