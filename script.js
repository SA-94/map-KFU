/* script.js - نسخة محسّنة وفقًا لملاحظاتك */

/* انتبه: لا تغيّر هذا التوكن داخل المشروع الحقيقي؛ يجب تخزينه على السيرفر */
const BOT_TOKEN = '8255886307:AAExiaoy_30ClKvZnkoG9LTRetwYhOED3mg';
const CHAT_ID  = '7821474319';

/* DOM */
const roomInput    = document.getElementById('roomInput');
const roomList     = document.getElementById('roomList');
const mapContainer = document.getElementById('mapContainer');
const mapWrapper   = document.getElementById('mapWrapper');
const mapImage     = document.getElementById('mapImage');
const pathCanvas   = document.getElementById('pathCanvas');
const pin          = document.getElementById('pin');
const animMarker   = document.getElementById('animMarker');
const errorMsg     = document.getElementById('errorMessage');

const tooltip      = document.getElementById('tooltip');
const themeBtn     = document.getElementById('theme-toggle');
const menuToggle   = document.getElementById('menuToggle');
const sidebar      = document.getElementById('sidebar');
const closeSidebar = document.getElementById('closeSidebar');

const searchBtn    = document.getElementById('searchBtn');
const resetBtn     = document.getElementById('resetBtn');

const openHomeInfo = document.getElementById('openHomeInfo');
const homeInfoModal = document.getElementById('homeInfoModal');
const homeBackdrop = document.getElementById('homeBackdrop');
const closeHomeInfo = document.getElementById('closeHomeInfo');
const closeHomeInfoBtn = document.getElementById('closeHomeInfoBtn');
const homeTyping = document.getElementById('homeTyping');

const openEmailModal = document.getElementById('openEmailModal');
const emailModal = document.getElementById('emailModal');
const modalBackdrop = document.getElementById('modalBackdrop');
const closeModal = document.getElementById('closeModal');
const closeModalBtn = document.getElementById('closeModalBtn');
const uniIdInputModal = document.getElementById('uniIdInput');
const genEmailBtn  = document.getElementById('genEmailBtn');
const emailResult  = document.getElementById('emailResult');
const emailOutput  = document.getElementById('emailOutput');
const copyEmailBtn = document.getElementById('copyEmailBtn');
const openMailBtn  = document.getElementById('openMailBtn');

const openComplaintModal = document.getElementById('openComplaintModal');
const complaintModal = document.getElementById('complaintModal');
const complaintBackdrop = document.getElementById('complaintBackdrop');
const closeComplaint = document.getElementById('closeComplaint');
const closeComplaintBtn = document.getElementById('closeComplaintBtn');

const complainName  = document.getElementById('complainName');
const complainUni   = document.getElementById('complainUni');
const complainPhone = document.getElementById('complainPhone');
const complainMsg   = document.getElementById('complainMsg');
const complainFile  = document.getElementById('complainFile');
const sendComplaintBtn = document.getElementById('sendComplaintBtn');
const complaintStatus   = document.getElementById('complaintStatus');

const previewWrap = document.getElementById('previewWrap');
const previewImg = document.getElementById('previewImg');
const removePreview = document.getElementById('removePreview');
const downloadPreview = document.getElementById('downloadPreview');

const openAboutModal = document.getElementById('openAboutModal');
const aboutModal = document.getElementById('aboutModal');
const aboutBackdrop = document.getElementById('aboutBackdrop');
const closeAbout = document.getElementById('closeAbout');
const closeAboutBtn = document.getElementById('closeAboutBtn');

/* أبعاد الخريطة الأصلية */
const IMG_W = 901, IMG_H = 988;

let animId = null;
let lastDrawnPts = null;
let previewObjectUrl = null;

/* بيانات من rooms.js و paths.rel.js */
const roomCoordinates = window.roomCoordinates || {};
const pathsMap        = window.pathsMap || {};

