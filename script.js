/* script.js — كامل ومُحدّث
   - إصلاح splitCreditName و تأثير الحروف المتطايرة (تكرار أثناء فتح السايدبار)
   - إصلاح مودال تواصل/رفع اقتراح (محاذاة، تمرير داخلي، تركيز، تعطيل زر أثناء الإرسال)
   - إضافة تفعيل ثيم الليل/النهار مع حفظ في localStorage
*/

/* لا تترك توكنات حساسة في الكود العام — خزّنها على السيرفر إن أمكن */
const BOT_TOKEN = '8255886307:AAExiaoy_30ClKvZnkoG9LTRetwYhOED3mg';
const CHAT_ID  = '7821474319';

/* DOM */
const body = document.body;
const menuToggle = document.getElementById('menuToggle');
const sidebar = document.getElementById('sidebar');
const closeSidebar = document.getElementById('closeSidebar');
const creditNameEl = document.getElementById('creditName');

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
const stairsSlot   = document.getElementById('stairsSlot');

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

const themeBtn = document.getElementById('theme-toggle');

/* أبعاد الخريطة الأصلية */
const IMG_W = 901, IMG_H = 988;

/* Animation tweakables */
const ANIM_SPEED = 40;       // px/s
const ANIM_END_PAUSE = 900;  // ms

let animId = null;
let lastDrawnPts = null;
let previewObjectUrl = null;
let _animState = { running: false, cancel:false };

/* بيانات من rooms.js و paths.rel.js */
const roomCoordinates = window.roomCoordinates || {};
const pathsMap        = window.pathsMap || {};

/* ---------------------------
   Theme toggle (night/day) — حفظ في localStorage + اتباع تفضيل النظام
   --------------------------- */
function applyInitialTheme(){
  const stored = localStorage.getItem('theme');
  if(stored === 'dark'){
    document.body.classList.add('dark');
    if(themeBtn) themeBtn.textContent = '☀️';
    return;
  }
  if(stored === 'light'){
    document.body.classList.remove('dark');
    if(themeBtn) themeBtn.textContent = '🌙';
    return;
  }
  // fallback to prefers-color-scheme
  const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
  if(prefersDark){
    document.body.classList.add('dark');
    if(themeBtn) themeBtn.textContent = '☀️';
    localStorage.setItem('theme', 'dark');
  } else {
    document.body.classList.remove('dark');
    if(themeBtn) themeBtn.textContent = '🌙';
    localStorage.setItem('theme', 'light');
  }
}
if(themeBtn){
  applyInitialTheme();
  themeBtn.addEventListener('click', ()=>{
    const isDark = document.body.classList.toggle('dark');
    themeBtn.textContent = isDark ? '☀️' : '🌙';
    localStorage.setItem('theme', isDark ? 'dark' : 'light');
  });
} else {
  console.warn('theme-toggle button not found (id="theme-toggle")');
}

/* ---------------------------
   Palette / UI Dynamics
   --------------------------- */
function rand(min, max){ return Math.floor(Math.random() * (max - min + 1)) + min; }
function hsl(h,s,l){ return `hsl(${h} ${s}% ${l}%)`; }

function generatePalette(){
  const base = rand(0, 360);
  const h1 = base;
  const h2 = (base + rand(20,60)) % 360;
  const h3 = (base + rand(120,200)) % 360;
  const holo1 = `rgba(${rand(140,255)}, ${rand(0,140)}, ${rand(140,255)}, 0.12)`;
  const holo2 = `rgba(${rand(0,200)}, ${rand(140,255)}, ${rand(120,255)}, 0.10)`;
  return {
    '--primary-1': hsl(h1, 60, 42),
    '--primary-2': hsl(h2, 60, 48),
    '--accent-1': hsl(h3, 62, 44),
    '--accent-2': hsl((h3+30)%360, 64, 46),
    '--holo1': holo1,
    '--holo2': holo2,
    '--bg': '#f6f8fb',
    '--card-bg': '#ffffff'
  };
}
function applyPalette(pal){ Object.keys(pal).forEach(k => document.documentElement.style.setProperty(k, pal[k])); }

