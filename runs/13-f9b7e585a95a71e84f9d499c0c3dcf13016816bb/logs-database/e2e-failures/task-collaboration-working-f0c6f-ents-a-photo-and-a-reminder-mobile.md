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
              - textbox "رقم الموظف رقم الموظف" [ref=f1e40]: "61428782"
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
