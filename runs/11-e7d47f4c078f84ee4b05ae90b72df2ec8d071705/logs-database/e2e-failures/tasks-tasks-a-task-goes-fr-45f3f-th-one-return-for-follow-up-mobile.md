# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: tasks.spec.ts >> tasks >> a task goes from creation to approval, with one return for follow-up
- Location: tests/e2e/tasks.spec.ts:10:3

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: getByText('أُنشئت المهمة')
Expected: visible
Error: strict mode violation: getByText('أُنشئت المهمة') resolved to 2 elements:
    1) <div data-slot="alert-description" class="text-sm text-balance text-muted-foreground md:text-pretty [&_a]:underline [&_a]:underline-offset-3 [&_a]:hover:text-foreground [&_p:not(:last-child)]:mb-4">أُنشئت المهمة وأُرسل إشعار للمسند إليهم.</div> aka getByText('أُنشئت المهمة وأُرسل إشعار للمسند إليهم')
    2) <p class="text-sm font-medium">أُنشئت المهمة</p> aka getByText('أُنشئت المهمة', { exact: true })

Call log:
  - Expect "toBeVisible" getByText('أُنشئت المهمة') with timeout 5000ms
  - waiting for getByText('أُنشئت المهمة')

```

# Page snapshot

```yaml
- generic [active] [ref=f1e1]:
  - status [ref=f1e2]: "بيئة محلية: البيانات هنا تجريبية وليست بيانات المصنع الحقيقية"
  - generic [ref=f1e4]:
    - banner [ref=f1e5]:
      - generic [ref=f1e6]:
        - button "فتح القائمة" [ref=f1e7]
        - generic [ref=f1e8]: المصنع
      - generic [ref=f1e9]:
        - generic [ref=f1e10]:
          - generic [ref=f1e11]: منى سالم
          - generic [ref=f1e12]: مدير الإنتاج · الإنتاج
        - link "الإشعارات" [ref=f1e13] [cursor=pointer]:
          - /url: /admin/notifications
        - button "تسجيل الخروج" [ref=f1e18]
    - main [ref=f1e19]:
      - generic [ref=f1e20]:
        - generic [ref=f1e21]:
          - heading "موظف سيُوقف" [level=1] [ref=f1e22]
          - paragraph [ref=f1e23]: موظف · الإنتاج
        - link "العودة للقائمة" [ref=f1e25] [cursor=pointer]:
          - /url: /admin/users
      - status [ref=f1e26]:
        - generic [ref=f1e27]: أُنشئ الحساب. أبلغ الموظف برقمه وكلمة المرور.
      - generic [ref=f1e28]:
        - generic [ref=f1e29]:
          - generic [ref=f1e30]: بيانات الحساب
          - generic [ref=f1e34]:
            - group [ref=f1e35]:
              - generic [ref=f1e36]: الاسم الكامل
              - textbox "الاسم الكامل الاسم الكامل" [ref=f1e37]: موظف سيُوقف
            - group [ref=f1e38]:
              - generic [ref=f1e39]: رقم الموظف
              - textbox "رقم الموظف رقم الموظف" [ref=f1e40]: "66153336"
              - paragraph [ref=f1e41]: يُستخدم لتسجيل الدخول.
            - group [ref=f1e42]:
              - generic [ref=f1e43]: الدور
              - textbox "الدور الدور" [disabled]: موظف
            - group [ref=f1e44]:
              - generic [ref=f1e45]: القسم
              - textbox "القسم القسم" [disabled]: الإنتاج
            - group [ref=f1e46]:
              - generic [ref=f1e47]: الهاتف (اختياري)
              - textbox "الهاتف (اختياري) الهاتف (اختياري)" [ref=f1e48]
            - group [ref=f1e49]:
              - generic [ref=f1e50]: المسمى الوظيفي (اختياري)
              - textbox "المسمى الوظيفي (اختياري) المسمى الوظيفي (اختياري)" [ref=f1e51]
            - group [ref=f1e52]:
              - generic [ref=f1e53]: ملاحظات (اختياري)
              - textbox "ملاحظات (اختياري)" [ref=f1e54]
            - button "حفظ التغييرات" [ref=f1e56]
        - generic [ref=f1e57]:
          - generic [ref=f1e58]:
            - generic [ref=f1e59]: حالة الحساب
            - generic [ref=f1e62]:
              - paragraph [ref=f1e63]: الحساب موقوف ولا يستطيع صاحبه الدخول.
              - status [ref=f1e64]:
                - generic [ref=f1e65]: أُوقف الحساب
              - button "تفعيل الحساب" [ref=f1e66]
          - generic [ref=f1e67]:
            - generic [ref=f1e68]: كلمة المرور
            - generic [ref=f1e71]:
              - group [ref=f1e72]:
                - generic [ref=f1e73]: كلمة مرور جديدة
                - generic [ref=f1e74]:
                  - textbox "كلمة مرور جديدة" [ref=f1e75]
                  - button "اقتراح" [ref=f1e76]
              - button "تغيير كلمة المرور" [ref=f1e77]
  - region "Notifications alt+T"
  - alert [ref=f1e78]: بيانات المستخدم · نظام إدارة المصنع
