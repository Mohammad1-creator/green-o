# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: task-collaboration.spec.ts >> working together on a task >> comments, a photo and a reminder
- Location: tests/e2e/task-collaboration.spec.ts:32:3

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
          - link "المستخدمون" [ref=f1e23] [cursor=pointer]:
            - /url: /admin/users
    - generic [ref=f1e29]:
      - banner [ref=f1e30]:
        - generic [ref=f1e31]:
          - generic [ref=f1e32]:
            - generic [ref=f1e33]: منى سالم
            - generic [ref=f1e34]: مدير الإنتاج · الإنتاج
          - link "الإشعارات" [ref=f1e35] [cursor=pointer]:
            - /url: /admin/notifications
          - button "تسجيل الخروج" [ref=f1e40]
      - main [ref=f1e41]:
        - generic [ref=f1e42]:
          - generic [ref=f1e43]:
            - heading "موظف سيُوقف" [level=1] [ref=f1e44]
            - paragraph [ref=f1e45]: موظف · الإنتاج
          - link "العودة للقائمة" [ref=f1e47] [cursor=pointer]:
            - /url: /admin/users
        - status [ref=f1e48]:
          - generic [ref=f1e49]: أُنشئ الحساب. أبلغ الموظف برقمه وكلمة المرور.
        - generic [ref=f1e50]:
          - generic [ref=f1e51]:
            - generic [ref=f1e52]: بيانات الحساب
            - generic [ref=f1e56]:
              - group [ref=f1e57]:
                - generic [ref=f1e58]: الاسم الكامل
                - textbox "الاسم الكامل الاسم الكامل" [ref=f1e59]: موظف سيُوقف
              - group [ref=f1e60]:
                - generic [ref=f1e61]: رقم الموظف
                - textbox "رقم الموظف رقم الموظف" [ref=f1e62]: "62424342"
                - paragraph [ref=f1e63]: يُستخدم لتسجيل الدخول.
              - group [ref=f1e64]:
                - generic [ref=f1e65]: الدور
                - textbox "الدور الدور" [disabled]: موظف
              - group [ref=f1e66]:
                - generic [ref=f1e67]: القسم
                - textbox "القسم القسم" [disabled]: الإنتاج
              - group [ref=f1e68]:
                - generic [ref=f1e69]: الهاتف (اختياري)
                - textbox "الهاتف (اختياري) الهاتف (اختياري)" [ref=f1e70]
              - group [ref=f1e71]:
                - generic [ref=f1e72]: المسمى الوظيفي (اختياري)
                - textbox "المسمى الوظيفي (اختياري) المسمى الوظيفي (اختياري)" [ref=f1e73]
              - group [ref=f1e74]:
                - generic [ref=f1e75]: ملاحظات (اختياري)
                - textbox "ملاحظات (اختياري)" [ref=f1e76]
              - button "حفظ التغييرات" [ref=f1e78]
          - generic [ref=f1e79]:
            - generic [ref=f1e80]:
              - generic [ref=f1e81]: حالة الحساب
              - generic [ref=f1e84]:
                - paragraph [ref=f1e85]: الحساب موقوف ولا يستطيع صاحبه الدخول.
                - status [ref=f1e86]:
                  - generic [ref=f1e87]: أُوقف الحساب
                - button "تفعيل الحساب" [ref=f1e88]
            - generic [ref=f1e89]:
              - generic [ref=f1e90]: كلمة المرور
              - generic [ref=f1e93]:
                - group [ref=f1e94]:
                  - generic [ref=f1e95]: كلمة مرور جديدة
                  - generic [ref=f1e96]:
                    - textbox "كلمة مرور جديدة" [ref=f1e97]
                    - button "اقتراح" [ref=f1e98]
                - button "تغيير كلمة المرور" [ref=f1e99]
  - region "Notifications alt+T"
  - alert [ref=f1e100]: بيانات المستخدم · نظام إدارة المصنع
```
