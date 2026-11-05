/* sw.js — مُلغى. ميزة العمل بدون إنترنت أُزيلت.
   هذا الملف باقٍ عمداً: الجوالات التي ثبّتت النسخة القديمة تطلبه
   للتحديث، فيمسح الكاش القديم ويُلغي تسجيل نفسه ويعيد تحميل الصفحة
   حتى تصلهم النسخة الجديدة من الشبكة مباشرة. لو حُذف (404) بقي
   العامل القديم يخدمهم نسخة قديمة. يمكن حذفه بعد بضعة أشهر. */

self.addEventListener('install', () => self.skipWaiting());

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.map(k => caches.delete(k)));
    await self.registration.unregister();
    const clients = await self.clients.matchAll({ type: 'window' });
    clients.forEach(c => c.navigate(c.url));
  })());
});