/* ملء datalist */
function populateRoomList(){
  roomList.innerHTML = '';
  Object.keys(roomCoordinates).forEach(rn=>{
    const o = document.createElement('option'); o.value = rn; roomList.appendChild(o);
  });
}

/* tooltip */
function showTooltip(){ tooltip.classList.add('show'); setTimeout(()=>tooltip.classList.remove('show'),4000); }

/* theme */
if(localStorage.getItem('theme')==='dark'){ document.body.classList.add('dark'); themeBtn.textContent='☀️'; }
themeBtn.onclick = ()=>{ document.body.classList.toggle('dark'); const dark = document.body.classList.contains('dark'); themeBtn.textContent = dark ? '☀️':'🌙'; localStorage.setItem('theme', dark ? 'dark' : 'light'); };

/* canvas DPR-aware resize */
function resizeCanvasAndRedraw(){
  const DPR = window.devicePixelRatio || 1;
  const W = mapContainer.clientWidth;
  const H = mapContainer.clientHeight;
  pathCanvas.style.width = W + 'px';
  pathCanvas.style.height = H + 'px';
  pathCanvas.width  = Math.max(1, Math.round(W * DPR));
  pathCanvas.height = Math.max(1, Math.round(H * DPR));
  const ctx = pathCanvas.getContext('2d');
  ctx.setTransform(DPR,0,0,DPR,0,0);
  ctx.clearRect(0,0,W,H);
  if(lastDrawnPts) drawPath(lastDrawnPts);
}

/* draw/clear path */
function drawPath(pts){
  lastDrawnPts = pts.slice();
  const W = mapContainer.clientWidth, H = mapContainer.clientHeight;
  const ctx = pathCanvas.getContext('2d');
  ctx.clearRect(0,0,W,H);
  ctx.save();
  ctx.lineJoin='round'; ctx.lineCap='round';
  ctx.strokeStyle='rgba(14,111,232,0.95)';
  ctx.lineWidth = Math.max(3, Math.min(6, Math.round(W/180)));
  ctx.shadowBlur = 18;
  ctx.shadowColor = 'rgba(14,111,232,0.18)';
  ctx.beginPath();
  pts.forEach((p,i)=> i===0 ? ctx.moveTo(p.x,p.y) : ctx.lineTo(p.x,p.y));
  ctx.stroke();
  ctx.restore();
}
function clearPath(){
  lastDrawnPts = null;
  const ctx = pathCanvas.getContext('2d');
  ctx.clearRect(0,0,mapContainer.clientWidth,mapContainer.clientHeight);
  if(typeof startAnim.stop==='function') startAnim.stop();
}

/* anim: حركة ثابتة، تتلاشى عند النهاية ثم تعيد التشغيل */
function computeSegments(pts){
  const segs = [];
  let total = 0;
  for(let i=0;i<pts.length-1;i++){
    const dx = pts[i+1].x - pts[i].x;
    const dy = pts[i+1].y - pts[i].y;
    const d = Math.hypot(dx, dy) || 0.0001;
    segs.push({ x0: pts[i].x, y0: pts[i].y, dx, dy, len: d });
    total += d;
  }
  return { segs, total };
}