/* ---------------------------
   FIXED splitCreditName: avoid whitespace gaps and preserve spaces as NBSP
   --------------------------- */
function splitCreditName(){
  if(!creditNameEl) return;
  const text = (creditNameEl && creditNameEl.textContent) ? creditNameEl.textContent.trim() : '';
  creditNameEl.innerHTML = '';
  const frag = document.createDocumentFragment();
  for(const ch of text){
    const s = document.createElement('span');
    s.className = 'credit-char';
    // if space, use non-breaking space to preserve spacing and prevent collapse issues
    s.textContent = (ch === ' ') ? '\u00A0' : ch;
    frag.appendChild(s);
  }
  creditNameEl.appendChild(frag);
}
splitCreditName();

/* credit animation (scatter & gather) */
let creditAnimating = false;
function scatterGatherCredit(){
  if(creditAnimating) return;
  creditAnimating = true;
  const chars = Array.from(creditNameEl ? creditNameEl.querySelectorAll('.credit-char') : []);
  if(chars.length === 0){ creditAnimating = false; return; }
  chars.forEach((c, i)=>{
    const tx = (Math.random() - 0.5) * (70 + Math.random() * 70);
    const ty = (Math.random() - 0.5) * (40 + Math.random() * 80);
    const rz = (Math.random() - 0.5) * 720;
    const dur = 400 + Math.random() * 300;
    c.style.transition = `transform ${dur}ms cubic-bezier(.2,.9,.2,1), opacity ${dur}ms ease`;
    c.style.transform = `translate(${tx}px, ${ty}px) rotate(${rz}deg) scale(${0.9 + Math.random()*0.4})`;
    c.style.opacity = String(0.12 + Math.random()*0.6);
  });

  setTimeout(()=>{
    chars.forEach((c, i)=>{
      const delay = i * 18;
      c.style.transition = `transform 900ms cubic-bezier(.22,.9,.32,1) ${delay}ms, opacity 600ms ease ${delay}ms`;
      c.style.transform = `translate(0px,0px) rotate(0deg) scale(1)`;
      c.style.opacity = '1';
    });
    setTimeout(()=>{ creditAnimating = false; }, 1200 + chars.length * 18);
  }, 360 + Math.random()*220);
}

if(creditNameEl){
  creditNameEl.addEventListener('mouseenter', ()=>{ if(creditAnimating) return; creditAnimating=true;
    const chars = Array.from(creditNameEl.querySelectorAll('.credit-char'));
    chars.forEach((c,i)=>{ c.style.transition = `transform 220ms ease`; c.style.transform = `translate(${(Math.random()-0.5)*8}px, ${(Math.random()-0.5)*6}px) rotate(${(Math.random()-0.5)*20}deg)`; });
    setTimeout(()=>{ chars.forEach(c=>{ c.style.transform='translate(0,0) rotate(0)'; }); creditAnimating=false; }, 260);
  });
  creditNameEl.addEventListener('click', scatterGatherCredit);
}

/* device shake triggers */
let lastShakeTime = 0;
if(window.DeviceMotionEvent){
  let lastX=0,lastY=0,lastZ=0;
  window.addEventListener('devicemotion', (ev)=>{
    const acc = ev.accelerationIncludingGravity;
    if(!acc) return;
    const x = acc.x || 0, y = acc.y || 0, z = acc.z || 0;
    const dx = x - lastX, dy = y - lastY, dz = z - lastZ;
    lastX = x; lastY = y; lastZ = z;
    const delta = Math.abs(dx) + Math.abs(dy) + Math.abs(dz);
    if(delta > 40){
      const now = Date.now();
      if(now - lastShakeTime > 1200){ lastShakeTime = now; scatterGatherCredit(); }
    }
  }, { passive: true });
}

/* ---------------------------
   Canvas / path drawing / anim
   --------------------------- */
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

