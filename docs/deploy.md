# إعداد البيئات والنشر

هذه الخطوات تحتاج حساباتك، وهي مرتبة بالتسلسل. قد تختلف أسماء القوائم قليلاً عن المكتوب هنا.

> **قاعدة:** لا تلصق أي مفتاح سري في المحادثة، ولا في أي ملف داخل المستودع. المفاتيح السرية توضع فقط في لوحات Vercel وGitHub.

## 1. تحويل المستودع إلى خاص (موصى به)

في GitHub: افتح المستودع ← Settings ← General ← أسفل الصفحة (Danger Zone) ← Change visibility ← Make private.

## 2. Docker Desktop

- نزّله من موقع docker.com وثبّته. على Windows يطلب تفعيل WSL 2.
- بعد التثبيت تأكد بالأمر: `docker --version`
- نحتاجه من المرحلة 1 لتشغيل قاعدة بيانات محلية واختبارات الصلاحيات.

## 3. مشروعا Supabase

نوصي بمنظمتين منفصلتين، حتى لا تدفع ثمن مشروع التطوير:

| | الإنتاج | التطوير |
|---|---|---|
| المنظمة (Organization) | `green-o` بخطة Pro | `green-o-dev` بالخطة المجانية |
| المشروع | `green-o-prod` | `green-o-dev` |

لكل مشروع:

1. من supabase.com/dashboard اختر New project.
2. **المنطقة (Region):** اختر أقرب منطقة متاحة إلى موقع المصنع، والمنطقة نفسها للمشروعين. سجّلها لأننا سنضبط Vercel عليها.
3. **كلمة مرور قاعدة البيانات:** أنشئ كلمة قوية واحفظها في مدير كلمات مرور. سنضعها لاحقاً في GitHub Secrets فقط.
4. **Authentication ← Sign In / Providers:**
   - أوقف Allow new users to sign up.
   - في Email: أوقف Confirm email.
   - اجعل الحد الأدنى لطول كلمة المرور 8.
5. من Project Settings ← API Keys انسخ قيمتين عامتين: **Project URL** و**Publishable key**. لا تنسخ المفتاح السري الآن؛ نحتاجه في المرحلة 1.

> إن كانت هناك أنظمة في بلدك تلزم بحفظ بيانات الموظفين داخل البلد، أخبرني قبل الإطلاق لأن ذلك يؤثر على اختيار المنطقة.

## 4. Vercel

خطة Hobby المجانية مخصصة للاستخدام الشخصي غير التجاري. نظام المصنع استخدام تجاري، لذلك يحتاج خطة Pro (يمكن البدء بالفترة التجريبية).

1. من vercel.com اختر Add New ← Project ← Import Git Repository، واختر المستودع `green-o`. اربط حساب GitHub إن طُلب منك.
2. Framework Preset: Next.js (يُكتشف تلقائياً). لا تغيّر أوامر البناء.
3. أضف المتغيرات (Environment Variables). كل متغير يُضاف مرتين: مرة لبيئة **Production** بقيم مشروع الإنتاج، ومرة لبيئة **Preview** بقيم مشروع التطوير:

   | المتغير | Production | Preview |
   |---|---|---|
   | `APP_ENV` | `prod` | `dev` |
   | `NEXT_PUBLIC_SUPABASE_URL` | رابط `green-o-prod` | رابط `green-o-dev` |
   | `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | المفتاح العام لـ `green-o-prod` | المفتاح العام لـ `green-o-dev` |

4. Settings ← Git: تأكد أن Production Branch هو `main`.
5. Settings ← Functions: اجعل منطقة تشغيل الدوال (Function Region) أقرب منطقة إلى منطقة Supabase.
6. اضغط Deploy.

بعد ذلك، كل رفع إلى فرع `dev` يُنشر على رابط ثابت للفرع، بصيغة تشبه:
`green-o-git-dev-<اسم-الفريق>.vercel.app`

روابط Preview محمية افتراضياً بتسجيل الدخول إلى Vercel، فلا يفتحها إلا أعضاء فريقك.

## 5. التحقق

افتح صفحة `/health` في الرابطين:

| الرابط | المتوقع |
|---|---|
| رابط dev | شريط "بيئة التطوير"، وقاعدة البيانات "متصلة" مع معرّف مشروع `green-o-dev` |
| رابط الإنتاج | بلا شريط، وقاعدة البيانات "متصلة" مع معرّف مشروع `green-o-prod` |

## 6. تجهيز قاعدة البيانات (مرة لكل مشروع)

نفّذ ما يلي من **SQL Editor** في لوحة Supabase لكل مشروع:

1. **تطبيق الترحيلات:** يتولاها سير «Deploy» في GitHub Actions (القسم 8). أول تشغيل له ينشئ الجداول، ثم نفّذ الخطوة 2 فوراً.
2. **علامة البيئة:** في مشروع الإنتاج نفّذ:
   ```sql
   update private.environment_marker set env = 'prod';
   ```
   وفي مشروع التطوير:
   ```sql
   update private.environment_marker set env = 'dev';
   ```
   صفحة `/health` تعرض هذه العلامة، وتحذّر بالأحمر إن لم تطابق البيئة.
3. **المفتاح السري:** من Project Settings ← API Keys انسخ **Secret key**، وأضفه في Vercel باسم `SUPABASE_SECRET_KEY` لكل بيئة بقيمة مشروعها، مع تفعيل **Sensitive**.
4. **أول مدير عام:** على جهازك، ضع في `.env.local` رابط المشروع ومفتاحه السري، ثم شغّل:
   ```bash
   npm run bootstrap:admin
   ```
   يسألك عن الاسم ورقم الموظف وكلمة المرور.
5. **بيانات تجريبية (التطوير فقط):** مع `APP_ENV=dev` و`DEV_PROJECT_REF` و`SEED_PASSWORD` في `.env.local`:
   ```bash
   npm run seed:dev
   ```
   السكربت يرفض العمل على أي قاعدة علامتها ليست `local` أو `dev`.

## 7. الإشعارات (Web Push)

1. **مفاتيح VAPID:** على جهازك شغّل:
   ```bash
   npx web-push generate-vapid-keys
   ```
   أنشئ زوجاً مستقلاً لكل بيئة، وأضفه في Vercel:

   | المتغير | القيمة |
   |---|---|
   | `NEXT_PUBLIC_VAPID_PUBLIC_KEY` | Public Key |
   | `VAPID_PRIVATE_KEY` | Private Key (Sensitive) |
   | `VAPID_SUBJECT` | رابط التطبيق، مثل `https://<الرابط>` |
   | `PUSH_DISPATCH_SECRET` | سرّ عشوائي من 32 خانة أو أكثر (Sensitive) |

   لا تغيّر مفاتيح VAPID بعد التشغيل، فتغييرها يُبطل اشتراكات كل الأجهزة.
