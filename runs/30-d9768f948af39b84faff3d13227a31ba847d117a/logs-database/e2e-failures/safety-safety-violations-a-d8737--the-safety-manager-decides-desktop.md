# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: safety.spec.ts >> safety violations >> a supervisor records a violation, the employee objects, the safety manager decides
- Location: tests/e2e/safety.spec.ts:10:3

# Error details

```
Test timeout of 30000ms exceeded.
```

# Page snapshot

```yaml
- generic [active] [ref=f1e1]:
  - status [ref=f1e2]: "بيئة محلية: البيانات هنا تجريبية وليست بيانات المصنع الحقيقية"
  - generic [ref=f1e3]:
    - complementary [ref=f1e4]:
      - generic [ref=f1e5]:
        - link "المصنع" [ref=f1e6] [cursor=pointer]:
          - /url: /admin
        - navigation "القائمة الرئيسية" [ref=f1e9]:
          - link "الرئيسية" [ref=f1e10] [cursor=pointer]:
            - /url: /admin
          - link "المهام" [ref=f1e14] [cursor=pointer]:
            - /url: /admin/tasks
          - link "الفرق" [ref=f1e18] [cursor=pointer]:
            - /url: /admin/teams
          - link "بلاغات الأعطال" [ref=f1e23] [cursor=pointer]:
            - /url: /admin/maintenance/faults
          - link "أوامر الإنتاج" [ref=f1e26] [cursor=pointer]:
            - /url: /admin/production/orders
          - link "المنتجات" [ref=f1e29] [cursor=pointer]:
            - /url: /admin/production/products
          - link "إعدادات الإنتاج" [ref=f1e40] [cursor=pointer]:
            - /url: /admin/production/settings
          - link "مخالفات السلامة" [ref=f1e42] [cursor=pointer]:
            - /url: /admin/safety/violations
          - link "التقارير" [ref=f1e45] [cursor=pointer]:
            - /url: /admin/reports
          - link "النقاط" [ref=f1e48] [cursor=pointer]:
            - /url: /admin/points
          - link "المستخدمون" [ref=f1e55] [cursor=pointer]:
            - /url: /admin/users
    - generic [ref=f1e61]:
      - banner [ref=f1e62]:
        - generic [ref=f1e63]:
          - generic [ref=f1e64]:
            - generic [ref=f1e65]: منى سالم
            - generic [ref=f1e66]: مدير الإنتاج · الإنتاج
          - link "الإشعارات" [ref=f1e67] [cursor=pointer]:
            - /url: /admin/notifications
          - button "تسجيل الخروج" [ref=f1e72]
      - main [ref=f1e73]:
        - generic [ref=f1e74]:
          - generic [ref=f1e75]:
            - heading "موظف سيُوقف" [level=1] [ref=f1e76]
            - paragraph [ref=f1e77]: موظف · الإنتاج
          - link "العودة للقائمة" [ref=f1e79] [cursor=pointer]:
            - /url: /admin/users
        - status [ref=f1e80]:
          - generic [ref=f1e81]: أُنشئ الحساب. أبلغ الموظف برقمه وكلمة المرور.
        - generic [ref=f1e82]:
          - generic [ref=f1e83]:
            - generic [ref=f1e84]: بيانات الحساب
            - generic [ref=f1e88]:
              - group [ref=f1e89]:
                - generic [ref=f1e90]: الاسم الكامل
                - textbox "الاسم الكامل الاسم الكامل" [ref=f1e91]: موظف سيُوقف
              - group [ref=f1e92]:
                - generic [ref=f1e93]: رقم الموظف
                - textbox "رقم الموظف رقم الموظف" [ref=f1e94]: "61263743"
                - paragraph [ref=f1e95]: يُستخدم لتسجيل الدخول.
              - group [ref=f1e96]:
                - generic [ref=f1e97]: الدور
                - textbox "الدور الدور" [disabled]: موظف
              - group [ref=f1e98]:
                - generic [ref=f1e99]: القسم
                - textbox "القسم القسم" [disabled]: الإنتاج
              - group [ref=f1e100]:
                - generic [ref=f1e101]: الهاتف (اختياري)
                - textbox "الهاتف (اختياري) الهاتف (اختياري)" [ref=f1e102]
              - group [ref=f1e103]:
                - generic [ref=f1e104]: المسمى الوظيفي (اختياري)
                - textbox "المسمى الوظيفي (اختياري) المسمى الوظيفي (اختياري)" [ref=f1e105]
              - group [ref=f1e106]:
                - generic [ref=f1e107]: ملاحظات (اختياري)
                - textbox "ملاحظات (اختياري)" [ref=f1e108]
              - button "حفظ التغييرات" [ref=f1e110]
          - generic [ref=f1e111]:
            - generic [ref=f1e112]:
              - generic [ref=f1e113]: حالة الحساب
              - generic [ref=f1e116]:
                - paragraph [ref=f1e117]: الحساب موقوف ولا يستطيع صاحبه الدخول.
                - status [ref=f1e118]:
                  - generic [ref=f1e119]: أُوقف الحساب
                - button "تفعيل الحساب" [ref=f1e120]
            - generic [ref=f1e121]:
              - generic [ref=f1e122]: كلمة المرور
              - generic [ref=f1e125]:
                - group [ref=f1e126]:
                  - generic [ref=f1e127]: كلمة مرور جديدة
                  - generic [ref=f1e128]:
                    - textbox "كلمة مرور جديدة" [ref=f1e129]
                    - button "اقتراح" [ref=f1e130]
                - button "تغيير كلمة المرور" [ref=f1e131]
  - region "Notifications alt+T"
  - alert [ref=f1e132]: بيانات المستخدم · نظام إدارة المصنع
```