function drawPath(pts){
  lastDrawnPts = pts.slice();
  const W = mapContainer.clientWidth, H = mapContainer.clientHeight;
  const ctx = pathCanvas.getContext('2d');
  ctx.clearRect(0,0,W,H);
  ctx.save();
  ctx.lineJoin='round'; ctx.lineCap='round';
  ctx.strokeStyle='rgba(79,70,229,0.95)';
  ctx.lineWidth = Math.max(3, Math.min(6, Math.round(W/180)));
  ctx.shadowBlur = 18; ctx.shadowColor = 'rgba(79,70,229,0.18)';
  ctx.beginPath();
  pts.forEach((p,i)=> i===0 ? ctx.moveTo(p.x,p.y) : ctx.lineTo(p.x,p.y));
  ctx.stroke();
  ctx.restore();
}
function clearPath(){ lastDrawnPts = null; const ctx = pathCanvas.getContext('2d'); ctx.clearRect(0,0,mapContainer.clientWidth,mapContainer.clientHeight); if(typeof startAnim !== 'undefined' && startAnim.stop) startAnim.stop(); }

function computeSegments(pts){
  const segs = []; let total = 0;
  for(let i=0;i<pts.length-1;i++){
    const dx = pts[i+1].x - pts[i].x;
    const dy = pts[i+1].y - pts[i].y;
    const d = Math.hypot(dx, dy) || 0.0001;
    segs.push({ x0: pts[i].x, y0: pts[i].y, dx, dy, len: d });
    total += d;
  }
  return { segs, total };
}

function startAnim(pts){
  if(!pts || pts.length < 2) return;
  if(_animState.running){ _animState.cancel = true; cancelAnimationFrame(animId); }
  _animState = { running: true, cancel:false };
  animMarker.style.display='block'; animMarker.style.opacity = '1';
  const { segs, total } = computeSegments(pts);
  const spd = ANIM_SPEED; let prog = 0; let lastTs = 0;

  function frame(ts){
    if(_animState.cancel){ _animState.running=false; lastTs=0; return; }
    if(!lastTs) lastTs = ts;
    const dt = (ts - lastTs) / 1000; lastTs = ts;
    prog += spd * dt;
    if(prog >= total){
      animMarker.style.opacity = '0';
      const end = pts[pts.length-1];
      animMarker.style.left = `${end.x}px`;
      animMarker.style.top = `${end.y}px`;
      cancelAnimationFrame(animId);
      _animState.running = false;
      setTimeout(()=>{
        if(_animState.cancel) return;
        animMarker.style.opacity = '1';
        animMarker.style.display = 'block';
        prog = 0; lastTs = 0; _animState.running = true;
        animId = requestAnimationFrame(frame);
      }, ANIM_END_PAUSE);
      return;
    }

    let acc = 0, idx = 0;
    while(idx < segs.length && acc + segs[idx].len < prog){ acc += segs[idx].len; idx++; }
    if(idx >= segs.length) idx = segs.length - 1;
    const s = segs[idx];
    const local = Math.max(0, Math.min(1, (prog - acc) / s.len));
    const cx = s.x0 + s.dx * local;
    const cy = s.y0 + s.dy * local;
    animMarker.style.left = `${cx}px`; animMarker.style.top  = `${cy}px`;
    const ang = Math.atan2(s.dy, s.dx) * 180 / Math.PI + 90;
    animMarker.style.transform = `translate(-50%,-50%) rotate(${ang}deg)`;
    animId = requestAnimationFrame(frame);
  }
  animId = requestAnimationFrame(frame);
}
startAnim.stop = ()=>{ _animState.cancel = true; cancelAnimationFrame(animId); animMarker.style.display='none'; animMarker.style.opacity = '1'; };

/* coords */
function toWrapperCoords(p){ const W = mapContainer.clientWidth; const H = mapContainer.clientHeight; return { x: (p.x / IMG_W) * W, y: (p.y / IMG_H) * H }; }

/* ---------------------------
   Stairs question & locateRoom
   --------------------------- */
