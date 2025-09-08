 const BOT_TOKEN = '8255886307:AAExiaoy_30ClKvZnkoG9LTRetwYhOED3mg';
const CHAT_ID  = '7821474319';

/* رقم العميد (ضع الرقم هنا بصيغة محلية أو دولية) */
const DEAN_PHONE = '0135895711';

/* نظام الإعلانات الديناميكي */
let currentAd = null;
let adCheckInterval = null;

/* ----- DOM ----- */
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
const uniIdInput = document.getElementById('uniIdInput');
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

const waDeanBtn = document.getElementById('waDeanBtn');
const openDeanModal = document.getElementById('openDeanModal');
const deanModal = document.getElementById('deanModal');
const deanBackdrop = document.getElementById('deanBackdrop');
const closeDean = document.getElementById('closeDean');
const closeDeanBtn = document.getElementById('closeDeanBtn');

const themeBtn = document.getElementById('theme-toggle');

/* ----- خرائط/بيانات خارجية (rooms.js و paths.rel.js يُحمّلان في index.html) ----- */
const roomCoordinates = window.roomCoordinates || {};
const pathsMap        = window.pathsMap || {};

/* ----- ثابتات الخريطة ----- */
const IMG_W = 901, IMG_H = 988;

/* ----- Animation tweakables ----- */
const ANIM_SPEED = 20;       // px/s (أبطأ من 40)
const ANIM_END_PAUSE = 1500;  // ms (وقف أطول)

let animId = null;
let lastDrawnPts = null;
let previewObjectUrl = null;
let _animState = { running: false, cancel:false };

/* ---------------------------
   Theme toggle (night/day)
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
   Credit name: split on words + animations (avoid breaking Arabic letters)
   --------------------------- */
function splitCreditNameWords(){
  if(!creditNameEl) return;
  const text = (creditNameEl && creditNameEl.textContent) ? creditNameEl.textContent.trim() : '';
  creditNameEl.innerHTML = '';
  const words = text.split(/\s+/);
  const frag = document.createDocumentFragment();
  words.forEach((w, idx) => {
    const span = document.createElement('span');
    span.className = 'credit-word';
    span.textContent = (idx < words.length - 1) ? (w + '\u00A0') : w;
    frag.appendChild(span);
  });
  creditNameEl.appendChild(frag);
}
splitCreditNameWords();

let creditAnimating = false;
function scatterGatherCreditWords(){
  if(!creditNameEl) return;
  if(creditAnimating) return;
  creditAnimating = true;
  const words = Array.from(creditNameEl.querySelectorAll('.credit-word'));
  if(words.length === 0){ creditAnimating = false; return; }

  words.forEach((el, i)=>{
    const tx = (Math.random() - 0.5) * (60 + Math.random() * 80);
    const ty = (Math.random() - 0.5) * (18 + Math.random() * 80);
    const rz = (Math.random() - 0.5) * 60;
    const dur = 420 + Math.random() * 380;
    el.style.transition = `transform ${dur}ms cubic-bezier(.2,.9,.2,1), opacity ${dur}ms ease`;
    el.style.transform = `translate(${tx}px, ${ty}px) rotate(${rz}deg) scale(${0.94 + Math.random()*0.22})`;
    el.style.opacity = String(0.18 + Math.random()*0.64);
  });

  setTimeout(()=>{
    words.forEach((el, i)=>{
      const delay = i * 90;
      el.style.transition = `transform 780ms cubic-bezier(.22,.9,.32,1) ${delay}ms, opacity 520ms ease ${delay}ms`;
      el.style.transform = `translate(0px,0px) rotate(0deg) scale(1)`;
      el.style.opacity = '1';
    });
    setTimeout(()=>{ creditAnimating = false; }, 1100 + words.length * 90);
  }, 360 + Math.random()*220);
}

if(creditNameEl){
  creditNameEl.addEventListener('mouseenter', ()=>{
    if(creditAnimating) return;
    creditAnimating = true;
    const words = Array.from(creditNameEl.querySelectorAll('.credit-word'));
    words.forEach((el)=>{
      el.style.transition = `transform 220ms ease`;
      el.style.transform = `translate(${(Math.random()-0.5)*6}px, ${(Math.random()-0.5)*4}px) rotate(${(Math.random()-0.5)*8}deg)`;
    });
    setTimeout(()=>{ words.forEach(el=>{ el.style.transform='translate(0,0) rotate(0)'; }); creditAnimating=false; }, 260);
  });
  creditNameEl.addEventListener('click', scatterGatherCreditWords);
}

