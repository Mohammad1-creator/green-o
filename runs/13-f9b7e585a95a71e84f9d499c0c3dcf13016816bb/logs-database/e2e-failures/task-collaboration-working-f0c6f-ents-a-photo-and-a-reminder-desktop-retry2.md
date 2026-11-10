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
            - generic [ref=f1e33]: خالد العلي
            - generic [ref=f1e34]: مدير الصيانة · الصيانة
          - 'link "الإشعارات: 2 غير مقروء" [ref=f1e35] [cursor=pointer]':
            - /url: /admin/notifications
            - generic [ref=f1e39]: "2"
          - button "تسجيل الخروج" [ref=f1e41]
      - main [ref=f1e42]:
        - generic [ref=f1e43]:
          - generic [ref=f1e44]:
            - heading "تغيير السير 96325" [level=1] [ref=f1e45]
            - paragraph [ref=f1e46]:
              - generic [ref=f1e47]:
                - generic [ref=f1e48]: T-000012
                - generic [ref=f1e49]: · مهمة
                - generic [ref=f1e50]: · الصيانة
          - link "العودة للمهام" [ref=f1e52] [cursor=pointer]:
            - /url: /admin/tasks
        - status [ref=f1e53]:
          - generic [ref=f1e54]: أُنشئت المهمة وأُرسل إشعار للمسند إليهم.
        - generic [ref=f1e55]:
          - generic [ref=f1e56]:
            - generic [ref=f1e57]:
              - generic [ref=f1e58]: جديدة
              - generic [ref=f1e63]:
                - term [ref=f1e64]: الاستحقاق
                - definition [ref=f1e65]: بلا موعد
                - term [ref=f1e66]: أنشأها
                - definition [ref=f1e67]: خالد العلي · 11 نوفمبر 2026 في 12:50 ص
            - generic [ref=f1e68]:
              - generic [ref=f1e69]: المسند إليهم
              - list "المسند إليهم" [ref=f1e72]:
                - listitem [ref=f1e73]:
                  - generic [ref=f1e74]: عمر حسن
                  - generic [ref=f1e75]: لم يشاهدها بعد · لم يستلمها
            - generic [ref=f1e76]:
              - generic [ref=f1e77]: الصور
              - generic [ref=f1e79]:
                - paragraph [ref=f1e80]: لا توجد صور.
                - generic [ref=f1e81]:
                  - button "اختيار صورة" [ref=f1e82]
                  - button "إرفاق صورة" [ref=f1e83]
            - generic [ref=f1e84]:
              - generic [ref=f1e85]: التعليقات
              - generic [ref=f1e87]:
                - paragraph [ref=f1e88]: لا توجد تعليقات.
                - generic [ref=f1e89]:
                  - group [ref=f1e90]:
                    - generic [ref=f1e91]: تعليق جديد
                    - textbox "تعليق جديد" [ref=f1e92]
                  - button "إضافة التعليق" [ref=f1e93]
            - generic [ref=f1e94]:
              - generic [ref=f1e95]: السجل
              - list "سجل المهمة" [ref=f1e98]:
                - listitem [ref=f1e99]:
                  - paragraph [ref=f1e100]: أُنشئت المهمة
                  - paragraph [ref=f1e101]: خالد العلي · 11 نوفمبر 2026 في 12:50 ص
          - generic [ref=f1e102]:
            - generic [ref=f1e103]:
              - generic [ref=f1e104]: إجراءات المدير
              - group [ref=f1e108]:
                - generic "إلغاء المهمة" [ref=f1e109] [cursor=pointer]
            - generic [ref=f1e110]:
              - generic [ref=f1e111]: تعديل المهمة
              - generic [ref=f1e115]:
                - group [ref=f1e116]:
                  - generic [ref=f1e117]: العنوان
                  - textbox "العنوان العنوان" [ref=f1e118]: تغيير السير 96325
                - group [ref=f1e119]:
                  - generic [ref=f1e120]: التفاصيل (اختياري)
                  - textbox "التفاصيل (اختياري) التفاصيل (اختياري)" [ref=f1e121]
                - group [ref=f1e122]:
                  - generic [ref=f1e123]: موعد الاستحقاق (اختياري)
                  - textbox "موعد الاستحقاق (اختياري) موعد الاستحقاق (اختياري)" [ref=f1e124]
                  - paragraph [ref=f1e125]: بتوقيت المصنع. بعده تظهر المهمة «متأخرة» إن لم تُسلَّم.
                - button "حفظ التعديلات" [ref=f1e127]
            - generic [ref=f1e128]:
              - generic [ref=f1e129]: التذكيرات
              - generic [ref=f1e131]:
                - paragraph [ref=f1e132]: لا توجد تذكيرات.
                - group [ref=f1e134]:
                  - generic [ref=f1e135]: وقت التذكير (بتوقيت المصنع)
                  - generic [ref=f1e136]:
                    - textbox "وقت التذكير (بتوقيت المصنع)" [ref=f1e137]
                    - button "إضافة تذكير" [ref=f1e138]
            - generic [ref=f1e139]:
              - generic [ref=f1e140]: تغيير الإسناد
              - generic [ref=f1e143]:
                - group "الإسناد إلى" [ref=f1e144]:
                  - generic [ref=f1e146]:
                    - generic [ref=f1e147]:
                      - radio "موظف" [checked] [ref=f1e148]
                      - text: موظف
                    - generic [ref=f1e149]:
                      - radio "فريق" [ref=f1e150]
                      - text: فريق
                  - group [ref=f1e151]:
                    - generic [ref=f1e152]: الموظف
                    - combobox "الموظف الموظف" [ref=f1e154]:
                      - option "اختر الموظف" [selected]
                      - option "خالد العلي"
                      - option "عمر حسن"
                      - option "موظف اختبار جديد"
                      - option "موظف اختبار جديد"
                      - option "يوسف كريم"
                - button "تغيير الإسناد" [ref=f1e155]
  - region "Notifications alt+T"
  - alert [ref=f1e156]: مهمة جديدة
```