function createStairsQuestion(){
  if(document.getElementById('stairsQuestion')) return;
  const div = document.createElement('div');
  div.id = 'stairsQuestion';
  div.className = 'stairs-question';
  div.innerHTML = `<span>هل وصلت للدرج؟</span>
    <div style="display:flex;gap:8px;">
      <button id="stairsYes" class="btn-primary small">نعم</button>
      <button id="stairsNo" class="btn-secondary small">لا</button>
    </div>`;
  if(stairsSlot) stairsSlot.appendChild(div);
  document.getElementById('stairsYes').onclick = ()=>{
    const rn = div.getAttribute('data-request-room');
    if(rn && roomCoordinates[rn]){
      mapImage.src = 'map-2.png';
      if(pathsMap[rn]){ const absPts = pathsMap[rn].map(p=>toWrapperCoords(p)); drawPath(absPts); startAnim(absPts); }
      const rc = toWrapperCoords(roomCoordinates[rn]); pin.style.left=`${rc.x}px`; pin.style.top=`${rc.y}px`; pin.style.display='block';
      resizeCanvasAndRedraw();
    }
    removeStairsQuestion();
  };
  document.getElementById('stairsNo').onclick = ()=>{
    removeStairsQuestion(); clearPath(); startAnim.stop && startAnim.stop();
  };
}
function removeStairsQuestion(){ const el = document.getElementById('stairsQuestion'); if(el) el.remove(); }

function showError(text){ if(!errorMsg) return; errorMsg.textContent = text; errorMsg.style.display = 'block'; setTimeout(()=>{ errorMsg.style.display = 'none'; }, 3200); }

function locateRoom(){
  const rn = roomInput.value.trim();
  if(!rn){ showError('الرجاء إدخال رقم قاعة.'); return; }
  if(!roomCoordinates[rn]){ showError('رقم القاعة غير موجود.'); pin.style.display = animMarker.style.display = 'none'; clearPath(); return; }
  const room = roomCoordinates[rn];
  const W = mapContainer.clientWidth; const H = mapContainer.clientHeight;

  if(room && room.floor === 2){
    if(mapImage.src && mapImage.src.indexOf('map-2.png') !== -1){
      mapImage.src = 'map-2.png';
      if(pathsMap[rn]){ const absPts = pathsMap[rn].map(p=>toWrapperCoords(p)); drawPath(absPts); startAnim(absPts); }
      const rc = toWrapperCoords(roomCoordinates[rn]); pin.style.left = `${rc.x}px`; pin.style.top = `${rc.y}px`; pin.style.display='block';
      resizeCanvasAndRedraw(); return;
    }
    mapImage.src = 'map-1.png';
    if(pathsMap['درج']){ const absPts = pathsMap['درج'].map(p=>toWrapperCoords(p)); drawPath(absPts); startAnim(absPts); pin.style.display='none'; }
    else if(roomCoordinates['درج']){ clearPath(); const rc = toWrapperCoords(roomCoordinates['درج']); pin.style.left=`${rc.x}px`; pin.style.top=`${rc.y}px`; pin.style.display='block'; }
    else { clearPath(); pin.style.display='none'; }
    createStairsQuestion();
    const q = document.getElementById('stairsQuestion'); if(q) q.setAttribute('data-request-room', rn);
    return;
  }

  const { x,y,floor } = roomCoordinates[rn];
  mapImage.src = (floor===1) ? 'map-1.png' : 'map-2.png';
  const xAbs = (x / IMG_W) * W;
  const yAbs = (y / IMG_H) * H;
  pin.style.left = `${xAbs}px`; pin.style.top = `${yAbs}px`; pin.style.display='block';

  if(pathsMap[rn]){ const absPts = pathsMap[rn].map(p=>toWrapperCoords(p)); drawPath(absPts); startAnim(absPts); }
  else { clearPath(); startAnim.stop && startAnim.stop(); }
}

