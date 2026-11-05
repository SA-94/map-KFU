# خريطة القاعات — كلية العلوم الزراعية والأغذية

خريطة تفاعلية تساعد الطلاب على الوصول إلى القاعات والمكاتب داخل مبنى الكلية،
مع رسم مسار مرئي من مدخل المبنى حتى باب القاعة، ودعم الدورين عبر التوجيه إلى الدرج.

**تصميم وبرمجة:** الطالب فهد القحطاني — **بإشراف:** الأستاذ منصور البحري.

---

## التشغيل محلياً

يجب تشغيل الموقع عبر خادم (وليس فتح `index.html` مباشرة)، لأن ملفات البيانات
تُحمَّل عند الطلب وتحتاج بروتوكول `http`:

```bash
python -m http.server 8000
```

ثم افتح `http://localhost:8000`.

---

## بنية المشروع

```
index.html                     الصفحة الوحيدة
manifest.webmanifest           إعدادات التثبيت على الجوال
sw.js                          مُلغى: يمسح عامل الخدمة القديم من الجوالات (يُحذف لاحقاً)
css/
  style.css                    التصميم كاملاً (الألوان والخطوط والتخطيط)
  mobile.css                   قواعد الجوال والآيفون فقط (تُحمَّل أخيراً)
js/
  dataset.registry.js          سجل الكليات والأقسام ومسارات بياناتها
  script.js                    كل منطق الخريطة والبحث والنوافذ
assets/
  maps/floor-1.svg             المخطط الجديد للدور الأرضي (رسم متجه 901×988)
  maps/floor-2.svg             المخطط الجديد للدور العلوي
  maps/map-1.png, map-2.png    المخطط القديم — مرجع لتوليد الجديد فقط
tools/
  build_maps.py                يرسم floor-*.svg من جديد: python tools/build_maps.py
  icons/                       أيقونات التطبيق
data/agri-food/male/
  rooms.js                     إحداثيات كل قاعة  { x, y, floor }
  doctors.js                   أسماء أعضاء هيئة التدريس وأرقام مكاتبهم
  paths.rel.js                 نقاط المسار لكل قاعة
```

---

## كيف تُضاف كلية أو شطر جديد

1. أنشئ المجلد `data/<معرّف-الكلية>/<male|female>/` وضع فيه:
   `rooms.js` و`doctors.js` و`paths.rel.js` بنفس صيغة الملفات الحالية.
2. ضع صورتَي المخطط، ثم أضف المدخل في `js/dataset.registry.js`:

```js
const DATASET_OVERRIDES = {
  'agri-food:male': { ... },

  'science:male': {
    enabled: true,
    files: {
      rooms:   'data/science/male/rooms.js',
      doctors: 'data/science/male/doctors.js',
      paths:   'data/science/male/paths.rel.js'
    },
    maps: {
      floor1: 'data/science/male/map-1.png',
      floor2: 'data/science/male/map-2.png'
    },
    // مهم: أبعاد صورة المخطط التي حُسبت عليها الإحداثيات
    imageSize: { width: 1200, height: 900 }
  }
};
```

3. ارفع رقم النسخة (انظر «عند نشر أي تحديث») حتى تصل التحديثات للطلاب.

الكليات غير المفعّلة تظهر في شاشة الترحيب بكلمة **(قريباً)** ولا يمكن الدخول إليها.

---

## صيغة البيانات

**`rooms.js`** — الإحداثيات بالبكسل على صورة المخطط الأصلية:

```js
window.roomCoordinates = {
  '1003': { x: 336.97, y: 826.76, floor: 1 },
  'المسجد': { x: 117.31, y: 746.04, floor: 1 }
};
```

**`paths.rel.js`** — نقاط المسار بنفس نظام الإحداثيات:

```js
window.pathsMap = {
  '1003': [
    { x: 253.99, y: 898.49, type: "start"  },
    { x: 253.09, y: 878.13, type: "middle" },
    { x: 176.15, y: 876.16, type: "end"    }
  ]
};
```