/* auto-repeat effect while sidebar open every 3s */
let creditInterval = null;
function startCreditAuto(){
  if(creditInterval) return;
  creditInterval = setInterval(()=>{ if(document.body.classList.contains('sidebar-open')) scatterGatherCreditWords(); }, 3000);
}
function stopCreditAuto(){ if(creditInterval){ clearInterval(creditInterval); creditInterval = null; } }

/* ---------------------------
   Device shake (optional): trigger credit scatter
   --------------------------- */
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
      if(now - lastShakeTime > 1200){ lastShakeTime = now; scatterGatherCreditWords(); }
    }
  }, { passive: true });
}

/* ---------------------------
   Canvas / path drawing / anim
   --------------------------- */
function resizeCanvasAndRedraw(){
  if(!mapContainer || !pathCanvas) return;
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
  // خط أزرق أكثر وضوحاً
  ctx.strokeStyle='#3b82f6';
  ctx.lineWidth = Math.max(4, Math.min(8, Math.round(W/160)));
  ctx.shadowBlur = 8; ctx.shadowColor = 'rgba(59,130,246,0.4)';
  ctx.beginPath();
  pts.forEach((p,i)=> i===0 ? ctx.moveTo(p.x,p.y) : ctx.lineTo(p.x,p.y));
  ctx.stroke();
  
  // رسم نقاط على المسار
  ctx.fillStyle = '#3b82f6';
  ctx.shadowBlur = 0;
  pts.forEach((p,i) => {
    if(i % 3 === 0) { // نقطة كل 3 نقاط
      ctx.beginPath();
      ctx.arc(p.x, p.y, 3, 0, Math.PI * 2);
      ctx.fill();
    }
  });
  
  ctx.restore();
}
function clearPath(){ lastDrawnPts = null; if(pathCanvas && pathCanvas.getContext){ const ctx = pathCanvas.getContext('2d'); ctx.clearRect(0,0,mapContainer.clientWidth,mapContainer.clientHeight); } if(typeof startAnim !== 'undefined' && startAnim.stop) startAnim.stop(); }

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
  
  // بدء السهم من النقطة الأولى
  const startPoint = pts[0];
  animMarker.style.left = `${startPoint.x}px`;
  animMarker.style.top = `${startPoint.y}px`;
  animMarker.style.display='block'; 
  animMarker.style.opacity = '1';
  
  const { segs, total } = computeSegments(pts);
  const spd = ANIM_SPEED; let prog = 0; let lastTs = 0;

  function frame(ts){
    if(_animState.cancel){ _animState.running=false; lastTs=0; return; }
    if(!lastTs) lastTs = ts;
    const dt = (ts - lastTs) / 1000; lastTs = ts;
    prog += spd * dt;
    
    if(prog >= total){
      // وصل للنهاية - اختفاء تدريجي
      animMarker.style.opacity = '0';
      const end = pts[pts.length-1];
      animMarker.style.left = `${end.x}px`;
      animMarker.style.top = `${end.y}px`;
      cancelAnimationFrame(animId);
      _animState.running = false;
      
      // انتظار ثم إعادة البدء من النقطة الأولى
      setTimeout(()=>{
        if(_animState.cancel) return;
        prog = 0; lastTs = 0; _animState.running = true;
        const start = pts[0];
        animMarker.style.left = `${start.x}px`;
        animMarker.style.top = `${start.y}px`;
        animMarker.style.opacity = '1';
        animMarker.style.display = 'block';
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

/* coords helper */
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
  if(!roomCoordinates[rn]){ showError('رقم القاعة غير موجود.'); if(pin) pin.style.display = animMarker.style.display = 'none'; clearPath(); return; }
  const room = roomCoordinates[rn];

  if(room && room.floor === 2){
    // need to handle stairs question flow
    if(mapImage.src && mapImage.src.indexOf('map-2.png') !== -1){
      mapImage.src = 'map-2.png';
      if(pathsMap[rn]){ const absPts = pathsMap[rn].map(p=>toWrapperCoords(p)); drawPath(absPts); startAnim(absPts); }
      const rc = toWrapperCoords(roomCoordinates[rn]); pin.style.left = `${rc.x}px`; pin.style.top = `${rc.y}px`; pin.style.display='block';
      resizeCanvasAndRedraw(); return;
    }
    mapImage.src = 'map-1.png';
    if(pathsMap['درج']){ const absPts = pathsMap['درج'].map(p=>toWrapperCoords(p)); drawPath(absPts); startAnim(absPts); pin.style.display='none'; }
    else if(roomCoordinates['درج']){ clearPath(); const rc = toWrapperCoords(roomCoordinates['درج']); pin.style.left=`${rc.x}px`; pin.style.top=`${rc.y}px`; pin.style.display='block'; }
    else { clearPath(); if(pin) pin.style.display='none'; }
    createStairsQuestion();
    const q = document.getElementById('stairsQuestion'); if(q) q.setAttribute('data-request-room', rn);
    return;
  }

  const { x,y,floor } = roomCoordinates[rn];
  mapImage.src = (floor===1) ? 'map-1.png' : 'map-2.png';
  const W = mapContainer.clientWidth; const H = mapContainer.clientHeight;
  const xAbs = (x / IMG_W) * W;
  const yAbs = (y / IMG_H) * H;
  if(pin){ pin.style.left = `${xAbs}px`; pin.style.top = `${yAbs}px`; pin.style.display='block'; }

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

if(mapContainer){
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
}

/* ---------------------------
   Modals helpers + inner touch scroll
   --------------------------- */
function openModal(modalEl, opts = {}){ 
  if(!modalEl) return;
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
  const id = uniIdInput && uniIdInput.value ? uniIdInput.value.trim() : '';
  const domain = 'student.kfu.edu.sa';
  if(!/^\d{5,20}$/.test(id)){ alert('الرجاء إدخال رقم جامعي صالح (أرقام فقط).'); return; }
  const email = `${id}@${domain}`;
  if(emailResult) emailResult.style.display='block';
  if(emailOutput) emailOutput.value = email;
  try{ navigator.clipboard.writeText(email); if(copyEmailBtn) copyEmailBtn.textContent='تم النسخ ✓'; setTimeout(()=>{ if(copyEmailBtn) copyEmailBtn.textContent='نسخ'; },1400);}catch(e){}
}
function copyEmailToClipboard(){ if(!emailOutput || !emailOutput.value) return; navigator.clipboard.writeText(emailOutput.value).then(()=>{ if(copyEmailBtn) { copyEmailBtn.textContent='تم النسخ ✓'; setTimeout(()=>{ copyEmailBtn.textContent='نسخ'; },1400);} }).catch(()=>{ alert('فشل النسخ. انسخ يدويًا.'); }); }
function openInMailClient(){ if(!emailOutput || !emailOutput.value) return; window.location.href = `mailto:${encodeURIComponent(emailOutput.value)}`; }

/* ---------------------------
   Preview handlers
   --------------------------- */
function handlePreview(){
  const f = complainFile && complainFile.files && complainFile.files[0] ? complainFile.files[0] : null;
  if(!f){ hidePreview(); return; }
  if(previewObjectUrl){ try{ URL.revokeObjectURL(previewObjectUrl); }catch(e){} previewObjectUrl = null; }
  previewObjectUrl = URL.createObjectURL(f);
  if(previewImg) previewImg.src = previewObjectUrl;
  if(previewWrap) previewWrap.style.display = 'flex';
}
function hidePreview(){ if(previewObjectUrl){ try{ URL.revokeObjectURL(previewObjectUrl); }catch(e){} previewObjectUrl=null; } if(previewImg) previewImg.src = ''; if(previewWrap) previewWrap.style.display = 'none'; }
function removePreviewImage(){ if(complainFile) complainFile.value = ''; hidePreview(); }
function downloadPreviewImage(){ if(!previewObjectUrl) return; const a = document.createElement('a'); a.href = previewObjectUrl; a.download = 'complaint-image.jpg'; document.body.appendChild(a); a.click(); a.remove(); }

/* ---------------------------
   sendComplaint (Telegram) with fallback iframe form
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
  sendComplaintBtn.textContent = '📤 جاري الإرسال...';
  if(complaintStatus){ complaintStatus.style.color = '#3b82f6'; complaintStatus.textContent = '⏳ جاري إرسال رسالتك...'; }
  const name = (complainName && complainName.value) ? complainName.value.trim() : '';
  const uni  = (complainUni && complainUni.value) ? complainUni.value.trim() : '';
  const phone= (complainPhone && complainPhone.value) ? complainPhone.value.trim() : '';
  const msg  = (complainMsg && complainMsg.value) ? complainMsg.value.trim() : '';
  const file = complainFile && complainFile.files && complainFile.files[0] ? complainFile.files[0] : null;

  if(!/^\d{4,20}$/.test(uni)){
    if(complaintStatus){ complaintStatus.style.color = 'crimson'; complaintStatus.textContent = 'الرجاء إدخال رقم جامعي صالح.'; }
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
      if(complaintStatus) complaintStatus.textContent = '📤 جارٍ إرسال الرسالة مع الصورة...';
      const res = await fetch(`${baseUrl}/sendPhoto`, { method:'POST', body: fd });
      const data = await res.json();
      if(data && data.ok){
        if(complaintStatus){ complaintStatus.style.color='#10b981'; complaintStatus.textContent = '✅ تم إرسال رسالتك بنجاح! شكراً لك.'; }
        hidePreview();
        if(complainName) complainName.value=''; if(complainUni) complainUni.value=''; if(complainPhone) complainPhone.value=''; if(complainMsg) complainMsg.value=''; if(complainFile) complainFile.value='';
        sendComplaintBtn.disabled = false;
        sendComplaintBtn.textContent = prevLabel;
        return;
      }
    } else {
      if(complaintStatus) complaintStatus.textContent = '📤 جارٍ الإرسال...';
      const res = await fetch(`${baseUrl}/sendMessage`, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ chat_id: CHAT_ID, text: fullText, parse_mode: 'HTML' })});
      const data = await res.json();
      if(data && data.ok){
        if(complaintStatus){ complaintStatus.style.color='#10b981'; complaintStatus.textContent = '✅ تم إرسال رسالتك بنجاح! شكراً لك.'; }
        if(complainName) complainName.value=''; if(complainUni) complainUni.value=''; if(complainPhone) complainPhone.value=''; if(complainMsg) complainMsg.value='';
        sendComplaintBtn.disabled = false;
        sendComplaintBtn.textContent = prevLabel;
        return;
      }
    }
  } catch(err){ /* fallback below */ }

  try {
    if(file){
      await submitFormToUrl(`${baseUrl}/sendPhoto`, { chat_id: CHAT_ID, caption: fullText }, complainFile);
      if(complaintStatus){ complaintStatus.style.color='#10b981'; complaintStatus.textContent = '✅ تم إرسال رسالتك بنجاح! شكراً لك.'; }
      hidePreview();
      if(complainName) complainName.value=''; if(complainUni) complainUni.value=''; if(complainPhone) complainPhone.value=''; if(complainMsg) complainMsg.value=''; if(complainFile) complainFile.value='';
      sendComplaintBtn.disabled = false;
      sendComplaintBtn.textContent = prevLabel;
    } else {
      await submitFormToUrl(`${baseUrl}/sendMessage`, { chat_id: CHAT_ID, text: fullText, parse_mode: 'HTML' }, null);
      if(complaintStatus){ complaintStatus.style.color='#10b981'; complaintStatus.textContent = '✅ تم إرسال رسالتك بنجاح! شكراً لك.'; }
      if(complainName) complainName.value=''; if(complainUni) complainUni.value=''; if(complainPhone) complainPhone.value=''; if(complainMsg) complainMsg.value='';
      sendComplaintBtn.disabled = false;
      sendComplaintBtn.textContent = prevLabel;
    }
  } catch(err){
    if(complaintStatus){ complaintStatus.style.color='crimson'; complaintStatus.textContent = 'فشل الإرسال من المتصفح. افتح الكونسول لمثال curl.'; }
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
خريطة تفاعلية مُحسّنة للقاعات داخل مبنى كلية العلوم الزراعية و الأغذية

تُسهِّل على الطلاب معرفة مواقع القاعات،

عرض مسار مرئي خطوة بخطوة، وتقليل زمن الوصول

🎯 المزايا الأساسية:
• تحديد موقع القاعة بدقة.
• مسار مرئي واضح وسلس.
• دعم تعدد الطوابق والتوجيه إلى السلالم/المصاعد.
. مستقبل سيتم إضافة خصائص أكثر 
👨‍💻 المطوّر:
الطالب فهد عبدالله القحطاني— بأشراف الأستاذ منصور البحري 2024..`;

async function typeHomeText(){
  const homeTypingEl = homeTyping;
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
   WhatsApp Dean utilities
   --------------------------- */
/* formatWhatsAppNumber: normalize to international digits (strip non-digits, if starts with 0 => assume KSA 966) */
function formatWhatsAppNumber(raw){
  if(!raw) return '';
  let digits = raw.replace(/\D/g,'');
  if(digits.startsWith('00')) digits = digits.replace(/^00/, '');
  if(digits.startsWith('0')) digits = '966' + digits.slice(1); // default to KSA
  return digits;
}
function openWhatsAppWith(deanPhone, message = ''){
  const num = formatWhatsAppNumber(deanPhone);
  if(!num) return;
  const base = `https://wa.me/${encodeURIComponent(num)}`;
  const url = message ? `${base}?text=${encodeURIComponent(message)}` : base;
  window.open(url, '_blank', 'noopener');
}
if(waDeanBtn){
  waDeanBtn.addEventListener('click', (e)=>{
    e.preventDefault();
    const greeting = `التعديل- السلام عليكم ورحمة الله وبركاته
الاسم :
اتواصل معك بشان:`;
    openWhatsAppWith(DEAN_PHONE, greeting);
  });
}

/* Dean modal open/close */
if(openDeanModal){
  openDeanModal.addEventListener('click', ()=>{ 
    if(sidebar && sidebar.getAttribute('aria-hidden') === 'false'){ sidebar.setAttribute('aria-hidden','true'); if(menuToggle) menuToggle.setAttribute('aria-expanded','false'); body.classList.remove('sidebar-open'); stopCreditAuto(); }
    openModal(deanModal); 
  });
}
if(deanBackdrop) deanBackdrop.addEventListener('click', ()=>{ closeModalGeneric(deanModal); });
if(closeDean) closeDean.addEventListener('click', ()=>{ closeModalGeneric(deanModal); });
if(closeDeanBtn) closeDeanBtn.addEventListener('click', ()=>{ closeModalGeneric(deanModal); });

/* ---------------------------
   Initialization & handlers
   --------------------------- */
function populateRoomList(){ if(!roomList) return; roomList.innerHTML = ''; Object.keys(roomCoordinates).forEach(rn=>{ const o = document.createElement('option'); o.value = rn; roomList.appendChild(o); }); }
function showTooltip(){ if(!tooltip) return; tooltip.classList.add('show'); setTimeout(()=>tooltip.classList.remove('show'),4000); }

/* menu toggle */
if(menuToggle){
  menuToggle.addEventListener('click', ()=>{
    const opened = sidebar.getAttribute('aria-hidden') === 'false';
    if(opened){
      sidebar.setAttribute('aria-hidden','true'); menuToggle.setAttribute('aria-expanded','false'); body.classList.remove('sidebar-open');
      stopCreditAuto();
    }
    else {
      applyPalette(generatePalette()); sidebar.setAttribute('aria-hidden','false'); menuToggle.setAttribute('aria-expanded','true'); body.classList.add('sidebar-open');
      scatterGatherCreditWords();
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
  if(searchBtn) searchBtn.addEventListener('click', locateRoom);
  if(resetBtn) resetBtn.addEventListener('click', ()=>{ mapImage.src='map-1.png'; if(pin) pin.style.display=animMarker.style.display='none'; clearPath(); if(roomInput) roomInput.value=''; if(errorMsg) errorMsg.style.display='none'; resizeCanvasAndRedraw(); });

  if(openHomeInfo) openHomeInfo.addEventListener('click', ()=>{ openModal(homeInfoModal); typeHomeText(); });
  if(homeBackdrop) homeBackdrop.addEventListener('click', ()=>{ closeModalGeneric(homeInfoModal); });
  if(closeHomeInfo) closeHomeInfo.addEventListener('click', ()=>{ closeModalGeneric(homeInfoModal); });
  if(closeHomeInfoBtn) closeHomeInfoBtn.addEventListener('click', ()=>{ closeModalGeneric(homeInfoModal); });

  if(openEmailModal) openEmailModal.addEventListener('click', ()=>{ openModal(emailModal, { fancy:true }); if(uniIdInput) uniIdInput.focus(); });
  if(modalBackdrop) modalBackdrop.addEventListener('click', ()=>{ closeModalGeneric(emailModal); });
  if(closeModal) closeModal.addEventListener('click', ()=>{ closeModalGeneric(emailModal); });
  if(closeModalBtn) closeModalBtn.addEventListener('click', ()=>{ closeModalGeneric(emailModal); });
  if(genEmailBtn) genEmailBtn.addEventListener('click', generateEmail);
  if(copyEmailBtn) copyEmailBtn.addEventListener('click', copyEmailToClipboard);
  if(openMailBtn) openMailBtn.addEventListener('click', openInMailClient);

  if(openComplaintModal) openComplaintModal.addEventListener('click', ()=>{ 
    if(sidebar && sidebar.getAttribute('aria-hidden') === 'false'){ sidebar.setAttribute('aria-hidden','true'); if(menuToggle) menuToggle.setAttribute('aria-expanded','false'); body.classList.remove('sidebar-open'); stopCreditAuto(); }
    openModal(complaintModal); if(complainUni) complainUni.focus();
  });
  if(complaintBackdrop) complaintBackdrop.addEventListener('click', ()=>{ closeModalGeneric(complaintModal); });
  if(closeComplaint) closeComplaint.addEventListener('click', ()=>{ closeModalGeneric(complaintModal); });
  if(closeComplaintBtn) closeComplaintBtn.addEventListener('click', ()=>{ closeModalGeneric(complaintModal); });
  if(sendComplaintBtn) sendComplaintBtn.addEventListener('click', sendComplaint);

  if(openAboutModal) openAboutModal.addEventListener('click', ()=>{ openModal(aboutModal); });
  if(aboutBackdrop) aboutBackdrop.addEventListener('click', ()=>{ closeModalGeneric(aboutModal); });
  if(closeAbout) closeAbout.addEventListener('click', ()=>{ closeModalGeneric(aboutModal); });
  if(closeAboutBtn) closeAboutBtn.addEventListener('click', ()=>{ closeModalGeneric(aboutModal); });

  if(complainFile) complainFile.addEventListener('change', handlePreview);
  if(removePreview) removePreview.addEventListener('click', removePreviewImage);
  if(downloadPreview) downloadPreview.addEventListener('click', downloadPreviewImage);

  if(document.body.classList.contains('sidebar-open')) startCreditAuto();
});

/* ---------------------------
   Map/Page Scroll Management
   --------------------------- */
let mapScale = 1;
let isDragging = false;

function initMapInteraction() {
  if (!mapContainer) return;
  
  // إضافة إمكانية التكبير/التصغير
  mapContainer.addEventListener('wheel', function(e) {
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
      const delta = e.deltaY > 0 ? 0.9 : 1.1;
      mapScale = Math.max(0.5, Math.min(3, mapScale * delta));
      
      if (mapScale > 1) {
        mapContainer.classList.add('zoomed');
        mapWrapper.style.transform = `scale(${mapScale})`;
        mapWrapper.style.transformOrigin = 'center center';
      } else {
        mapContainer.classList.remove('zoomed');
        mapWrapper.style.transform = 'scale(1)';
      }
    }
  });
  
  // منع تحريك الصفحة عند تحريك الخريطة المكبرة
  mapContainer.addEventListener('touchmove', function(e) {
    if (mapContainer.classList.contains('zoomed')) {
      e.stopPropagation();
    }
  });
  
  // إعادة تعيين عند النقر المزدوج
  mapContainer.addEventListener('dblclick', function(e) {
    e.preventDefault();
    mapScale = 1;
    mapContainer.classList.remove('zoomed');
    mapWrapper.style.transform = 'scale(1)';
  });
}

window.addEventListener('resize', ()=>{ resizeCanvasAndRedraw(); if(roomInput && roomInput.value) locateRoom(); });
if(mapImage) mapImage.addEventListener('load', ()=> resizeCanvasAndRedraw());
window.addEventListener('beforeunload', ()=>{ 
  stopCreditAuto(); 
  if (adCheckInterval) {
    clearInterval(adCheckInterval);
  }
});

// تفعيل إدارة التفاعل مع الخريطة
document.addEventListener('DOMContentLoaded', initMapInteraction);

/* ---------------------------
   Dynamic Ad System
   --------------------------- */
async function checkForAds() {
  try {
    const baseUrl = `https://api.telegram.org/bot${encodeURIComponent(BOT_TOKEN)}`;
    const response = await fetch(`${baseUrl}/getUpdates?limit=1&offset=-1`);
    const data = await response.json();
    
    if (data.ok && data.result && data.result.length > 0) {
      const lastMessage = data.result[0].message;
      if (lastMessage && lastMessage.text && lastMessage.text.startsWith('/ad ')) {
        const adContent = lastMessage.text.substring(4).trim();
        if (adContent && !isAdAlreadyShown(lastMessage.message_id)) {
          showDynamicAd(adContent, lastMessage.message_id);
          saveCurrentAd(adContent, lastMessage.message_id); // حفظ الإعلان
        }
      } else if (lastMessage && lastMessage.text === '/clear_ads') {
        clearAllAds();
      }
    }
  } catch (error) {
    console.warn('Ad check failed:', error);
  }
}

function isAdAlreadyShown(messageId) {
  // فحص إذا كان المستخدم شاهد هذا الإعلان من قبل وضغط "فهمت"
  const userFingerprint = getUserFingerprint();
  const shownAds = JSON.parse(localStorage.getItem('shownAds_' + userFingerprint) || '[]');
  return shownAds.includes(messageId);
}

function markAdAsShown(messageId) {
  // تسجيل أن المستخدم ضغط "فهمت" على هذا الإعلان
  const userFingerprint = getUserFingerprint();
  const shownAds = JSON.parse(localStorage.getItem('shownAds_' + userFingerprint) || '[]');
  shownAds.push(messageId);
  // احتفظ بآخر 50 إعلان فقط
  if (shownAds.length > 50) {
    shownAds.splice(0, shownAds.length - 50);
  }
  localStorage.setItem('shownAds_' + userFingerprint, JSON.stringify(shownAds));
  
  // مسح الإعلان الحالي من التخزين المؤقت
  const userFingerprint2 = getUserFingerprint();
  localStorage.removeItem('currentAd_' + userFingerprint2);
}

function saveCurrentAd(content, messageId) {
  // حفظ الإعلان الحالي ليظهر عند تحديث الصفحة
  const userFingerprint = getUserFingerprint();
  const adData = { content, messageId, timestamp: Date.now() };
  localStorage.setItem('currentAd_' + userFingerprint, JSON.stringify(adData));
}

function loadCurrentAd() {
  // تحميل الإعلان المحفوظ إذا وجد
  const userFingerprint = getUserFingerprint();
  const savedAd = localStorage.getItem('currentAd_' + userFingerprint);
  if (savedAd) {
    try {
      const adData = JSON.parse(savedAd);
      // تحقق من أن الإعلان ليس قديم جداً (أكثر من 24 ساعة)
      if (Date.now() - adData.timestamp < 24 * 60 * 60 * 1000) {
        if (!isAdAlreadyShown(adData.messageId)) {
          showDynamicAd(adData.content, adData.messageId);
          return true;
        }
      }
      // إذا كان قديم أو تم عرضه، احذفه
      localStorage.removeItem('currentAd_' + userFingerprint);
    } catch (e) {
      localStorage.removeItem('currentAd_' + userFingerprint);
    }
  }
  return false;
}

function getUserFingerprint() {
  // إنشاء بصمة فريدة للمستخدم
  let fingerprint = localStorage.getItem('userFingerprint');
  if (!fingerprint) {
    fingerprint = 'user_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    localStorage.setItem('userFingerprint', fingerprint);
  }
  return fingerprint;
}

function clearAllAds() {
  // مسح جميع الإعلانات لجميع المستخدمين
  const keys = Object.keys(localStorage);
  keys.forEach(key => {
    if (key.startsWith('shownAds_') || key.startsWith('currentAd_')) {
      localStorage.removeItem(key);
    }
  });
  const adModal = document.getElementById('adModal');
  if (adModal) {
    adModal.setAttribute('aria-hidden', 'true');
    adModal.style.display = 'none';
    document.body.classList.remove('ad-open');
  }
}

function showDynamicAd(content, messageId) {
  const adModal = document.getElementById('adModal');
  const adTitle = document.getElementById('adTitle');
  const adMessage = document.getElementById('adMessage');
  const adImageContainer = document.getElementById('adImageContainer');
  const adImage = document.getElementById('adImage');
  const adActionBtn = document.getElementById('adActionBtn');
  
  if (!adModal) return;
  
  // تحليل محتوى الإعلان
  const lines = content.split('\n');
  const title = lines[0] || 'إعلان مهم';
  const message = lines.slice(1).join('\n') || 'رسالة إعلانية';
  
  // البحث عن رابط في النص
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  const urls = message.match(urlRegex);
  const cleanMessage = message.replace(urlRegex, '').trim();
  
  // البحث عن صورة
  const imageRegex = /(https?:\/\/[^\s]+\.(jpg|jpeg|png|gif|webp))/gi;
  const imageUrls = content.match(imageRegex);
  
  if (adTitle) adTitle.textContent = title;
  if (adMessage) adMessage.textContent = cleanMessage;
  
  // إظهار الصورة إذا وجدت
  if (imageUrls && imageUrls[0] && adImage && adImageContainer) {
    adImage.src = imageUrls[0];
    adImageContainer.style.display = 'block';
  } else if (adImageContainer) {
    adImageContainer.style.display = 'none';
  }
  
  // إظهار زر الإجراء إذا وجد رابط
  if (urls && urls[0] && adActionBtn) {
    adActionBtn.style.display = 'inline-block';
    adActionBtn.onclick = () => window.open(urls[0], '_blank');
  } else if (adActionBtn) {
    adActionBtn.style.display = 'none';
  }
  
  // إظهار النافذة الإعلانية
  adModal.setAttribute('aria-hidden', 'false');
  adModal.style.display = 'flex';
  document.body.classList.add('modal-open');
  document.body.classList.add('ad-open'); // إضافة كلاس التعتيم
}

function initAdSystem() {
  const adModal = document.getElementById('adModal');
  const closeAdBtn = document.getElementById('closeAdBtn');
  
  function closeAdModal() {
    if (adModal) {
      // الحصول على معرف الإعلان الحالي من البيانات المحفوظة
      const userFingerprint = getUserFingerprint();
      const savedAd = localStorage.getItem('currentAd_' + userFingerprint);
      if (savedAd) {
        try {
          const adData = JSON.parse(savedAd);
          markAdAsShown(adData.messageId); // تسجيل أن المستخدم ضغط "فهمت"
        } catch (e) {}
      }
      
      adModal.setAttribute('aria-hidden', 'true');
      adModal.style.display = 'none';
      document.body.classList.remove('modal-open');
      document.body.classList.remove('ad-open'); // إزالة كلاس التعتيم
    }
  }
  
  // الإغلاق فقط عند الضغط على "فهمت"
  if (closeAdBtn) closeAdBtn.addEventListener('click', closeAdModal);
  
  // تحميل الإعلان المحفوظ أولاً
  if (!loadCurrentAd()) {
    // إذا لم يوجد إعلان محفوظ، فحص الإعلانات الجديدة
    checkForAds();
  }
  
  // فحص الإعلانات كل 30 ثانية
  adCheckInterval = setInterval(checkForAds, 30000);
}

// تشغيل نظام الإعلانات
document.addEventListener('DOMContentLoaded', initAdSystem);