2. **ربط القاعدة بمسار الإرسال:** في SQL Editor لكل مشروع:
   ```sql
   select public.configure_push_dispatch(
     'https://<رابط-البيئة>/api/push/dispatch',
     '<قيمة PUSH_DISPATCH_SECRET نفسها>'
   );
   ```
   في بيئة التطوير، لأن روابط Preview محمية: من Vercel ← Settings ← Deployment Protection ← **Protection Bypass for Automation** أنشئ سرّاً، ومرّره معاملاً ثالثاً للدالة.
3. **التجربة:** من الجوال افتح `/m/install`، ثبّت التطبيق، فعّل الإشعارات، ثم اضغط «إرسال إشعار تجريبي».

## 8. النشر: الترحيلات أولاً، ثم التطبيق

سير **Deploy** (`.github/workflows/deploy.yml`) يطبّق ترحيلات القاعدة الجديدة **قبل** نشر الكود الذي يحتاجها، ولا يضيف أي بيانات تجريبية:

| الفرع | متى | القاعدة | التطبيق |
|---|---|---|---|
| `dev` | بعد نجاح CI | `green-o-dev` | ينشره Vercel تلقائياً |
| `main` | بعد الدمج، **وبعد موافقتك** | `green-o-prod` | عبر Deploy Hook بعد نجاح الترحيلات |

قبل الترحيل يتأكد السير أن علامة القاعدة (`environment_marker`) تطابق البيئة، فلا يمكن أن يرحّل قاعدة الإنتاج من فرع التطوير.

**الإعداد:**

1. **GitHub ← Settings ← Environments:**
   - `development`: سرّ `DEPLOY_DATABASE_URL` = رابط اتصال `green-o-dev` (Supabase ← Connect ← Session pooler، مع كلمة مرور القاعدة).
   - `production`: فعّل **Required reviewers** واختر نفسك، ثم السرّان `DEPLOY_DATABASE_URL` (رابط `green-o-prod`) و`VERCEL_DEPLOY_HOOK`.
2. **Vercel ← Settings ← Git ← Deploy Hooks:** أنشئ Hook لفرع `main` وضع رابطه في `VERCEL_DEPLOY_HOOK`. الملف `vercel.json` يوقف النشر التلقائي لفرع `main`، فلا يُنشر الإنتاج إلا بعد الترحيلات.
3. **الإطلاق لكل مرحلة:** طلب دمج (Pull Request) من `dev` إلى `main` ← يعمل CI كاملاً ← الدمج بعد موافقتك ← سير Deploy ينتظر موافقتك على `production` ← الترحيلات ← النشر.

حتى تضبط الأسرار، يتخطى السير الترحيل ويكتب تنبيهاً بما ينقص.

## 9. النسخ الاحتياطي

الخطوات في [backup-restore.md](backup-restore.md): مفتاح التشفير، والتخزين الخارجي (R2 أو B2)، وأسرار GitHub، ثم تشغيل تجريبي وتمرين استعادة.

## ما بقي عليك، بالترتيب

1. تحويل المستودع إلى خاص (القسم 1).
2. مشروعا Supabase (القسم 3) وVercel Pro (القسم 4).
3. أسرار سير Deploy (القسم 8)، ثم علامة البيئة والمفتاح السري وأول مدير عام لكل مشروع (القسم 6).
4. مفاتيح VAPID وربط الإشعارات لكل بيئة (القسم 7).
5. النسخ الاحتياطي (القسم 9).
6. قائمة القبول في [acceptance.md](acceptance.md) على بيئة dev، ثم الدمج إلى `main`.
