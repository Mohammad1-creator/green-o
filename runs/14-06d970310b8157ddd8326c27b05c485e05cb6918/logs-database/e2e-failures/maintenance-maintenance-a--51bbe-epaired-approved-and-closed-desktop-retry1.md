# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: maintenance.spec.ts >> maintenance >> a fault is reported, repaired, approved and closed
- Location: tests/e2e/maintenance.spec.ts:10:3

# Error details

```
Error: locator.selectOption: Error: strict mode violation: getByLabel('الآلة') resolved to 2 elements:
    1) <select name="machineId" id="fault-machine" data-size="default" data-slot="native-select" class="h-8 w-full min-w-0 appearance-none rounded-lg border border-input bg-transparent py-1 ps-2.5 pe-8 text-sm transition-colors outline-none select-none selection:bg-primary selection:text-primary-foreground placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:cursor-not-allowed aria-invalid:border-destructive aria-inv…>…</select> aka getByLabel('الآلة', { exact: true })
    2) <input name="stopped" type="checkbox" class="size-5 accent-destructive"/> aka getByLabel('الآلة متوقفة عن العمل بسبب هذا العطل')

Call log:
  - waiting for getByLabel('الآلة')

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
        - heading "إبلاغ عن عطل" [level=1] [ref=f1e13]
        - generic [ref=f1e15]:
          - group [ref=f1e16]:
            - generic [ref=f1e17]: الآلة
            - combobox "الآلة" [ref=f1e19]:
              - option "اختر الآلة" [selected]
              - option "M-01 · مقص الألواح"
              - option "M-02 · مكبس التصفيح"
              - option "M-03 · آلة التغليف"
              - option "M-04 · ضاغط الهواء"
          - group [ref=f1e20]:
            - generic [ref=f1e21]: ما المشكلة؟
            - textbox "ما المشكلة؟" [ref=f1e22]:
              - /placeholder: "مثلاً: صوت طرق عالٍ عند التشغيل، أو تسرب زيت من المكبس"
          - generic [ref=f1e23]:
            - checkbox "الآلة متوقفة عن العمل بسبب هذا العطل" [ref=f1e24]
            - text: الآلة متوقفة عن العمل بسبب هذا العطل
          - paragraph [ref=f1e25]: يمكنك إرفاق صور بعد إرسال البلاغ.
          - button "إرسال البلاغ" [ref=f1e26]
    - navigation "التنقل" [ref=f1e27]:
      - list [ref=f1e28]:
        - listitem [ref=f1e29]:
          - link "مهامي" [ref=f1e30] [cursor=pointer]:
            - /url: /m
        - listitem [ref=f1e34]:
          - link "الأعطال" [ref=f1e35] [cursor=pointer]:
            - /url: /m/faults
        - listitem [ref=f1e38]:
          - link "حسابي" [ref=f1e39] [cursor=pointer]:
            - /url: /m/account
  - region "Notifications alt+T"
  - alert [ref=f1e43]
```

# Test source

```ts
  1  | import { expect, test } from "@playwright/test";
  2  | 
  3  | import { DEMO, randomDigits, requireSupabase, signInAs } from "./helpers";
  4  | 
  5  | test.describe("maintenance", () => {
  6  |   test.beforeEach(() => {
  7  |     requireSupabase();
  8  |   });
  9  | 
  10 |   test("a fault is reported, repaired, approved and closed", async ({
  11 |     browser,
  12 |   }, testInfo) => {
  13 |     const mobile = testInfo.project.name === "mobile";
  14 |     const reporterNo = mobile ? DEMO.productionWorker2 : DEMO.productionWorker;
  15 |     const technician = mobile
  16 |       ? { employeeNo: DEMO.maintenanceTech2, name: "يوسف كريم" }
  17 |       : { employeeNo: DEMO.maintenanceTech, name: "عمر حسن" };
  18 |     const description = `تسرب زيت ${randomDigits(5)}`;
  19 | 
  20 |     // A production worker reports a fault that stopped the machine.
  21 |     const reporter = await (await browser.newContext()).newPage();
  22 |     await signInAs(reporter, reporterNo);
  23 |     await reporter.goto("/m/faults/new");
> 24 |     await reporter.getByLabel("الآلة").selectOption({ index: 1 });
     |                                        ^ Error: locator.selectOption: Error: strict mode violation: getByLabel('الآلة') resolved to 2 elements:
  25 |     await reporter.getByLabel("ما المشكلة؟").fill(description);
  26 |     await reporter.getByLabel("الآلة متوقفة عن العمل بسبب هذا العطل").check();
  27 |     await reporter.getByRole("button", { name: "إرسال البلاغ" }).click();
  28 |     await expect(
  29 |       reporter.getByText("وصل بلاغك إلى مدير الصيانة"),
  30 |     ).toBeVisible();
  31 |     const faultId = new URL(reporter.url()).pathname.split("/").pop() ?? "";
  32 | 
  33 |     // The general manager can see it but cannot assign the repair.
  34 |     const gm = await (await browser.newContext()).newPage();
  35 |     await signInAs(gm, DEMO.generalManager);
  36 |     await gm.goto(`/admin/maintenance/faults/${faultId}`);
  37 |     await expect(gm.getByText(description)).toBeVisible();
  38 |     await expect(gm.getByRole("button", { name: "إسناد الإصلاح" })).toHaveCount(
  39 |       0,
  40 |     );
  41 | 
  42 |     // The maintenance manager assigns the repair.
  43 |     const manager = await (await browser.newContext()).newPage();
  44 |     await signInAs(manager, DEMO.maintenanceManager);
  45 |     await manager.goto(`/admin/maintenance/faults/${faultId}`);
  46 |     await manager.getByLabel("الموظف").selectOption({ label: technician.name });
  47 |     await manager.getByRole("button", { name: "إسناد الإصلاح" }).click();
  48 |     await expect(manager).toHaveURL(/\/admin\/tasks\/[0-9a-f-]+\?created=1/);
  49 |     const taskId = new URL(manager.url()).pathname.split("/").pop() ?? "";
  50 | 
  51 |     // The technician repairs and hands in; the manager approves.
  52 |     const tech = await (await browser.newContext()).newPage();
  53 |     await signInAs(tech, technician.employeeNo);
  54 |     await tech.goto(`/m/tasks/${taskId}`);
  55 |     await tech.getByRole("button", { name: "بدء التنفيذ" }).click();
  56 |     await tech.getByLabel("ملاحظة للمدير (اختياري)").fill("غيّرت الحشوة");
  57 |     await tech
  58 |       .getByRole("button", { name: "تم الإنجاز: أرسل للاعتماد" })
  59 |       .click();
  60 |     await expect(tech.getByText("بانتظار اعتماد المدير")).toBeVisible();
  61 | 
  62 |     await manager.goto(`/admin/tasks/${taskId}`);
  63 |     await manager.getByRole("button", { name: "اعتماد المهمة" }).click();
  64 |     await expect(manager.getByText("مكتملة").first()).toBeVisible();
  65 | 
  66 |     // The reporter sees the fault fixed, with the technician's note.
  67 |     await reporter.goto(`/m/faults/${faultId}`);
  68 |     await expect(reporter.getByText("تم الإصلاح").first()).toBeVisible();
  69 |     await expect(reporter.getByText("غيّرت الحشوة").first()).toBeVisible();
  70 |   });
  71 | });
  72 | 
```