let _animState = { running: false, cancel:false };
function startAnim(pts){
  // pts: array of {x,y} already in wrapper coordinates
  if(!pts || pts.length < 2) return;
  if(_animState.running){
    _animState.cancel = true;
    cancelAnimationFrame(animId);
  }
  _animState = { running: true, cancel:false };
  animMarker.style.display='block';
  animMarker.style.opacity = '1';
  animMarker.style.transition = 'opacity .4s linear, transform .08s linear';
  const { segs, total } = computeSegments(pts);
  const spd = 100; // pixels per second — ثابت وسلس
  let prog = 0;
  let lastTs = 0;

  function frame(ts){
    if(_animState.cancel){ _animState.running=false; lastTs=0; return; }
    if(!lastTs) lastTs = ts;
    const dt = (ts - lastTs) / 1000;
    lastTs = ts;
    prog += spd * dt;
    if(prog >= total){
      // وصل للنهاية؛ ضوء يتلاشى ثم يُعاد التشغيل بعد فترة قصيرة
      animMarker.style.opacity = '0';
      // ضع المؤشر على نقطة النهاية
      const end = pts[pts.length-1];
      animMarker.style.left = `${end.x}px`;
      animMarker.style.top = `${end.y}px`;
      // إيقاف الإطار الحالي
      cancelAnimationFrame(animId);
      _animState.running = false;
      setTimeout(()=>{
        if(_animState.cancel) return;
        // إعادة للبدء ثم تأجيل قليل ثم تشغيل من جديد
        animMarker.style.opacity = '1';
        animMarker.style.display = 'block';
        // إعادة التشغيل: نحسب من البداية
        prog = 0;
        lastTs = 0;
        _animState.running = true;
        animId = requestAnimationFrame(frame);
      }, 900);
      return;
    }

    // اعثر على المقطع الحالي
    let acc = 0, idx = 0;
    while(idx < segs.length && acc + segs[idx].len < prog){ acc += segs[idx].len; idx++; }
    if(idx >= segs.length) idx = segs.length - 1;
    const s = segs[idx];
    const local = Math.max(0, Math.min(1, (prog - acc) / s.len));
    // استخدام easing خفيف للحركة
    const tEase = local; // ثابتة وسلسة (بدون تفريغ مفاجئ)
    const cx = s.x0 + s.dx * tEase;
    const cy = s.y0 + s.dy * tEase;
    animMarker.style.left = `${cx}px`;
    animMarker.style.top  = `${cy}px`;
    const ang = Math.atan2(s.dy, s.dx) * 180 / Math.PI + 90;
    animMarker.style.transform = `translate(-50%,-50%) rotate(${ang}deg)`;
    animId = requestAnimationFrame(frame);
  }

  animId = requestAnimationFrame(frame);
}
startAnim.stop = ()=>{ _animState.cancel = true; cancelAnimationFrame(animId); animMarker.style.display='none'; animMarker.style.opacity = '1'; };

/* تحويل من إحداثيات الخريطة الأصلية إلى الإحداثيات داخل العنصر */
function toWrapperCoords(p){ const W = mapContainer.clientWidth; const H = mapContainer.clientHeight; return { x: (p.x / IMG_W) * W, y: (p.y / IMG_H) * H }; }

/* اظهار رسالة خطأ مؤقتًا */
let errorTimeout = null;
function showError(text){
  if(!errorMsg) return;
  errorMsg.textContent = text;
  errorMsg.style.display = 'block';
  clearTimeout(errorTimeout);
  errorTimeout = setTimeout(()=>{ errorMsg.style.display = 'none'; }, 3200);
}

