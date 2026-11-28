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
  - generic [ref=f1e4]:
    - banner [ref=f1e5]:
      - generic [ref=f1e6]:
        - button "فتح القائمة" [ref=f1e7]
        - link [ref=f1e8] [cursor=pointer]:
          - /url: /admin
          - img "Green O" [ref=f1e9]
      - generic [ref=f1e10]:
        - generic [ref=f1e11]:
          - generic [ref=f1e12]: منى سالم
          - generic [ref=f1e13]: مدير الإنتاج · الإنتاج
        - link "الإشعارات" [ref=f1e14] [cursor=pointer]:
          - /url: /admin/notifications
        - button "تسجيل الخروج" [ref=f1e19]
    - main [ref=f1e20]:
      - generic [ref=f1e21]:
        - generic [ref=f1e22]:
          - heading "موظف سيُوقف" [level=1] [ref=f1e23]
          - paragraph [ref=f1e24]: موظف · الإنتاج
        - link "العودة للقائمة" [ref=f1e26] [cursor=pointer]:
          - /url: /admin/users
      - status [ref=f1e27]:
        - generic [ref=f1e28]: أُنشئ الحساب. أبلغ الموظف برقمه وكلمة المرور.
      - generic [ref=f1e29]:
        - generic [ref=f1e30]:
          - generic [ref=f1e31]: بيانات الحساب
          - generic [ref=f1e35]:
            - group [ref=f1e36]:
              - generic [ref=f1e37]: الاسم الكامل
              - textbox "الاسم الكامل الاسم الكامل" [ref=f1e38]: موظف سيُوقف
            - group [ref=f1e39]:
              - generic [ref=f1e40]: رقم الموظف
              - textbox "رقم الموظف رقم الموظف" [ref=f1e41]: "68589084"
              - paragraph [ref=f1e42]: يُستخدم لتسجيل الدخول.
            - group [ref=f1e43]:
              - generic [ref=f1e44]: الدور
              - textbox "الدور الدور" [disabled]: موظف
            - group [ref=f1e45]:
              - generic [ref=f1e46]: القسم
              - textbox "القسم القسم" [disabled]: الإنتاج
            - group [ref=f1e47]:
              - generic [ref=f1e48]: الهاتف (اختياري)
              - textbox "الهاتف (اختياري) الهاتف (اختياري)" [ref=f1e49]
            - group [ref=f1e50]:
              - generic [ref=f1e51]: المسمى الوظيفي (اختياري)
              - textbox "المسمى الوظيفي (اختياري) المسمى الوظيفي (اختياري)" [ref=f1e52]
            - group [ref=f1e53]:
              - generic [ref=f1e54]: ملاحظات (اختياري)
              - textbox "ملاحظات (اختياري)" [ref=f1e55]
            - button "حفظ التغييرات" [ref=f1e57]
        - generic [ref=f1e58]:
          - generic [ref=f1e59]:
            - generic [ref=f1e60]: حالة الحساب
            - generic [ref=f1e63]:
              - paragraph [ref=f1e64]: الحساب موقوف ولا يستطيع صاحبه الدخول.
              - status [ref=f1e65]:
                - generic [ref=f1e66]: أُوقف الحساب
              - button "تفعيل الحساب" [ref=f1e67]
          - generic [ref=f1e68]:
            - generic [ref=f1e69]: كلمة المرور
            - generic [ref=f1e72]:
              - group [ref=f1e73]:
                - generic [ref=f1e74]: كلمة مرور جديدة
                - generic [ref=f1e75]:
                  - textbox "كلمة مرور جديدة" [ref=f1e76]
                  - button "اقتراح" [ref=f1e77]
              - button "تغيير كلمة المرور" [ref=f1e78]
  - region "Notifications alt+T"
  - alert [ref=f1e79]: بيانات المستخدم · نظام إدارة المصنع
```