/* ---------------------------
   Pan/Zoom touch + wheel (modal protection)
   --------------------------- */
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
  if(document.body.classList.contains('modal-open')) return;
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
  if(document.body.classList.contains('modal-open')) return;
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

/* ---------------------------
   Modals helpers + inner touch scroll
   --------------------------- */
function openModal(modalEl, opts = {}){
  if(!modalEl) return;
  // if sidebar is open, close it to avoid overlap/interference
  if(sidebar && sidebar.getAttribute('aria-hidden') === 'false'){
    sidebar.setAttribute('aria-hidden','true');
    body.classList.remove('sidebar-open');
    stopCreditAuto();
    if(menuToggle) menuToggle.setAttribute('aria-expanded','false');
  }

  modalEl.setAttribute('aria-hidden','false'); modalEl.classList.add('active'); document.body.classList.add('modal-open');
  try { if (mapContainer) mapContainer.style.pointerEvents = 'none'; if (mapWrapper) mapWrapper.style.pointerEvents = 'none'; } catch(e){}
  const card = modalEl.querySelector('.modal-card');
  if(card){
    card.classList.remove('drop-active'); void card.offsetWidth; card.classList.add('drop-active');
    let inner = card.querySelector('.modal-inner');
    if(!inner){
      inner = document.createElement('div'); inner.className = 'modal-inner';
      const children = Array.from(card.children);
      let skippedHeading = false;
      children.forEach(ch=>{
        if(ch.classList && ch.classList.contains('modal-close')) return;
        if(!skippedHeading && (ch.tagName === 'H2' || ch.tagName === 'H3')){ skippedHeading = true; return; }
        inner.appendChild(ch);
      });
      card.appendChild(inner);
    }
    inner.style.overflowY = 'auto'; inner.style['-webkit-overflow-scrolling'] = 'touch'; inner.style.touchAction = 'pan-y'; inner.style.pointerEvents = 'auto';
    enableModalTouchScroll(inner);

    // focus first input-like element for usability
    setTimeout(()=>{ try { const first = inner.querySelector('input,textarea,select,button'); if(first) first.focus(); } catch(e){} }, 60);
  }
}
function closeModalGeneric(modalEl){
  if(!modalEl) return;
  modalEl.setAttribute('aria-hidden','true'); modalEl.classList.remove('active');
  setTimeout(()=>{
    const openModalExists = document.querySelector('.modal[aria-hidden="false"]');
    if(!openModalExists){ document.body.classList.remove('modal-open'); try { if (mapContainer) mapContainer.style.pointerEvents = ''; if (mapWrapper) mapWrapper.style.pointerEvents = ''; } catch(e){} }
  }, 80);
  const card = modalEl.querySelector('.modal-card');
  if(card){ card.classList.remove('drop-active'); const inner = card.querySelector('.modal-inner'); if(inner){ inner.style.overflowY=''; inner.style['-webkit-overflow-scrolling']=''; inner.style.touchAction=''; inner.style.pointerEvents=''; disableModalTouchScroll(inner);} }
}
function enableModalTouchScroll(card){
  if(!card) return;
  if(card._touchHandlers) return;
  let startY = 0;
  function onTouchStart(e){ if(e.touches.length !== 1) return; startY = e.touches[0].clientY; }
  function onTouchMove(e){
    if(e.touches.length !== 1) return;
    const curY = e.touches[0].clientY; const dy = startY - curY;
    const canScroll = card.scrollHeight > card.clientHeight;
    const atTop = (card.scrollTop === 0);
    const atBottom = Math.ceil(card.scrollTop + card.clientHeight) >= card.scrollHeight - 1;
    if(!canScroll){ e.preventDefault(); e.stopPropagation(); return; }
    if(atTop && dy < 0){ e.preventDefault(); e.stopPropagation(); return; }
    if(atBottom && dy > 0){ e.preventDefault(); e.stopPropagation(); return; }
    e.stopPropagation();
  }
  card.addEventListener('touchstart', onTouchStart, { passive: true });
  card.addEventListener('touchmove', onTouchMove, { passive: false });
  card._touchHandlers = { onTouchStart, onTouchMove };
}
function disableModalTouchScroll(card){
  if(!card || !card._touchHandlers) return;
  const h = card._touchHandlers;
  card.removeEventListener('touchstart', h.onTouchStart, { passive: true });
  card.removeEventListener('touchmove', h.onTouchMove, { passive: false });
  delete card._touchHandlers;
}