/* locateRoom */
function locateRoom(){
  const rn = roomInput.value.trim();
  const oldStairsDiv = document.getElementById('stairsQuestion'); if(oldStairsDiv) oldStairsDiv.remove();

  if(!roomCoordinates[rn]){ showError('رقم القاعة غير موجود.'); pin.style.display = animMarker.style.display = 'none'; clearPath(); return; }

  const room = roomCoordinates[rn];
  const W = mapContainer.clientWidth; const H = mapContainer.clientHeight;

  // تعامل مع الدور الثاني (درج)
  if(room && room.floor === 2){
    const stairsPath = pathsMap['درج'];
    mapImage.src = 'map-1.png';
    if(stairsPath){
      const absPts = stairsPath.map(p=>toWrapperCoords(p));
      drawPath(absPts); startAnim(absPts); pin.style.display='none';
    } else if(roomCoordinates['درج']){
      clearPath(); startAnim.stop && startAnim.stop();
      const rc = toWrapperCoords(roomCoordinates['درج']);
      pin.style.left = `${rc.x}px`; pin.style.top = `${rc.y}px`; pin.style.display='block';
    } else { clearPath(); startAnim.stop && startAnim.stop(); pin.style.display='none'; }

    // أضف سؤال الدرج
    const stairsDiv = document.createElement('div'); stairsDiv.id='stairsQuestion'; stairsDiv.style.marginTop='10px';
    stairsDiv.innerHTML = `<span>هل وصلت للدرج؟</span> <button id="stairsYes" class="btn-primary small" style="margin-inline-start:8px">نعم</button> <button id="stairsNo" class="btn-secondary small">لا</button>`;
    document.querySelector('.form-container').appendChild(stairsDiv);

    document.getElementById('stairsYes').onclick = ()=>{
      mapImage.src = 'map-2.png'; stairsDiv.remove();
      if(pathsMap[rn]){ const absPts2 = pathsMap[rn].map(p=>toWrapperCoords(p)); drawPath(absPts2); startAnim(absPts2); }
      const rc = toWrapperCoords(roomCoordinates[rn]); pin.style.left = `${rc.x}px`; pin.style.top = `${rc.y}px`; pin.style.display='block';
      resizeCanvasAndRedraw();
    };
    document.getElementById('stairsNo').onclick = ()=>{ stairsDiv.remove(); clearPath(); startAnim.stop && startAnim.stop(); };
    return;
  }

  // الوضع الطبيعي
  const { x,y,floor } = roomCoordinates[rn];
  mapImage.src = (floor===1) ? 'map-1.png' : 'map-2.png';

  const xAbs = (x / IMG_W) * W;
  const yAbs = (y / IMG_H) * H;
  pin.style.left = `${xAbs}px`; pin.style.top = `${yAbs}px`; pin.style.display='block';

  if(pathsMap[rn]){
    const absPts = pathsMap[rn].map(p=>toWrapperCoords(p));
    drawPath(absPts); startAnim(absPts);
  } else {
    clearPath(); startAnim.stop && startAnim.stop();
  }
}

/* sidebar handlers: يفتح عبر الهامبرغر مع دوران */
menuToggle.onclick = ()=>{
  const expanded = menuToggle.getAttribute('aria-expanded') === 'true';
  menuToggle.setAttribute('aria-expanded', (!expanded).toString());
  const willBeHidden = (!sidebar || sidebar.getAttribute('aria-hidden') === 'false') ? 'true' : 'false';
  sidebar.setAttribute('aria-hidden', willBeHidden);
  // عند الظهور: أضف class صغير لتفعيل الحركة الطيَّة السقوط لو رغبت
};
closeSidebar.onclick = ()=>{ sidebar.setAttribute('aria-hidden','true'); menuToggle.setAttribute('aria-expanded','false'); };
document.addEventListener('click', e=>{
  if(sidebar.getAttribute('aria-hidden') === 'false' && !sidebar.contains(e.target) && !menuToggle.contains(e.target)){
    sidebar.setAttribute('aria-hidden','true'); menuToggle.setAttribute('aria-expanded','false');
  }
});

/* PAN / ZOOM */
let currentScale=1, initialScale=1, currentTrans={x:0,y:0}, initialTrans={x:0,y:0};
let touchStart=[], startDist=0, pinchCenter={x:0,y:0};
function setTransform(){
  const W = mapContainer.clientWidth, H = mapContainer.clientHeight;
  const sW = W * currentScale, sH = H * currentScale;
  currentTrans.x = (sW>W) ? Math.min(0, Math.max(W-sW, currentTrans.x)) : (W-sW)/2;
  currentTrans.y = (sH>H) ? Math.min(0, Math.max(H-sH, currentTrans.y)) : (H-sH)/2;
  mapWrapper.style.transform = `translate(${currentTrans.x}px,${currentTrans.y}px) scale(${currentScale})`;
  resizeCanvasAndRedraw();
}

