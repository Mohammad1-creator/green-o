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
- generic [active] [ref=e1]:
  - status [ref=e2]: "بيئة محلية: البيانات هنا تجريبية وليست بيانات المصنع الحقيقية"
  - generic [ref=e3]:
    - banner [ref=e4]:
      - generic [ref=e5]: المصنع
      - link "الإشعارات" [ref=e7] [cursor=pointer]:
        - /url: /m/notifications
    - main [ref=e11]:
      - generic [ref=e12]:
        - heading "تسجيل مخالفة سلامة" [level=1] [ref=e13]
        - paragraph [ref=e14]: يصل إشعار للموظف ولمدير قسمه، ويستطيع الموظف قبولها أو الاعتراض عليها.
        - generic [ref=e16]:
          - group [ref=e17]:
            - generic [ref=e18]: الموظف
            - combobox "الموظف" [ref=e20]:
              - option "اختر الموظف" [selected]
              - option "حسن جواد"
              - option "علي محمود"
              - option "ليلى ناصر"
              - option "منى سالم"
              - option "نادية فؤاد"
              - option "رائد الحسيني"
              - option "خالد العلي"
              - option "عمر حسن"
              - option "موظف اختبار جديد"
              - option "موظف اختبار جديد"
              - option "يوسف كريم"
              - option "المبرمج"
              - option "سارة الأحمد"
              - option "اختبار 646911255"
              - option "اختبار 924785366"
              - option "اختبار 962738782"
              - option "اختبار 687042292"
              - option "اختبار 550756186"
              - option "اختبار 620913608"
              - option "اختبار 923722329"
          - group [ref=e21]:
            - generic [ref=e22]: نوع المخالفة
            - combobox "نوع المخالفة" [ref=e24]:
              - option "اختر النوع" [selected]
              - option "التدخين في منطقة محظورة · عالية · خصم 25"
              - option "تشغيل آلة دون حاجز الحماية · خطيرة جداً · خصم 50"
              - option "عدم ارتداء الخوذة · متوسطة · خصم 10"
              - option "عدم ارتداء القفازات · منخفضة · خصم 5"
          - group [ref=e25]:
            - generic [ref=e26]: ماذا حدث؟
            - textbox "ماذا حدث؟" [ref=e27]
          - group [ref=e28]:
            - generic [ref=e29]: المكان (اختياري)
            - textbox "المكان (اختياري)" [ref=e30]
          - group [ref=e31]:
            - generic [ref=e32]: وقت المخالفة
            - textbox "وقت المخالفة" [ref=e33]: 2026-11-23T23:48
            - paragraph [ref=e34]: بتوقيت المصنع، خلال آخر 30 يوماً.
          - button "تسجيل المخالفة" [ref=e35]
    - navigation "التنقل" [ref=e36]:
      - list [ref=e37]:
        - listitem [ref=e38]:
          - link "مهامي" [ref=e39] [cursor=pointer]:
            - /url: /m
        - listitem [ref=e43]:
          - link "الأعطال" [ref=e44] [cursor=pointer]:
            - /url: /m/faults
        - listitem [ref=e47]:
          - link "السلامة" [ref=e48] [cursor=pointer]:
            - /url: /m/violations
        - listitem [ref=e51]:
          - link "حسابي" [ref=e52] [cursor=pointer]:
            - /url: /m/account
  - region "Notifications alt+T"
  - alert [ref=e56]: تسجيل مخالفة · نظام إدارة المصنع
```