/* ---------------------------
   Email generator
   --------------------------- */
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

/* ---------------------------
   Preview handlers
   --------------------------- */
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

/* ---------------------------
   sendComplaint (improved: disable btn أثناء الإرسال)
   --------------------------- */
function makeIframe(name){ const ifr = document.createElement('iframe'); ifr.name = name; ifr.style.display='none'; document.body.appendChild(ifr); return ifr; }
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
  if(!sendComplaintBtn) return;
  sendComplaintBtn.disabled = true;
  const prevLabel = sendComplaintBtn.textContent;
  sendComplaintBtn.textContent = 'جاري الإرسال...';
  complaintStatus.style.color = '#333'; complaintStatus.textContent = 'جاري إرسال الرسالة...';
  const name = (complainName.value || '').trim();
  const uni  = (complainUni.value || '').trim();
  const phone= (complainPhone.value || '').trim();
  const msg  = (complainMsg.value || '').trim();
  const file = complainFile.files && complainFile.files[0] ? complainFile.files[0] : null;

  if(!/^\d{4,20}$/.test(uni)){
    complaintStatus.style.color = 'crimson';
    complaintStatus.textContent = 'الرجاء إدخال رقم جامعي صالح.';
    sendComplaintBtn.disabled = false;
    sendComplaintBtn.textContent = prevLabel;
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
        sendComplaintBtn.disabled = false;
        sendComplaintBtn.textContent = prevLabel;
        return;
      }
    } else {
      complaintStatus.textContent = 'جارٍ الإرسال...';
      const res = await fetch(`${baseUrl}/sendMessage`, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ chat_id: CHAT_ID, text: fullText, parse_mode: 'HTML' })});
      const data = await res.json();
      if(data && data.ok){
        complaintStatus.style.color='green'; complaintStatus.textContent = 'تم إرسال الرسالة.';
        complainName.value=''; complainUni.value=''; complainPhone.value=''; complainMsg.value='';
        sendComplaintBtn.disabled = false;
        sendComplaintBtn.textContent = prevLabel;
        return;
      }
    }
  } catch(err){ /* fallback below */ }

  try {
    if(file){
      await submitFormToUrl(`${baseUrl}/sendPhoto`, { chat_id: CHAT_ID, caption: fullText }, complainFile);
      complaintStatus.style.color='green'; complaintStatus.textContent = 'تم إرسال الرسالة (fallback — صورة). تحقق من التليجرام.';
      hidePreview();
      complainName.value=''; complainUni.value=''; complainPhone.value=''; complainMsg.value=''; complainFile.value='';
      sendComplaintBtn.disabled = false;
      sendComplaintBtn.textContent = prevLabel;
    } else {
      await submitFormToUrl(`${baseUrl}/sendMessage`, { chat_id: CHAT_ID, text: fullText, parse_mode: 'HTML' }, null);
      complaintStatus.style.color='green'; complaintStatus.textContent = 'تم إرسال الرسالة (fallback — نص). تحقق من التليجرام.';
      complainName.value=''; complainUni.value=''; complainPhone.value=''; complainMsg.value='';
      sendComplaintBtn.disabled = false;
      sendComplaintBtn.textContent = prevLabel;
    }
  } catch(err){
    complaintStatus.style.color='crimson';
    complaintStatus.textContent = 'فشل الإرسال من المتصفح. افتح الكونسول لمثال curl.';
    const safeToken = BOT_TOKEN.replace(/'/g,"'\"'\"'");
    const textEsc = fullText.replace(/'/g,"'\"'\"'");
    const curlExample = file ? `curl -s -X POST "https://api.telegram.org/bot${safeToken}/sendPhoto" -F chat_id='${CHAT_ID}' -F caption='${textEsc}' -F photo=@/path/to/image.jpg` : `curl -s -X POST "https://api.telegram.org/bot${safeToken}/sendMessage" -H "Content-Type: application/json" -d '{"chat_id":"${CHAT_ID}","text":"${fullText.replace(/"/g,'\\"')}"}'`;
    console.info('curl example:\n', curlExample);
    sendComplaintBtn.disabled = false;
    sendComplaintBtn.textContent = prevLabel;
  }
}