قواعد يجب الالتزام بها:

- مسارات **الدور الأول** تبدأ من مدخل المبنى.
- مسارات **الدور الثاني** تبدأ من نقطة الدرج `'درج'` الموجودة في `rooms.js`.
- كل مفتاح في `paths.rel.js` يجب أن يقابله مفتاح في `rooms.js`.
- **لا تكرّر المفتاح نفسه** داخل الملف؛ التكرار يُلغي النسخة الأولى بصمت.
- آخر نقطة (`end`) يجب أن تكون عند باب القاعة، قريبة من إحداثيات القاعة.

---

## فحص سلامة البيانات

سكربت سريع يكشف المفاتيح الناقصة والمكررة:

```bash
node -e "global.window={};['rooms','paths.rel','doctors'].forEach(f=>require(process.cwd()+'/data/agri-food/male/'+f+'.js'));const r=window.roomCoordinates,p=window.pathsMap,d=window.doctorsData;const rk=new Set(Object.keys(r)),pk=new Set(Object.keys(p));console.log('قاعات:',rk.size,'مسارات:',pk.size);console.log('مسار بلا قاعة:',[...pk].filter(k=>!rk.has(k)).join(', ')||'لا شيء');console.log('قاعة بلا مسار:',[...rk].filter(k=>!pk.has(k)).join(', ')||'لا شيء');console.log('مكتب دكتور غير معروف:',d.filter(x=>!r[String(x.office)]).map(x=>x.office).join(', ')||'لا شيء');"
```

---

## عند نشر أي تحديث

المتصفحات تخزّن الملفات، فبدون تغيير رقم النسخة قد يبقى الطلاب على
النسخة القديمة. غيّر الرقم في مكانين (يجب أن يتطابقا):

| الملف | ما تغيّره |
|---|---|
| `index.html` | كل `?v=1.4.0` في وسوم `<link>` و`<script>` |
| `js/script.js` | ثابت `ASSET_VERSION` |

---

## نموذج الشكاوى (وسيط تيليجرام)

توكن البوت **لا يوضع أبداً** في ملفات الموقع، لأن أي زائر يقرؤها.
الموقع يرسل النموذج إلى وسيط صغير (`worker/complaint-worker.js`) على
Cloudflare Workers (مجاني)، والوسيط وحده يملك التوكن ويرسل لتيليجرام.

خطوات التشغيل مرة واحدة:

1. من [BotFather](https://t.me/BotFather): أرسل `/revoke` واختر البوت لإلغاء
   التوكن القديم المكشوف، ثم انسخ التوكن الجديد.
2. في [dash.cloudflare.com](https://dash.cloudflare.com): **Workers & Pages ← Create ← Worker**،
   سمّه مثلاً `kfu-complaints`، والصق محتوى `worker/complaint-worker.js` ثم **Deploy**.
3. في إعدادات الـ Worker ← **Variables and Secrets** أضف:
   - `BOT_TOKEN` (Secret): التوكن الجديد
   - `CHAT_ID` (Secret): رقم المحادثة التي تستقبل الشكاوى
   - `ALLOWED_ORIGINS` (Text): عنوان موقعك، مثل `https://example.com,http://localhost:8000`
4. ضع رابط الـ Worker في `COMPLAINT_ENDPOINT` أعلى `js/script.js`
   وارفع رقم النسخة.

ما دام `COMPLAINT_ENDPOINT` فارغاً، يظهر للطالب أن الخدمة متوقفة مؤقتاً.

---

## أمور معروفة

- ثلاث قاعات بلا مسار حتى الآن: `1126`، `1173`، `2141`.
- ثمانية مكاتب في `doctors.js` بلا إحداثيات: `1005`–`1010`، `1177`، `3134`
  (تظهر في القائمة رمادية ومعطّلة حتى تُضاف إحداثياتها).
- مسارا `2001` و`2100` أُعيد رسمهما (كانا ينتهيان بعيداً عن القاعة)؛
  يُستحسن التأكد منهما على الطبيعة.