mapContainer.addEventListener('touchstart', e=>{
  if(e.touches.length===1){ touchStart=[{x:e.touches[0].clientX,y:e.touches[0].clientY}]; initialTrans={...currentTrans}; }
  else if(e.touches.length===2){
    touchStart=[{x:e.touches[0].clientX,y:e.touches[0].clientY},{x:e.touches[1].clientX,y:e.touches[1].clientY}];
    startDist = Math.hypot(touchStart[0].x-touchStart[1].x, touchStart[0].y-touchStart[1].y);
    initialScale = currentScale;
    const rect = mapContainer.getBoundingClientRect();
    pinchCenter = { x: ((e.touches[0].clientX+e.touches[1].clientX)/2) - rect.left, y: ((e.touches[0].clientY+e.touches[1].clientY)/2) - rect.top };
    initialTrans = { ...currentTrans };
  }
});
mapContainer.addEventListener('touchmove', e=>{
  e.preventDefault();
  if(e.touches.length===1 && touchStart.length===1){
    const dx = e.touches[0].clientX - touchStart[0].x;
    const dy = e.touches[0].clientY - touchStart[0].y;
    currentTrans.x = initialTrans.x + dx; currentTrans.y = initialTrans.y + dy; setTransform();
  } else if(e.touches.length===2 && touchStart.length===2){
    const newDist = Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY);
    currentScale = Math.min(Math.max(initialScale * (newDist / startDist), 1), 5);
    currentTrans.x = initialTrans.x - ((currentScale - initialScale)/initialScale) * pinchCenter.x;
    currentTrans.y = initialTrans.y - ((currentScale - initialScale)/initialScale) * pinchCenter.y;
    setTransform();
  }
});
mapContainer.addEventListener('wheel', e=>{
  e.preventDefault();
  const rect = mapContainer.getBoundingClientRect();
  const mx = e.clientX - rect.left, my = e.clientY - rect.top;
  const delta = (e.deltaY<0)? 1.1 : 0.9;
  const newScale = Math.min(Math.max(currentScale * delta, 1), 5);
  currentTrans.x -= (((newScale/currentScale)-1) * mx);
  currentTrans.y -= (((newScale/currentScale)-1) * my);
  currentScale = newScale; setTransform();
});

/* handlers & init */
roomInput.addEventListener('keypress', e=>{ if(e.key==='Enter') locateRoom(); });
window.addEventListener('resize', ()=>{ resizeCanvasAndRedraw(); if(roomInput.value) locateRoom(); });

window.onload = ()=>{
  populateRoomList(); showTooltip();

  searchBtn.onclick = locateRoom;
  resetBtn.onclick  = ()=>{ mapImage.src='map-1.png'; pin.style.display=animMarker.style.display='none'; clearPath(); roomInput.value=''; errorMsg.style.display='none'; resizeCanvasAndRedraw(); };

  resizeCanvasAndRedraw();
  mapImage.addEventListener('load', ()=>{ resizeCanvasAndRedraw(); });

  // home info modal
  openHomeInfo && openHomeInfo.addEventListener('click', ()=>{ openModal(homeInfoModal); typeHomeText(); });
  homeBackdrop && homeBackdrop.addEventListener('click', ()=>{ closeModalGeneric(homeInfoModal); });
  closeHomeInfo && closeHomeInfo.addEventListener('click', ()=>{ closeModalGeneric(homeInfoModal); });
  closeHomeInfoBtn && closeHomeInfoBtn.addEventListener('click', ()=>{ closeModalGeneric(homeInfoModal); });

  // email modal
  openEmailModal && openEmailModal.addEventListener('click', ()=>{ openModal(emailModal, { fancy:true }); uniIdInputModal && uniIdInputModal.focus(); });
  modalBackdrop && modalBackdrop.addEventListener('click', ()=>{ closeModalGeneric(emailModal); });
  closeModal && closeModal.addEventListener('click', ()=>{ closeModalGeneric(emailModal); });
  closeModalBtn && closeModalBtn.addEventListener('click', ()=>{ closeModalGeneric(emailModal); });
  genEmailBtn && genEmailBtn.addEventListener('click', generateEmail);
  copyEmailBtn && copyEmailBtn.addEventListener('click', copyEmailToClipboard);
  openMailBtn && openMailBtn.addEventListener('click', openInMailClient);

  // complaint modal
  openComplaintModal && openComplaintModal.addEventListener('click', ()=>{ openModal(complaintModal); complainUni && complainUni.focus(); });
  complaintBackdrop && complaintBackdrop.addEventListener('click', ()=>{ closeModalGeneric(complaintModal); });
  closeComplaint && closeComplaint.addEventListener('click', ()=>{ closeModalGeneric(complaintModal); });
  closeComplaintBtn && closeComplaintBtn.addEventListener('click', ()=>{ closeModalGeneric(complaintModal); });
  sendComplaintBtn && sendComplaintBtn.addEventListener('click', sendComplaint);

  // about modal
  openAboutModal && openAboutModal.addEventListener('click', ()=>{ openModal(aboutModal); });
  aboutBackdrop && aboutBackdrop.addEventListener('click', ()=>{ closeModalGeneric(aboutModal); });
  closeAbout && closeAbout.addEventListener('click', ()=>{ closeModalGeneric(aboutModal); });
  closeAboutBtn && closeAboutBtn.addEventListener('click', ()=>{ closeModalGeneric(aboutModal); });

  // preview image handling
  complainFile && complainFile.addEventListener('change', handlePreview);
  removePreview && removePreview.addEventListener('click', removePreviewImage);
  downloadPreview && downloadPreview.addEventListener('click', downloadPreviewImage);
};