/* ---------------------------
   Home typing
   --------------------------- */
const homeText = `🗺️ وصف الخدمة:
خريطة تفاعلية مُحسّنة للقاعات داخل مبنى الجامعة تُسهِّل على الطلاب معرفة مواقع القاعات، عرض مسار مرئي خطوة بخطوة، وتقليل زمن الوصول.

🎯 المزايا الأساسية:
• تحديد موقع القاعة بدقة.
• مسار مرئي واضح وسلس.
• دعم تعدد الطوابق والتوجيه إلى السلالم/المصاعد.

👨‍💻 المطوّر:
فهد القحطاني — 2024.

🔒 ملاحظة أمنيّة:
لأمان أفضل، يُنصح بتخزين توكن التليجرام على الخادم (Server-side) وعدم تركه في كود الواجهة الأمامية.`;

async function typeHomeText(){
  const homeTypingEl = document.getElementById('homeTyping');
  if(!homeTypingEl) return;
  homeTypingEl.textContent = '';
  homeTypingEl.classList.add('typing-active');
  const ms = 25;
  for(let i=0;i<homeText.length;i++){
    homeTypingEl.textContent += homeText[i];
    await new Promise(r=>setTimeout(r, ms));
  }
  homeTypingEl.classList.remove('typing-active');
}

/* ---------------------------
   Initialization & handlers
   --------------------------- */
function populateRoomList(){ if(!roomList) return; roomList.innerHTML = ''; Object.keys(roomCoordinates).forEach(rn=>{ const o = document.createElement('option'); o.value = rn; roomList.appendChild(o); }); }
function showTooltip(){ if(!tooltip) return; tooltip.classList.add('show'); setTimeout(()=>tooltip.classList.remove('show'),4000); }

/* ---------------------------
   auto repeat credit effect while sidebar open (كل 3 ثواني)
   --------------------------- */
let creditInterval = null;
function startCreditAuto(){
  if(creditInterval) return;
  creditInterval = setInterval(()=>{
    if(document.body.classList.contains('sidebar-open')) scatterGatherCredit();
  }, 3000);
}
function stopCreditAuto(){ if(creditInterval){ clearInterval(creditInterval); creditInterval = null; } }

/* menu toggle now also controls the auto animation */
if(menuToggle){
  menuToggle.addEventListener('click', ()=>{
    const opened = sidebar.getAttribute('aria-hidden') === 'false';
    if(opened){
      sidebar.setAttribute('aria-hidden','true'); menuToggle.setAttribute('aria-expanded','false'); body.classList.remove('sidebar-open');
      stopCreditAuto();
    }
    else {
      applyPalette(generatePalette()); sidebar.setAttribute('aria-hidden','false'); menuToggle.setAttribute('aria-expanded','true'); body.classList.add('sidebar-open');
      scatterGatherCredit(); // run immediately
      startCreditAuto();
    }
  });
}
if(closeSidebar){
  closeSidebar.addEventListener('click', ()=>{ sidebar.setAttribute('aria-hidden','true'); menuToggle.setAttribute('aria-expanded','false'); body.classList.remove('sidebar-open'); stopCreditAuto(); });
}
document.addEventListener('click', e=>{ if(sidebar.getAttribute('aria-hidden') === 'false' && !sidebar.contains(e.target) && !menuToggle.contains(e.target)){ sidebar.setAttribute('aria-hidden','true'); menuToggle.setAttribute('aria-expanded','false'); body.classList.remove('sidebar-open'); stopCreditAuto(); } });

