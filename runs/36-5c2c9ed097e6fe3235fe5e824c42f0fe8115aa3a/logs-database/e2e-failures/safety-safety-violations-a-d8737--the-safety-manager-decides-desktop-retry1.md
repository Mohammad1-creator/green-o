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
      - link "المصنع" [ref=e5] [cursor=pointer]:
        - /url: /m
        - img "Green O" [ref=e6]
      - link "الإشعارات" [ref=e8] [cursor=pointer]:
        - /url: /m/notifications
    - main [ref=e12]:
      - generic [ref=e13]:
        - heading "تسجيل مخالفة سلامة" [level=1] [ref=e14]
        - paragraph [ref=e15]: يصل إشعار للموظف ولمدير قسمه، ويستطيع الموظف قبولها أو الاعتراض عليها.
        - generic [ref=e17]:
          - group [ref=e18]:
            - generic [ref=e19]: الموظف
            - combobox "الموظف" [ref=e21]:
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
              - option "اختبار 758323857"
              - option "اختبار 813507927"
              - option "اختبار 823351154"
              - option "اختبار 957913107"
              - option "اختبار 543049276"
              - option "اختبار 650770506"
              - option "اختبار 884004330"
          - group [ref=e22]:
            - generic [ref=e23]: نوع المخالفة
            - combobox "نوع المخالفة" [ref=e25]:
              - option "اختر النوع" [selected]
              - option "التدخين في منطقة محظورة · عالية · خصم 25"
              - option "تشغيل آلة دون حاجز الحماية · خطيرة جداً · خصم 50"
              - option "عدم ارتداء الخوذة · متوسطة · خصم 10"
              - option "عدم ارتداء القفازات · منخفضة · خصم 5"
          - group [ref=e26]:
            - generic [ref=e27]: ماذا حدث؟
            - textbox "ماذا حدث؟" [ref=e28]
          - group [ref=e29]:
            - generic [ref=e30]: المكان (اختياري)
            - textbox "المكان (اختياري)" [ref=e31]
          - group [ref=e32]:
            - generic [ref=e33]: وقت المخالفة
            - textbox "وقت المخالفة" [ref=e34]: 2026-11-28T14:38
            - paragraph [ref=e35]: بتوقيت المصنع، خلال آخر 30 يوماً.
          - button "تسجيل المخالفة" [ref=e36]
    - navigation "التنقل" [ref=e37]:
      - list [ref=e38]:
        - listitem [ref=e39]:
          - link "مهامي" [ref=e40] [cursor=pointer]:
            - /url: /m
        - listitem [ref=e44]:
          - link "الأعطال" [ref=e45] [cursor=pointer]:
            - /url: /m/faults
        - listitem [ref=e48]:
          - link "السلامة" [ref=e49] [cursor=pointer]:
            - /url: /m/violations
        - listitem [ref=e52]:
          - link "حسابي" [ref=e53] [cursor=pointer]:
            - /url: /m/account
  - region "Notifications alt+T"
  - alert [ref=e57]: تسجيل مخالفة · نظام إدارة المصنع
```
