/* sw.js — عامل الخدمة: يجعل الخريطة تعمل بدون إنترنت داخل المبنى.
   ارفع رقم النسخة عند أي تعديل على الملفات حتى تصل التحديثات للطلاب. */
/* يجب أن يطابق ASSET_VERSION في js/script.js و?v= في index.html */
const VERSION = '1.1.0';
const CACHE = 'kfu-map-v' + VERSION;

/* الملفات التي تُطلب بوسم نسخة يجب تخزينها بنفس الوسم،
   وإلا خزّنّا عناوين لا يطلبها أحد وتعطّل العمل بدون إنترنت. */
const APP_SHELL = [
  './',
  './index.html',
  './css/style.css?v=' + VERSION,
  './css/sidebar-lux.css?v=' + VERSION,
  './js/dataset.registry.js?v=' + VERSION,
  './js/script.js?v=' + VERSION,
  './data/agri-food/male/rooms.js?v=' + VERSION,
  './data/agri-food/male/doctors.js?v=' + VERSION,
  './data/agri-food/male/paths.rel.js?v=' + VERSION,
  './assets/maps/map-1.png',
  './assets/maps/map-2.png',
  './assets/icon.svg',
  './assets/icons/icon-192.png',
  './assets/icons/icon-512.png',
  './manifest.webmanifest'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE)
      // addAll يفشل كاملاً لو سقط ملف واحد، لذا نخزّن كلاً على حدة
      .then(cache => Promise.all(APP_SHELL.map(url => cache.add(url).catch(() => null))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  const req = event.request;

  // لا نتدخل إطلاقاً في غير GET (إرسال الشكاوى مثلاً) ولا في الطلبات الخارجية
  if (req.method !== 'GET') return;
  if (new URL(req.url).origin !== self.location.origin) return;

  // صفحات HTML: الشبكة أولاً حتى يصل أي تحديث فوراً، والكاش احتياط عند انقطاع الشبكة
  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req)
        .then(res => {
          const copy = res.clone();
          caches.open(CACHE).then(c => c.put(req, copy));
          return res;
        })
        .catch(() => caches.match(req).then(hit => hit || caches.match('./index.html')))
    );
    return;
  }

  // بقية الملفات: الكاش أولاً لأنها ثابتة، مع تحديث الكاش في الخلفية
  event.respondWith(
    caches.match(req).then(hit => {
      const network = fetch(req)
        .then(res => {
          if (res && res.status === 200) {
            const copy = res.clone();
            caches.open(CACHE).then(c => c.put(req, copy));
          }
          return res;
        })
        .catch(() => hit);
      return hit || network;
    })
  );
});