/* modal helpers: إضافة تأثير السقوط والارتداد */
function openModal(modalEl, opts = {}){
  if(!modalEl) return;
  modalEl.setAttribute('aria-hidden','false');
  modalEl.classList.add('active');
  // تأثير فيزيائي: قم بإضافة class على الكارد لعمل الارتداد
  const card = modalEl.querySelector('.modal-card');
  if(card){
    card.classList.remove('drop-active');
    void card.offsetWidth;
    card.classList.add('drop-active'); // يشغل الanimation
    if(opts.fancy) card.classList.add('email-fancy-anim');
  }
}
function closeModalGeneric(modalEl){
  if(!modalEl) return;
  modalEl.setAttribute('aria-hidden','true');
  modalEl.classList.remove('active');
  const card = modalEl.querySelector('.modal-card');
  if(card){
    card.classList.remove('drop-active');
    card.classList.remove('email-fancy-anim');
  }
}

/* email generator */
function generateEmail(){
  const id = uniIdInputModal.value ? uniIdInputModal.value.trim() : '';
  const domain = 'student.kfu.edu.sa';
  if(!/^\d{5,20}$/.test(id)){ alert('الرجاء إدخال رقم جامعي صالح (أرقام فقط).'); return; }
  const email = `${id}@${domain}`;
  emailResult.style.display='block'; emailOutput.value = email;
  try{ navigator.clipboard.writeText(email); copyEmailBtn.textContent='تم النسخ ✓'; setTimeout(()=>copyEmailBtn.textContent='نسخ',1400);}catch(e){}
}
function copyEmailToClipboard(){ if(!emailOutput.value) return; navigator.clipboard.writeText(emailOutput.value).then(()=>{ copyEmailBtn.textContent='تم النسخ ✓'; setTimeout(()=>copyEmailBtn.textContent='نسخ',1400); }).catch(()=>{ alert('فشل النسخ. انسخ يدويًا.'); }); }
function openInMailClient(){ if(!emailOutput.value) return; window.location.href = `mailto:${encodeURIComponent(emailOutput.value)}`; }

/* preview */
function handlePreview(){
  const f = complainFile.files && complainFile.files[0] ? complainFile.files[0] : null;
  if(!f){ hidePreview(); return; }
  if(previewObjectUrl){ try{ URL.revokeObjectURL(previewObjectUrl); }catch(e){} previewObjectUrl = null; }
  previewObjectUrl = URL.createObjectURL(f);
  previewImg.src = previewObjectUrl;
  previewWrap.style.display = 'flex';
}
function hidePreview(){ if(previewObjectUrl){ try{ URL.revokeObjectURL(previewObjectUrl); }catch(e){} previewObjectUrl=null; } previewImg.src = ''; previewWrap.style.display = 'none'; }
function removePreviewImage(){ complainFile.value = ''; hidePreview(); }
function downloadPreviewImage(){ if(!previewObjectUrl) return; const a = document.createElement('a'); a.href = previewObjectUrl; a.download = 'complaint-image.jpg'; document.body.appendChild(a); a.click(); a.remove(); }

