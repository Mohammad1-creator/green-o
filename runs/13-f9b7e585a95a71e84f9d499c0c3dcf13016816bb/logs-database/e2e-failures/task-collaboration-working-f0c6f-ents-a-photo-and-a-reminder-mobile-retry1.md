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
          - generic [ref=f1e11]: خالد العلي
          - generic [ref=f1e12]: مدير الصيانة · الصيانة
        - 'link "الإشعارات: 2 غير مقروء" [ref=f1e13] [cursor=pointer]':
          - /url: /admin/notifications
          - generic [ref=f1e17]: "2"
        - button "تسجيل الخروج" [ref=f1e19]
    - main [ref=f1e20]:
      - generic [ref=f1e21]:
        - generic [ref=f1e22]:
          - heading "تغيير السير 07505" [level=1] [ref=f1e23]
          - paragraph [ref=f1e24]:
            - generic [ref=f1e25]:
              - generic [ref=f1e26]: T-000011
              - generic [ref=f1e27]: · مهمة
              - generic [ref=f1e28]: · الصيانة
        - link "العودة للمهام" [ref=f1e30] [cursor=pointer]:
          - /url: /admin/tasks
      - status [ref=f1e31]:
        - generic [ref=f1e32]: أُنشئت المهمة وأُرسل إشعار للمسند إليهم.
      - generic [ref=f1e33]:
        - generic [ref=f1e34]:
          - generic [ref=f1e35]:
            - generic [ref=f1e36]: جديدة
            - generic [ref=f1e41]:
              - term [ref=f1e42]: الاستحقاق
              - definition [ref=f1e43]: بلا موعد
              - term [ref=f1e44]: أنشأها
              - definition [ref=f1e45]: خالد العلي · 11 نوفمبر 2026 في 12:50 ص
          - generic [ref=f1e46]:
            - generic [ref=f1e47]: المسند إليهم
            - list "المسند إليهم" [ref=f1e50]:
              - listitem [ref=f1e51]:
                - generic [ref=f1e52]: يوسف كريم
                - generic [ref=f1e53]: لم يشاهدها بعد · لم يستلمها
          - generic [ref=f1e54]:
            - generic [ref=f1e55]: الصور
            - generic [ref=f1e57]:
              - paragraph [ref=f1e58]: لا توجد صور.
              - generic [ref=f1e59]:
                - button "اختيار صورة" [ref=f1e60]
                - button "إرفاق صورة" [ref=f1e61]
          - generic [ref=f1e62]:
            - generic [ref=f1e63]: التعليقات
            - generic [ref=f1e65]:
              - paragraph [ref=f1e66]: لا توجد تعليقات.
              - generic [ref=f1e67]:
                - group [ref=f1e68]:
                  - generic [ref=f1e69]: تعليق جديد
                  - textbox "تعليق جديد" [ref=f1e70]
                - button "إضافة التعليق" [ref=f1e71]
          - generic [ref=f1e72]:
            - generic [ref=f1e73]: السجل
            - list "سجل المهمة" [ref=f1e76]:
              - listitem [ref=f1e77]:
                - paragraph [ref=f1e78]: أُنشئت المهمة
                - paragraph [ref=f1e79]: خالد العلي · 11 نوفمبر 2026 في 12:50 ص
        - generic [ref=f1e80]:
          - generic [ref=f1e81]:
            - generic [ref=f1e82]: إجراءات المدير
            - group [ref=f1e86]:
              - generic "إلغاء المهمة" [ref=f1e87] [cursor=pointer]
          - generic [ref=f1e88]:
            - generic [ref=f1e89]: تعديل المهمة
            - generic [ref=f1e93]:
              - group [ref=f1e94]:
                - generic [ref=f1e95]: العنوان
                - textbox "العنوان العنوان" [ref=f1e96]: تغيير السير 07505
              - group [ref=f1e97]:
                - generic [ref=f1e98]: التفاصيل (اختياري)
                - textbox "التفاصيل (اختياري) التفاصيل (اختياري)" [ref=f1e99]
              - group [ref=f1e100]:
                - generic [ref=f1e101]: موعد الاستحقاق (اختياري)
                - textbox "موعد الاستحقاق (اختياري) موعد الاستحقاق (اختياري)" [ref=f1e102]
                - paragraph [ref=f1e103]: بتوقيت المصنع. بعده تظهر المهمة «متأخرة» إن لم تُسلَّم.
              - button "حفظ التعديلات" [ref=f1e105]
          - generic [ref=f1e106]:
            - generic [ref=f1e107]: التذكيرات
            - generic [ref=f1e109]:
              - paragraph [ref=f1e110]: لا توجد تذكيرات.
              - group [ref=f1e112]:
                - generic [ref=f1e113]: وقت التذكير (بتوقيت المصنع)
                - generic [ref=f1e114]:
                  - textbox "وقت التذكير (بتوقيت المصنع)" [ref=f1e115]
                  - button "إضافة تذكير" [ref=f1e116]
          - generic [ref=f1e117]:
            - generic [ref=f1e118]: تغيير الإسناد
            - generic [ref=f1e121]:
              - group "الإسناد إلى" [ref=f1e122]:
                - generic [ref=f1e124]:
                  - generic [ref=f1e125]:
                    - radio "موظف" [checked] [ref=f1e126]
                    - text: موظف
                  - generic [ref=f1e127]:
                    - radio "فريق" [ref=f1e128]
                    - text: فريق
                - group [ref=f1e129]:
                  - generic [ref=f1e130]: الموظف
                  - combobox "الموظف الموظف" [ref=f1e132]:
                    - option "اختر الموظف" [selected]
                    - option "خالد العلي"
                    - option "عمر حسن"
                    - option "موظف اختبار جديد"
                    - option "موظف اختبار جديد"
                    - option "يوسف كريم"
              - button "تغيير الإسناد" [ref=f1e133]
  - region "Notifications alt+T"
  - alert [ref=f1e134]: مهمة جديدة
```
