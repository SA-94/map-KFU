/* complaint-worker.js — وسيط إرسال الشكاوى إلى تيليجرام (Cloudflare Worker)
   ─────────────────────────────────────────────────────────────────────
   لماذا؟ توكن البوت لا يجوز أن يصل للمتصفح: أي زائر يقرأ ملفات الموقع
   كان يستطيع التحكم بالبوت وإعادة توجيه رسائل الشكاوى (بأرقام الطلاب).
   هنا يبقى التوكن سراً على الخادم، والموقع يرسل النموذج فقط.

   الأسرار والمتغيرات (من لوحة Cloudflare أو wrangler):
     BOT_TOKEN        توكن البوت الجديد من BotFather   (secret)
     CHAT_ID          رقم المحادثة التي تستقبل الشكاوى  (secret)
     ALLOWED_ORIGINS  عناوين الموقع المسموح لها، مفصولة بفاصلة
                      مثال: https://sa-94.github.io,http://localhost:8000
*/

const MAX_PHOTO_BYTES = 5 * 1024 * 1024; // 5MB
const MAX_MSG_CHARS   = 2000;

function corsHeaders(origin){
  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Max-Age': '86400',
    'Vary': 'Origin'
  };
}

function json(body, status, headers){
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8', ...headers }
  });
}

function field(form, name){
  const v = form.get(name);
  return typeof v === 'string' ? v.trim() : '';
}

export default {
  async fetch(request, env){
    const origin  = request.headers.get('Origin') || '';
    const allowed = String(env.ALLOWED_ORIGINS || '').split(',').map(s => s.trim()).filter(Boolean);
    if(!allowed.includes(origin)){
      return json({ ok: false, error: 'origin غير مسموح' }, 403, {});
    }
    const cors = corsHeaders(origin);

    if(request.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });
    if(request.method !== 'POST')    return json({ ok: false, error: 'POST فقط' }, 405, cors);
    if(!env.BOT_TOKEN || !env.CHAT_ID){
      return json({ ok: false, error: 'الخدمة غير مهيأة' }, 500, cors);
    }

    let form;
    try { form = await request.formData(); }
    catch { return json({ ok: false, error: 'بيانات غير صالحة' }, 400, cors); }

    const name  = field(form, 'name');
    const uni   = field(form, 'uni');
    const phone = field(form, 'phone');
    const msg   = field(form, 'msg');
    const photo = form.get('photo');

    // نفس تحقق الواجهة — لا نثق بالمتصفح
    if(!name || name.length > 80 || !/^[؀-ۿ\s]+$/.test(name)){
      return json({ ok: false, error: 'الاسم يجب أن يكون بالعربي فقط' }, 400, cors);
    }
    if(!/^\d{4,20}$/.test(uni))       return json({ ok: false, error: 'رقم جامعي غير صالح' }, 400, cors);
    if(!/^(05|5)\d{8}$/.test(phone))  return json({ ok: false, error: 'رقم جوال غير صالح' }, 400, cors);
    if(msg.length > MAX_MSG_CHARS)    return json({ ok: false, error: 'النص طويل جداً' }, 400, cors);

    const hasPhoto = photo && typeof photo === 'object' && photo.size > 0;
    if(hasPhoto){
      if(!String(photo.type).startsWith('image/')) return json({ ok: false, error: 'المرفق يجب أن يكون صورة' }, 400, cors);
      if(photo.size > MAX_PHOTO_BYTES)             return json({ ok: false, error: 'الصورة أكبر من 5MB' }, 400, cors);
    }

    const lines = [
      '✉️ تواصل معنا / رفع اقتراح',
      '─'.repeat(30),
      `👤 الاسم: ${name}`,
      `🎓 الرقم الجامعي: ${uni}`,
      `📱 الجوال: ${phone}`
    ];
    if(msg) lines.push('', '💬 المحتوى:', msg);
    lines.push('', `🗓️ التاريخ: ${new Date().toLocaleString('ar-SA', { timeZone: 'Asia/Riyadh' })}`);
    lines.push('📍 المرسل عبر: خريطة القاعات - كلية العلوم الزراعية');
    const text = lines.join('\n');

    const api = `https://api.telegram.org/bot${env.BOT_TOKEN}`;
    let tgRes;
    if(hasPhoto){
      const out = new FormData();
      out.append('chat_id', env.CHAT_ID);
      out.append('photo', photo, photo.name || 'photo.jpg');
      // تعليق الصورة في تيليجرام محدود بـ 1024 حرفاً
      out.append('caption', text.slice(0, 1024));
      tgRes = await fetch(`${api}/sendPhoto`, { method: 'POST', body: out });
      // لو قُصّ التعليق، أرسل النص كاملاً في رسالة تالية
      if(tgRes.ok && text.length > 1024){
        await fetch(`${api}/sendMessage`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ chat_id: env.CHAT_ID, text })
        });
      }
    } else {
      tgRes = await fetch(`${api}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id: env.CHAT_ID, text })
      });
    }

    const data = await tgRes.json().catch(() => ({}));
    if(!data.ok) return json({ ok: false, error: 'تعذر الإرسال، حاول لاحقاً' }, 502, cors);
    return json({ ok: true }, 200, cors);
  }
};