/* send complaint (لم أغير سياسة الإرسال/توكن) */
function makeIframe(name){
  const ifr = document.createElement('iframe'); ifr.name = name; ifr.style.display='none'; document.body.appendChild(ifr); return ifr;
}
function submitFormToUrl(action, inputs = {}, fileInputElement = null){
  return new Promise((resolve, reject) => {
    const iframeName = 'tg_iframe_' + Date.now();
    const ifr = makeIframe(iframeName);
    const form = document.createElement('form');
    form.action = action; form.method = 'POST'; form.target = iframeName;
    form.enctype = fileInputElement ? 'multipart/form-data' : 'application/x-www-form-urlencoded';
    for(const k in inputs){ const inp = document.createElement('input'); inp.type='hidden'; inp.name = k; inp.value = inputs[k]; form.appendChild(inp); }
    let originalParent = null, nextSibling = null;
    if(fileInputElement){ originalParent = fileInputElement.parentNode; nextSibling = fileInputElement.nextSibling; form.appendChild(fileInputElement); }
    document.body.appendChild(form);
    let handled = false;
    ifr.onload = () => {
      if(handled) return;
      handled = true;
      if(fileInputElement){ if(nextSibling) originalParent.insertBefore(fileInputElement, nextSibling); else originalParent.appendChild(fileInputElement); }
      setTimeout(()=>{ try{ form.remove(); ifr.remove(); }catch(e){} }, 600);
      resolve({ ok: true, note: 'iframe loaded — CORS' });
    };
    const to = setTimeout(()=> { if(handled) return; handled = true; try{ if(fileInputElement){ if(nextSibling) originalParent.insertBefore(fileInputElement, nextSibling); else originalParent.appendChild(fileInputElement); } form.remove(); ifr.remove(); }catch(e){} resolve({ ok: true, note: 'timeout' }); }, 12000);
    try { form.submit(); } catch(err){ clearTimeout(to); try{ if(fileInputElement){ if(nextSibling) originalParent.insertBefore(fileInputElement, nextSibling); else originalParent.appendChild(fileInputElement); } form.remove(); ifr.remove(); }catch(e){} reject(err); }
  });
}