```

# Test source

```ts
  1  | import { expect, test } from "@playwright/test";
  2  | 
  3  | import { DEMO, randomDigits, requireSupabase, signIn } from "./helpers";
  4  | 
  5  | test.describe("tasks", () => {
  6  |   test.beforeEach(() => {
  7  |     requireSupabase();
  8  |   });
  9  | 
  10 |   test("a task goes from creation to approval, with one return for follow-up", async ({
  11 |     browser,
  12 |   }, testInfo) => {
  13 |     // Desktop and mobile runs happen together, so each uses its own technician.
  14 |     const technician =
  15 |       testInfo.project.name === "mobile"
  16 |         ? { employeeNo: DEMO.maintenanceTech2, name: "يوسف كريم" }
  17 |         : { employeeNo: DEMO.maintenanceTech, name: "عمر حسن" };
  18 |     const title = `فحص المضخة ${randomDigits(5)}`;
  19 | 
  20 |     // The maintenance manager creates the task.
  21 |     const manager = await (await browser.newContext()).newPage();
  22 |     await signIn(manager, DEMO.maintenanceManager);
  23 |     await expect(manager).toHaveURL(/\/admin$/);
  24 |     await manager.goto("/admin/tasks/new");
  25 |     await manager.getByLabel("العنوان").fill(title);
  26 |     await manager
  27 |       .getByLabel("التفاصيل (اختياري)")
  28 |       .fill("افحص التسريب وغيّر الحشوة إن لزم.");
  29 |     await manager.getByLabel("الموظف").selectOption({ label: technician.name });
  30 |     await manager.getByRole("button", { name: "إنشاء المهمة" }).click();
> 31 |     await expect(manager.getByText("أُنشئت المهمة")).toBeVisible();
     |                                                      ^ Error: expect(locator).toBeVisible() failed
  32 |     const taskUrl = new URL(manager.url());
  33 |     const taskId = taskUrl.pathname.split("/").pop() ?? "";
  34 | 
  35 |     // The technician finds it on the phone, acknowledges, starts and hands it in.
  36 |     const tech = await (await browser.newContext()).newPage();
  37 |     await signIn(tech, technician.employeeNo);
  38 |     await expect(tech).toHaveURL(/\/m$/);
  39 |     await tech.getByRole("link", { name: new RegExp(title) }).click();
  40 |     await expect(tech).toHaveURL(new RegExp(`/m/tasks/${taskId}`));
  41 |     await tech.getByRole("button", { name: "استلمتها" }).click();
  42 |     await expect(tech.getByText("مستلمة").first()).toBeVisible();
  43 |     await tech.getByRole("button", { name: "بدء التنفيذ" }).click();
  44 |     await expect(tech.getByText("قيد التنفيذ").first()).toBeVisible();
  45 |     await tech.getByLabel("ملاحظة للمدير (اختياري)").fill("غيّرت الحشوة.");
  46 |     await tech
  47 |       .getByRole("button", { name: "تم الإنجاز: أرسل للاعتماد" })
  48 |       .click();
  49 |     await expect(tech.getByText("بانتظار اعتماد المدير")).toBeVisible();
  50 | 
  51 |     // The manager sees who saw it, and returns it with a reason.
  52 |     await manager.goto(`/admin/tasks/${taskId}`);
  53 |     await expect(manager.getByText("بانتظار الاعتماد").first()).toBeVisible();
  54 |     await expect(
  55 |       manager.getByRole("list", { name: "المسند إليهم" }),
  56 |     ).toContainText("شاهدها");
  57 |     await manager
  58 |       .getByLabel("أو أعدها للمتابعة مع ذكر السبب")
  59 |       .fill("ما زال هناك تسريب بسيط");
  60 |     await manager.getByRole("button", { name: "إعادة للمتابعة" }).click();
  61 |     await expect(manager.getByText("تحتاج متابعة").first()).toBeVisible();
  62 | 
  63 |     // The technician sees the reason, follows up and hands it in again.
  64 |     await tech.reload();
  65 |     await expect(
  66 |       tech.getByText("ما زال هناك تسريب بسيط").first(),
  67 |     ).toBeVisible();
  68 |     await tech.getByRole("button", { name: "بدء التنفيذ" }).click();
  69 |     await tech
  70 |       .getByRole("button", { name: "تم الإنجاز: أرسل للاعتماد" })
  71 |       .click();
  72 |     await expect(tech.getByText("بانتظار اعتماد المدير")).toBeVisible();
  73 | 
  74 |     // The manager approves.
  75 |     await manager.reload();
  76 |     await manager.getByRole("button", { name: "اعتماد المهمة" }).click();
  77 |     await expect(manager.getByText("مكتملة").first()).toBeVisible();
  78 |     await expect(
  79 |       manager.getByRole("list", { name: "سجل المهمة" }),
  80 |     ).toContainText("من «بانتظار الاعتماد» إلى «مكتملة»");
  81 |   });
  82 | });
  83 | 
```