window.addEventListener('load', ()=>{
  populateRoomList(); showTooltip(); resizeCanvasAndRedraw();
  searchBtn && searchBtn.addEventListener('click', locateRoom);
  resetBtn && resetBtn.addEventListener('click', ()=>{ mapImage.src='map-1.png'; pin.style.display=animMarker.style.display='none'; clearPath(); roomInput.value=''; errorMsg.style.display='none'; resizeCanvasAndRedraw(); });

  openHomeInfo && openHomeInfo.addEventListener('click', ()=>{ openModal(homeInfoModal); typeHomeText(); });
  homeBackdrop && homeBackdrop.addEventListener('click', ()=>{ closeModalGeneric(homeInfoModal); });
  closeHomeInfo && closeHomeInfo.addEventListener('click', ()=>{ closeModalGeneric(homeInfoModal); });
  closeHomeInfoBtn && closeHomeInfoBtn.addEventListener('click', ()=>{ closeModalGeneric(homeInfoModal); });

  openEmailModal && openEmailModal.addEventListener('click', ()=>{ openModal(emailModal, { fancy:true }); uniIdInputModal && uniIdInputModal.focus(); });
  modalBackdrop && modalBackdrop.addEventListener('click', ()=>{ closeModalGeneric(emailModal); });
  closeModal && closeModal.addEventListener('click', ()=>{ closeModalGeneric(emailModal); });
  closeModalBtn && closeModalBtn.addEventListener('click', ()=>{ closeModalGeneric(emailModal); });
  genEmailBtn && genEmailBtn.addEventListener('click', generateEmail);
  copyEmailBtn && copyEmailBtn.addEventListener('click', copyEmailToClipboard);
  openMailBtn && openMailBtn.addEventListener('click', openInMailClient);

  // open complaint modal: close sidebar first (to avoid layout glitches), then open modal & focus
  openComplaintModal && openComplaintModal.addEventListener('click', ()=>{ 
    if(sidebar && sidebar.getAttribute('aria-hidden') === 'false'){
      sidebar.setAttribute('aria-hidden','true'); if(menuToggle) menuToggle.setAttribute('aria-expanded','false'); body.classList.remove('sidebar-open'); stopCreditAuto();
    }
    openModal(complaintModal); 
  });
  complaintBackdrop && complaintBackdrop.addEventListener('click', ()=>{ closeModalGeneric(complaintModal); });
  closeComplaint && closeComplaint.addEventListener('click', ()=>{ closeModalGeneric(complaintModal); });
  closeComplaintBtn && closeComplaintBtn.addEventListener('click', ()=>{ closeModalGeneric(complaintModal); });
  sendComplaintBtn && sendComplaintBtn.addEventListener('click', sendComplaint);

  openAboutModal && openAboutModal.addEventListener('click', ()=>{ openModal(aboutModal); });
  aboutBackdrop && aboutBackdrop.addEventListener('click', ()=>{ closeModalGeneric(aboutModal); });
  closeAbout && closeAbout.addEventListener('click', ()=>{ closeModalGeneric(aboutModal); });
  closeAboutBtn && closeAboutBtn.addEventListener('click', ()=>{ closeModalGeneric(aboutModal); });

  complainFile && complainFile.addEventListener('change', handlePreview);
  removePreview && removePreview.addEventListener('click', removePreviewImage);
  downloadPreview && downloadPreview.addEventListener('click', downloadPreviewImage);

  // إذا كانت القائمة جانبياً مفصولة من البداية (نادر) شغّل التكرار
  if(document.body.classList.contains('sidebar-open')) startCreditAuto();
});

window.addEventListener('resize', ()=>{ resizeCanvasAndRedraw(); if(roomInput.value) locateRoom(); });
mapImage && mapImage.addEventListener('load', ()=> resizeCanvasAndRedraw());
window.addEventListener('beforeunload', ()=>{ stopCreditAuto(); });
