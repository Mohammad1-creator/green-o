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
      - link "المصنع" [ref=f2e5] [cursor=pointer]:
        - /url: /m
        - img "Green O" [ref=f2e6]
      - 'link "الإشعارات: 2 غير مقروء" [ref=f2e8] [cursor=pointer]':
        - /url: /m/notifications
        - generic [ref=f2e12]: "2"
    - main [ref=f2e13]:
      - generic [ref=f2e14]:
        - generic [ref=f2e15]:
          - paragraph [ref=f2e16]: F-000008
          - heading "مقص الألواح" [level=1] [ref=f2e17]
        - generic [ref=f2e18]:
          - generic [ref=f2e19]:
            - generic [ref=f2e20]: تم الإصلاح
            - generic [ref=f2e24]:
              - paragraph [ref=f2e25]: تسرب زيت 58777
              - generic [ref=f2e26]:
                - term [ref=f2e27]: الآلة
                - definition [ref=f2e28]:
                  - text: مقص الألواح
                  - generic [ref=f2e29]: (M-01)
                - term [ref=f2e30]: المبلِّغ
                - definition [ref=f2e31]: علي محمود · الإنتاج
                - term [ref=f2e32]: الوقت
                - definition [ref=f2e33]: 28 نوفمبر 2026 في 2:37 م
                - term [ref=f2e34]: أُصلح في
                - definition [ref=f2e35]: 28 نوفمبر 2026 في 2:37 م · غيّرت الحشوة
          - generic [ref=f2e36]:
            - generic [ref=f2e37]: الصور
            - paragraph [ref=f2e40]: لا توجد صور.
    - navigation "التنقل" [ref=f2e41]:
      - list [ref=f2e42]:
        - listitem [ref=f2e43]:
          - link "مهامي" [ref=f2e44] [cursor=pointer]:
            - /url: /m
        - listitem [ref=f2e48]:
          - link "الإنتاج" [ref=f2e49] [cursor=pointer]:
            - /url: /m/production
        - listitem [ref=f2e52]:
          - link "الأعطال" [ref=f2e53] [cursor=pointer]:
            - /url: /m/faults
        - listitem [ref=f2e56]:
          - link "حسابي" [ref=f2e57] [cursor=pointer]:
            - /url: /m/account
  - region "Notifications alt+T"
  - alert [ref=f2e61]
```