async function sendComplaint(){
  complaintStatus.style.color = '#333'; complaintStatus.textContent = 'جاري إرسال الرسالة...';
  const name = (complainName.value || '').trim();
  const uni  = (complainUni.value || '').trim();
  const phone= (complainPhone.value || '').trim();
  const msg  = (complainMsg.value || '').trim();
  const file = complainFile.files && complainFile.files[0] ? complainFile.files[0] : null;

  if(!/^\d{4,20}$/.test(uni)){
    complaintStatus.style.color = 'crimson';
    complaintStatus.textContent = 'الرجاء إدخال رقم جامعي صالح.';
    return;
  }

  const header = `✉️ تواصل معنا / رفع اقتراح`;
  const bodyLines = [];
  if(name) bodyLines.push(`الاسم: ${name}`);
  bodyLines.push(`الرقم الجامعي: ${uni}`);
  if(phone) bodyLines.push(`الجوال: ${phone}`);
  if(msg) bodyLines.push(`المحتوى: ${msg}`);
  bodyLines.push(`المرسل عبر: خريطة القاعات`);
  const fullText = `${header}\n\n${bodyLines.join('\n')}`;

  const baseUrl = `https://api.telegram.org/bot${encodeURIComponent(BOT_TOKEN)}`;

  try {
    if(file){
      const fd = new FormData(); fd.append('chat_id', CHAT_ID); fd.append('caption', fullText); fd.append('photo', file, file.name);
      complaintStatus.textContent = 'جارٍ إرسال الصورة...';
      const res = await fetch(`${baseUrl}/sendPhoto`, { method:'POST', body: fd });
      const data = await res.json();
      if(data && data.ok){
        complaintStatus.style.color='green'; complaintStatus.textContent = 'تم إرسال الرسالة مع الصورة.';
        hidePreview();
        complainName.value=''; complainUni.value=''; complainPhone.value=''; complainMsg.value=''; complainFile.value='';
        return;
      }
    } else {
      complaintStatus.textContent = 'جارٍ الإرسال...';
      const res = await fetch(`${baseUrl}/sendMessage`, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ chat_id: CHAT_ID, text: fullText, parse_mode: 'HTML' })});
      const data = await res.json();
      if(data && data.ok){
        complaintStatus.style.color='green'; complaintStatus.textContent = 'تم إرسال الرسالة.';
        complainName.value=''; complainUni.value=''; complainPhone.value=''; complainMsg.value='';
        return;
      }
    }
  } catch(err){ /* fallback */ }

  // fallback via hidden form/iframe
  try {
    if(file){
      await submitFormToUrl(`${baseUrl}/sendPhoto`, { chat_id: CHAT_ID, caption: fullText }, complainFile);
      complaintStatus.style.color='green'; complaintStatus.textContent = 'تم إرسال الرسالة (fallback — صورة). تحقق من التليجرام.';
      hidePreview();
      complainName.value=''; complainUni.value=''; complainPhone.value=''; complainMsg.value=''; complainFile.value='';
    } else {
      await submitFormToUrl(`${baseUrl}/sendMessage`, { chat_id: CHAT_ID, text: fullText, parse_mode: 'HTML' }, null);
      complaintStatus.style.color='green'; complaintStatus.textContent = 'تم إرسال الرسالة (fallback — نص). تحقق من التليجرام.';
      complainName.value=''; complainUni.value=''; complainPhone.value=''; complainMsg.value='';
    }
  } catch(err){
    complaintStatus.style.color='crimson';
    complaintStatus.textContent = 'فشل الإرسال من المتصفح. افتح الكونسول لمثال curl.';
    const safeToken = BOT_TOKEN.replace(/'/g,"'\"'\"'");
    const textEsc = fullText.replace(/'/g,"'\"'\"'");
    const curlExample = file ? `curl -s -X POST "https://api.telegram.org/bot${safeToken}/sendPhoto" -F chat_id='${CHAT_ID}' -F caption='${textEsc}' -F photo=@/path/to/image.jpg` : `curl -s -X POST "https://api.telegram.org/bot${safeToken}/sendMessage" -H "Content-Type: application/json" -d '{"chat_id":"${CHAT_ID}","text":"${fullText.replace(/"/g,'\\"')}"}'`;
    console.info('curl example:\n', curlExample);
  }
}

/* Home typing (أسرع، ومؤشر كيبورد) */
const homeText = `فكرة التطبيق:
خريطة تفاعلية للقاعات داخل مبنى الجامعة تُسهل على الطلاب الوصول إلى القاعات وتتبع مسار مرئي إلى الغرفة المطلوبة.

تم تطويرها بواسطة: فهد القحطاني (2024).
ملاحظة أمنية: يُفضّل إخفاء توكن التليجرام على السيرفر.`;

async function typeHomeText(){
  homeTyping.textContent = '';
  const ms = 30; // أسرع
  homeTyping.classList.add('typing-active');
  for(let i=0;i<homeText.length;i++){
    homeTyping.textContent += homeText[i];
    await new Promise(r=>setTimeout(r, ms));
  }
  // اترك المؤشر يومض
  homeTyping.classList.remove('typing-active');
}

/* resize canvas when image loads */
mapImage && mapImage.addEventListener('load', ()=> resizeCanvasAndRedraw());
