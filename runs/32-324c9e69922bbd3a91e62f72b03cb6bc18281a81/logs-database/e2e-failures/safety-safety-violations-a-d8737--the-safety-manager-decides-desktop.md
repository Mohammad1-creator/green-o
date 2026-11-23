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
- generic [active] [ref=f2e1]:
  - status [ref=f2e2]: "بيئة محلية: البيانات هنا تجريبية وليست بيانات المصنع الحقيقية"
  - generic [ref=f2e3]:
    - banner [ref=f2e4]:
      - generic [ref=f2e5]: المصنع
      - 'link "الإشعارات: 2 غير مقروء" [ref=f2e7] [cursor=pointer]':
        - /url: /m/notifications
        - generic [ref=f2e11]: "2"
    - main [ref=f2e12]:
      - generic [ref=f2e13]:
        - generic [ref=f2e14]:
          - paragraph [ref=f2e15]: F-000008
          - heading "مقص الألواح" [level=1] [ref=f2e16]
        - generic [ref=f2e17]:
          - generic [ref=f2e18]:
            - generic [ref=f2e19]: تم الإصلاح
            - generic [ref=f2e23]:
              - paragraph [ref=f2e24]: تسرب زيت 34288
              - generic [ref=f2e25]:
                - term [ref=f2e26]: الآلة
                - definition [ref=f2e27]:
                  - text: مقص الألواح
                  - generic [ref=f2e28]: (M-01)
                - term [ref=f2e29]: المبلِّغ
                - definition [ref=f2e30]: علي محمود · الإنتاج
                - term [ref=f2e31]: الوقت
                - definition [ref=f2e32]: 23 نوفمبر 2026 في 11:37 م
                - term [ref=f2e33]: أُصلح في
                - definition [ref=f2e34]: 23 نوفمبر 2026 في 11:37 م · غيّرت الحشوة
          - generic [ref=f2e35]:
            - generic [ref=f2e36]: الصور
            - paragraph [ref=f2e39]: لا توجد صور.
    - navigation "التنقل" [ref=f2e40]:
      - list [ref=f2e41]:
        - listitem [ref=f2e42]:
          - link "مهامي" [ref=f2e43] [cursor=pointer]:
            - /url: /m
        - listitem [ref=f2e47]:
          - link "الإنتاج" [ref=f2e48] [cursor=pointer]:
            - /url: /m/production
        - listitem [ref=f2e51]:
          - link "الأعطال" [ref=f2e52] [cursor=pointer]:
            - /url: /m/faults
        - listitem [ref=f2e55]:
          - link "حسابي" [ref=f2e56] [cursor=pointer]:
            - /url: /m/account
  - region "Notifications alt+T"
  - alert [ref=f2e60]
```
