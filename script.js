/* رقم العميد (ضع الرقم هنا بصيغة محلية أو دولية) */
const DEAN_PHONE = '0135895711';

/* Telegram Bot Configuration */
const TELEGRAM_BOT_TOKEN = '8255886307:AAExiaoy_30ClKvZnkoG9LTRetwYhOED3mg';
const TELEGRAM_CHAT_ID = '7821474319';

/* ----- DOM ----- */
const body = document.body;
const welcomeScreen = document.getElementById('welcomeScreen');
const enterMapBtn = document.getElementById('enterMapBtn');
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

const openAboutModal = document.getElementById('openAboutModal');
const aboutModal = document.getElementById('aboutModal');
const aboutBackdrop = document.getElementById('aboutBackdrop');
const closeAbout = document.getElementById('closeAbout');
const closeAboutBtn = document.getElementById('closeAboutBtn');

const openDoctorModal = document.getElementById('openDoctorModal');
const doctorModal = document.getElementById('doctorModal');
const doctorBackdrop = document.getElementById('doctorBackdrop');
const closeDoctor = document.getElementById('closeDoctor');
const closeDoctorBtn = document.getElementById('closeDoctorBtn');
const doctorSearchInput = document.getElementById('doctorSearchInput');
const doctorList = document.getElementById('doctorList');

const waDeanBtn = document.getElementById('waDeanBtn');
const openDeanModal = document.getElementById('openDeanModal');
const deanModal = document.getElementById('deanModal');
const deanBackdrop = document.getElementById('deanBackdrop');
const closeDean = document.getElementById('closeDean');
const closeDeanBtn = document.getElementById('closeDeanBtn');

const themeBtn = document.getElementById('theme-toggle');

/* ----- خرائط/بيانات خارجية ----- */
const roomCoordinates = window.roomCoordinates || {};
let pathsMap          = window.pathsMap || {}; // سيتم تحميله عند الطلب (lazy-load)
let pathsLoading      = false; // علامة لمنع التحميل المتكرر
let pathsLoaded       = false; // علامة لتتبع حالة التحميل

/* ----- ثابتات الخريطة ----- */
const IMG_W = 901, IMG_H = 988;

/* ----- Animation tweakables ----- */
const ANIM_SPEED = 15;        // px/s (سرعة أبطأ وأكثر وضوحاً)
const ANIM_END_PAUSE = 1000;  // ms (وقفة أطول عند النهاية)

let animId = null;
let animPaused = false;       // حالة إيقاف مؤقت للحركة
let previewObjectUrl = null;
let seg = 0, t = 0, lastTs = 0;
let currentAnimPts = null;    // النقاط الحالية للحركة (يتم تحديثها عند التكبير)

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
  // الوضع النهاري افتراضياً (حتى لو كان النظام في الوضع الليلي)
  document.body.classList.remove('dark');
  if(themeBtn) themeBtn.textContent = '🌙';
  localStorage.setItem('theme', 'light');
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
let lastDrawnPts = null;      // المسار المحول للعرض
let originalPathData = null;  // المسار الأصلي من pathsMap

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
  ctx.clearRect(0, 0, W, H);
  
  // إعادة رسم المسار والأنيميشن من البيانات الأصلية
  if(originalPathData && originalPathData.length > 0) {
    const absPts = originalPathData.map(p => toWrapperCoords(p));
    drawPath(absPts);
    
    // تحديث النقاط الحالية للحركة
    currentAnimPts = absPts;
    
    // تحديث موقع المثلث الحالي بدون إعادة تشغيل الحركة
    if(animMarker && animMarker.style.display === 'block' && seg < absPts.length - 1){
      const p0 = absPts[seg];
      const p1 = absPts[seg + 1];
      if(p0 && p1){
        const dx = p1.x - p0.x;
        const dy = p1.y - p0.y;
        const cx = p0.x + dx * t;
        const cy = p0.y + dy * t;
        animMarker.style.left = `${cx}px`;
        animMarker.style.top = `${cy}px`;
        const ang = Math.atan2(dy, dx) * 180 / Math.PI + 90;
        animMarker.style.transform = `translate(-50%,-50%) rotate(${ang}deg)`;
      }
    }
  }
}

function drawPath(pts){
  lastDrawnPts = pts.slice();
  const W = mapContainer.clientWidth;
  const H = mapContainer.clientHeight;
  const DPR = window.devicePixelRatio || 1;
  const ctx = pathCanvas.getContext('2d');
  
  ctx.clearRect(0, 0, pathCanvas.width, pathCanvas.height);
  ctx.save();
  ctx.lineJoin = 'round'; 
  ctx.lineCap = 'round';
  
  // خط أزرق واضح
  ctx.strokeStyle = 'rgba(59, 130, 246, 0.85)';
  ctx.lineWidth = Math.max(3, Math.min(5, Math.round(W/200)));
  ctx.shadowBlur = 5; 
  ctx.shadowColor = 'rgba(59, 130, 246, 0.5)';
  
  ctx.beginPath();
  pts.forEach((p,i)=> i===0 ? ctx.moveTo(p.x,p.y) : ctx.lineTo(p.x,p.y));
  ctx.stroke();
  
  ctx.restore();
}

function clearPath(){ 
  lastDrawnPts = null;
  originalPathData = null;  // مسح البيانات الأصلية
  if(pathCanvas && pathCanvas.getContext){ 
    const ctx = pathCanvas.getContext('2d'); 
    ctx.clearRect(0, 0, pathCanvas.width, pathCanvas.height); 
  } 
  cancelAnimationFrame(animId);
  seg = 0; t = 0; lastTs = 0;
  if(animMarker) animMarker.style.display = 'none';
}

// دالة التسهيل (ease-in-out)
function easeInOut(x) {
  return x < 0.5 ? 2 * x * x : 1 - Math.pow(-2 * x + 2, 2) / 2;
}

function startAnim(pts) {
  if(!pts || pts.length < 2) return;
  cancelAnimationFrame(animId);
  animPaused = false;
  seg = 0; t = 0; lastTs = 0;
  currentAnimPts = pts;  // حفظ النقاط الحالية
  
  // تأكد أن السهم ظاهر دائماً
  animMarker.style.display = 'block';
  animMarker.style.opacity = '1';
  const startPoint = pts[0];
  animMarker.style.left = `${startPoint.x}px`;
  animMarker.style.top = `${startPoint.y}px`;
  
  function animFrame(ts) {
    if (!lastTs) lastTs = ts;
    const dt = (ts - lastTs) / 1000;
    lastTs = ts;

    // استخدام النقاط الحالية المحدثة
    if(!currentAnimPts || currentAnimPts.length < 2) return;
    
    const p0 = currentAnimPts[seg];
    const p1 = currentAnimPts[seg + 1];
    if(!p0 || !p1) {
      // إعادة البدء من الأول
      seg = 0; t = 0;
      setTimeout(()=>{
        animId = requestAnimationFrame(animFrame);
      }, ANIM_END_PAUSE);
      return;
    }
    
    const dx = p1.x - p0.x;
    const dy = p1.y - p0.y;
    const dist = Math.hypot(dx, dy);

    // تطبيق التسهيل
    t += (ANIM_SPEED * dt) / dist;
    let tEase = easeInOut(Math.min(t, 1));

    if (t >= 1) {
      seg++;
      t = 0;
      if (seg >= pts.length - 1) {
        // وصل للنهاية - إعادة من البداية
        seg = 0;
        setTimeout(()=>{
          animId = requestAnimationFrame(animFrame);
        }, ANIM_END_PAUSE);
        return;
      }
      tEase = 0;
    }

    const cx = p0.x + dx * tEase;
    const cy = p0.y + dy * tEase;
    animMarker.style.left = `${cx}px`;
    animMarker.style.top = `${cy}px`;

    const ang = Math.atan2(dy, dx) * 180 / Math.PI + 90;
    animMarker.style.transform = `translate(-50%,-50%) rotate(${ang}deg)`;

    animId = requestAnimationFrame(animFrame);
  }
  
  animId = requestAnimationFrame(animFrame);
}

/* coords helper */
function toWrapperCoords(p){ 
  const W = mapContainer.clientWidth;
  const H = mapContainer.clientHeight;
  // تحويل من إحداثيات الصورة الأصلية (901×988) إلى حجم الحاوي
  return { 
    x: (p.x / IMG_W) * W, 
    y: (p.y / IMG_H) * H 
  }; 
}

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
      
      // حفظ البيانات الأصلية للمسار
      if(pathsMap[rn]){ 
        originalPathData = pathsMap[rn].slice();
        const absPts = pathsMap[rn].map(p=>toWrapperCoords(p)); 
        drawPath(absPts); 
        startAnim(absPts); 
      } else {
        clearPath();
      }
      
      const rc = toWrapperCoords(roomCoordinates[rn]); 
      pin.style.left=`${rc.x}px`; 
      pin.style.top=`${rc.y}px`; 
      pin.style.display='block';
      resizeCanvasAndRedraw();
    }
    removeStairsQuestion();
  };
  document.getElementById('stairsNo').onclick = ()=>{
    removeStairsQuestion(); 
    clearPath();
  };
}
function removeStairsQuestion(){ const el = document.getElementById('stairsQuestion'); if(el) el.remove(); }

function showError(text){ if(!errorMsg) return; errorMsg.textContent = text; errorMsg.style.display = 'block'; setTimeout(()=>{ errorMsg.style.display = 'none'; }, 3200); }

/* تحميل المسارات عند الطلب (lazy-load) لتحسين الأداء */
function loadPathsIfNeeded(callback) {
  // إذا كانت المسارات محمّلة بالفعل، نفّذ callback مباشرة
  if (pathsLoaded || window.pathsMap) {
    if (window.pathsMap && !pathsLoaded) {
      pathsMap = window.pathsMap;
      pathsLoaded = true;
    }
    callback();
    return;
  }
  
  // إذا كان التحميل جارياً، انتظر
  if (pathsLoading) {
    // انتظر حتى يكتمل التحميل
    const checkLoaded = setInterval(() => {
      if (pathsLoaded) {
        clearInterval(checkLoaded);
        callback();
      }
    }, 100);
    return;
  }
  
  // ابدأ التحميل
  pathsLoading = true;
  const script = document.createElement('script');
  script.src = 'paths.rel.js';
  script.onload = () => {
    pathsMap = window.pathsMap || {};
    pathsLoaded = true;
    pathsLoading = false;
    callback();
  };
  script.onerror = () => {
    pathsLoading = false;
    showError('فشل تحميل بيانات المسارات');
  };
  document.body.appendChild(script);
}

function locateRoom(){
  const rn = roomInput.value.trim();
  
  // إزالة سؤال الدرج إذا كان موجود
  removeStairsQuestion();
  
  if(!rn){ 
    showError('الرجاء إدخال رقم قاعة.'); 
    return; 
  }
  
  if(!roomCoordinates[rn]){ 
    showError('رقم القاعة غير موجود.'); 
    if(pin) pin.style.display = 'none';
    if(animMarker) animMarker.style.display = 'none';
    clearPath(); 
    return; 
  }
  
  // تحميل المسارات عند الطلب (lazy-load) قبل الاستخدام
  loadPathsIfNeeded(() => {
    const room = roomCoordinates[rn];
    const containerW = mapContainer.clientWidth;
    const containerH = mapContainer.clientHeight;

    // إذا كانت القاعة في الدور الثاني (floor: 2)
    if(room && room.floor === 2){
      // التحقق إذا كنا بالفعل في خريطة الدور الثاني
      if(mapImage.src && mapImage.src.indexOf('map-2.png') !== -1){
        // نحن في الدور الثاني بالفعل - اعرض القاعة مباشرة
        mapImage.src = 'map-2.png';
        
        // حفظ البيانات الأصلية للمسار
        if(pathsMap[rn]){ 
          originalPathData = pathsMap[rn].slice();
          const absPts = pathsMap[rn].map(p=>toWrapperCoords(p)); 
          drawPath(absPts); 
          startAnim(absPts); 
        } else {
          clearPath();
        }
        
        const rc = toWrapperCoords(roomCoordinates[rn]); 
        pin.style.left = `${rc.x}px`; 
        pin.style.top = `${rc.y}px`; 
        pin.style.display='block';
        resizeCanvasAndRedraw(); 
        return;
      }
      
      // نحن في الدور الأول - اعرض مسار الدرج
      mapImage.src = 'map-1.png';
      
      // حفظ البيانات الأصلية لمسار الدرج
      if(pathsMap['درج']){ 
        originalPathData = pathsMap['درج'].slice();
        const absPts = pathsMap['درج'].map(p=>toWrapperCoords(p)); 
        drawPath(absPts); 
        startAnim(absPts); 
        pin.style.display='none'; 
      } else if(roomCoordinates['درج']){ 
        clearPath(); 
        const rc = toWrapperCoords(roomCoordinates['درج']); 
        pin.style.left=`${rc.x}px`; 
        pin.style.top=`${rc.y}px`; 
        pin.style.display='block'; 
      } else { 
        clearPath(); 
        if(pin) pin.style.display='none'; 
      }
      
      // إضافة سؤال الدرج
      createStairsQuestion();
      const q = document.getElementById('stairsQuestion'); 
      if(q) q.setAttribute('data-request-room', rn);
      return;
    }

    // قاعة في الدور الأول
    const { x, y, floor } = roomCoordinates[rn];
    mapImage.src = (floor===1) ? 'map-1.png' : 'map-2.png';
    
    // تحويل الإحداثيات من الصورة الأصلية إلى حجم الحاوي
    const xAbs = (x / IMG_W) * containerW;
    const yAbs = (y / IMG_H) * containerH;
    
    if(pin){ 
      pin.style.left = `${xAbs}px`; 
      pin.style.top = `${yAbs}px`; 
      pin.style.display='block'; 
    }

    if(pathsMap[rn]){ 
      originalPathData = pathsMap[rn];  // حفظ البيانات الأصلية
      const absPts = originalPathData.map(p=>toWrapperCoords(p)); 
      drawPath(absPts); 
      startAnim(absPts); 
    } else { 
      clearPath(); 
    }
  });
}

/* ---------------------------
   Pan/Zoom touch + wheel (modal protection)
   --------------------------- */
let currentScale=1, initialScale=1, currentTrans={x:0,y:0}, initialTrans={x:0,y:0};
let touchStart=[], startDist=0, pinchCenter={x:0,y:0};

function setTransform(){
  const W = mapContainer.clientWidth;
  const H = mapContainer.clientHeight;
  const sW = W * currentScale;
  const sH = H * currentScale;
  
  currentTrans.x = (sW>W) ? Math.min(0, Math.max(W-sW, currentTrans.x)) : (W-sW)/2;
  currentTrans.y = (sH>H) ? Math.min(0, Math.max(H-sH, currentTrans.y)) : (H-sH)/2;
  
  if (currentScale > 1) {
    mapContainer.classList.add('zoomed');
  } else {
    mapContainer.classList.remove('zoomed');
  }
  
  if(mapWrapper){
    mapWrapper.style.transform = `translate(${currentTrans.x}px, ${currentTrans.y}px) scale(${currentScale})`;
    mapWrapper.style.transformOrigin = '0 0';
  }
  
  // إعادة رسم المسار بعد أي تغيير في التكبير أو الحركة
  if(lastDrawnPts && lastDrawnPts.length > 0){
    resizeCanvasAndRedraw();
  }
}

if(mapContainer){
  mapContainer.addEventListener('touchstart', e=>{
    if(document.body.classList.contains('modal-open')) return;
    if(e.touches.length===1){ 
      touchStart=[{x:e.touches[0].clientX,y:e.touches[0].clientY}]; 
      initialTrans={...currentTrans}; 
    }
    else if(e.touches.length===2){
      touchStart=[
        {x:e.touches[0].clientX,y:e.touches[0].clientY},
        {x:e.touches[1].clientX,y:e.touches[1].clientY}
      ];
      startDist = Math.hypot(touchStart[0].x-touchStart[1].x, touchStart[0].y-touchStart[1].y);
      initialScale = currentScale;
      const rect = mapContainer.getBoundingClientRect();
      pinchCenter = { 
        x: ((e.touches[0].clientX+e.touches[1].clientX)/2) - rect.left, 
        y: ((e.touches[0].clientY+e.touches[1].clientY)/2) - rect.top 
      };
      initialTrans = { ...currentTrans };
    }
  });
  
  mapContainer.addEventListener('touchmove', e=>{
    if(document.body.classList.contains('modal-open')) return;
    e.preventDefault();
    if(e.touches.length===1 && touchStart.length===1){
      const dx = e.touches[0].clientX - touchStart[0].x;
      const dy = e.touches[0].clientY - touchStart[0].y;
      currentTrans.x = initialTrans.x + dx; 
      currentTrans.y = initialTrans.y + dy; 
      setTransform();
    } else if(e.touches.length===2 && touchStart.length===2){
      const newDist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX, 
        e.touches[0].clientY - e.touches[1].clientY
      );
      currentScale = Math.min(Math.max(initialScale * (newDist / startDist), 1), 5);
      currentTrans.x = initialTrans.x - ((currentScale - initialScale)/initialScale) * pinchCenter.x;
      currentTrans.y = initialTrans.y - ((currentScale - initialScale)/initialScale) * pinchCenter.y;
      setTransform();
    }
  });
  
  mapContainer.addEventListener('wheel', e=>{
    e.preventDefault();
    const rect = mapContainer.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;
    const delta = (e.deltaY<0)? 1.1 : 0.9;
    const newScale = Math.min(Math.max(currentScale * delta, 1), 5);
    
    currentTrans.x -= (((newScale/currentScale)-1) * mx);
    currentTrans.y -= (((newScale/currentScale)-1) * my);
    currentScale = newScale;
    setTransform();
  });
}

/* ---------------------------
   Doctor Office Functions
   --------------------------- */
function populateDoctorList(filter = ''){
  if(!doctorList) return;
  doctorList.innerHTML = '';
  
  // التحقق من وجود بيانات الدكاترة
  if(!window.doctorsData || !Array.isArray(window.doctorsData)){
    doctorList.innerHTML = '<div style="padding:20px;text-align:center;color:var(--muted)">جاري تحميل البيانات...</div>';
    return;
  }
  
  const q = (filter || '').trim();
  const filtered = q
    ? window.doctorsData.filter(d => d.name.includes(q) || String(d.office).includes(q))
    : window.doctorsData;

  if(filtered.length === 0){
    doctorList.innerHTML = '<div class="doctor-empty">لا توجد نتائج مطابقة 🔍</div>';
    return;
  }

  filtered.forEach(doctor => {
    const hasMap = !!(window.roomCoordinates && window.roomCoordinates[doctor.office]);
    const item = document.createElement('div');
    item.className = 'doctor-item' + (hasMap ? '' : ' nomap');
    item.innerHTML = `
      <div class="doctor-office-chip">${doctor.office}</div>
      <div class="doctor-body">
        <div class="doctor-name">${doctor.name}</div>
        <div class="doctor-office">مكتب رقم ${doctor.office}</div>
      </div>`;
    item.onclick = () => {
      if(!hasMap){ toast('مكتب ' + doctor.office + ' غير متوفر على الخريطة'); return; }
      closeModalGeneric(doctorModal);
      if(roomInput) roomInput.value = doctor.office;
      locateRoom();
    };
    doctorList.appendChild(item);
  });
}

/* Toast خفيف (يعيد استخدام عنصر #tooltip) */
function toast(msg){
  const el = document.getElementById('tooltip');
  if(!el){ return; }
  el.textContent = msg;
  el.classList.add('show');
  clearTimeout(window.__toastT);
  window.__toastT = setTimeout(()=> el.classList.remove('show'), 2600);
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

/* ---------------------------
   sendComplaint (Telegram integration via CORS proxy)
   --------------------------- */
async function sendComplaint(){
  if(!sendComplaintBtn) return;
  sendComplaintBtn.disabled = true;
  const prevLabel = sendComplaintBtn.textContent;
  sendComplaintBtn.textContent = '📤 جاري الإرسال...';
  if(complaintStatus){ complaintStatus.style.color = '#1e40af'; complaintStatus.textContent = '⏳ جاري إرسال رسالتك...'; }
  
  const name = (complainName && complainName.value) ? complainName.value.trim() : '';
  const uni  = (complainUni && complainUni.value) ? complainUni.value.trim() : '';
  const phone= (complainPhone && complainPhone.value) ? complainPhone.value.trim() : '';
  const msg  = (complainMsg && complainMsg.value) ? complainMsg.value.trim() : '';
  const file = complainFile && complainFile.files && complainFile.files[0] ? complainFile.files[0] : null;

  // التحقق من الاسم (عربي فقط، بدون أرقام أو رموز)
  if(!name || !/^[\u0600-\u06FF\s]+$/.test(name)){
    if(complaintStatus){ complaintStatus.style.color = '#dc2626'; complaintStatus.textContent = '❌ الرجاء إدخال الاسم بالعربي فقط (بدون أرقام أو رموز).'; }
    sendComplaintBtn.disabled = false;
    sendComplaintBtn.textContent = prevLabel;
    return;
  }

  // التحقق من الرقم الجامعي
  if(!/^\d{4,20}$/.test(uni)){
    if(complaintStatus){ complaintStatus.style.color = '#dc2626'; complaintStatus.textContent = '❌ الرجاء إدخال رقم جامعي صالح.'; }
    sendComplaintBtn.disabled = false;
    sendComplaintBtn.textContent = prevLabel;
    return;
  }

  // التحقق من رقم الجوال (إجباري)
  if(!phone || !/^(05|5)\d{8}$/.test(phone)){
    if(complaintStatus){ complaintStatus.style.color = '#dc2626'; complaintStatus.textContent = '❌ الرجاء إدخال رقم جوال صحيح (يبدأ بـ 05 أو 5).'; }
    sendComplaintBtn.disabled = false;
    sendComplaintBtn.textContent = prevLabel;
    return;
  }

  const header = `✉️ تواصل معنا / رفع اقتراح`;
  const bodyLines = [];
  bodyLines.push(`👤 الاسم: ${name}`);
  bodyLines.push(`🎓 الرقم الجامعي: ${uni}`);
  bodyLines.push(`📱 الجوال: ${phone}`);
  if(msg) bodyLines.push(`\n💬 المحتوى:\n${msg}`);
  bodyLines.push(`\n🗓️ التاريخ: ${new Date().toLocaleString('ar-SA')}`);
  bodyLines.push(`📍 المرسل عبر: خريطة القاعات - كلية العلوم الزراعية`);
  const fullText = `${header}\n${'─'.repeat(40)}\n${bodyLines.join('\n')}`;

  try {
    if(file) {
      // إرسال الصورة مع النص
      const formData = new FormData();
      formData.append('chat_id', TELEGRAM_CHAT_ID);
      formData.append('photo', file);
      formData.append('caption', fullText);
      
      const photoUrl = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendPhoto`;
      const photoResponse = await fetch(photoUrl, {
        method: 'POST',
        body: formData
      });
      
      const photoData = await photoResponse.json();
      console.log('Telegram Photo Response:', photoData);
      
      if(!photoData.ok) {
        throw new Error(photoData.description || 'فشل إرسال الصورة');
      }
      
    } else {
      // إرسال النص فقط
      const textUrl = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;
      const textResponse = await fetch(textUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: TELEGRAM_CHAT_ID,
          text: fullText
        })
      });
      
      const textData = await textResponse.json();
      console.log('Telegram Text Response:', textData);
      
      if(!textData.ok) {
        throw new Error(textData.description || 'فشل إرسال الرسالة');
      }
    }
    
    if(complaintStatus){ 
      complaintStatus.style.color='#10b981'; 
      complaintStatus.textContent = '✅ تم إرسال رسالتك بنجاح! سيتم التواصل معك قريباً.'; 
    }
    
    hidePreview();
    if(complainName) complainName.value=''; 
    if(complainUni) complainUni.value=''; 
    if(complainPhone) complainPhone.value=''; 
    if(complainMsg) complainMsg.value=''; 
    if(complainFile) complainFile.value='';
    
    sendComplaintBtn.disabled = false;
    sendComplaintBtn.textContent = prevLabel;
    
  } catch(err){
    console.error('خطأ تفصيلي في الإرسال:', err);
    if(complaintStatus){ 
      complaintStatus.style.color='crimson'; 
      complaintStatus.textContent = `❌ ${err.message || 'حدث خطأ في الإرسال'}`; 
    }
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
الطالب فهد عبدالله القحطاني © 2025`;

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

// منع إغلاق السايدبار عند الضغط على عناصرها
document.addEventListener('click', e=>{ 
  // إذا كانت السايدبار مفتوحة
  if(sidebar.getAttribute('aria-hidden') === 'false') {
    // إذا كان الضغط خارج السايدبار وخارج زر القائمة
    if(!sidebar.contains(e.target) && !menuToggle.contains(e.target)){ 
      sidebar.setAttribute('aria-hidden','true'); 
      menuToggle.setAttribute('aria-expanded','false'); 
      body.classList.remove('sidebar-open'); 
      stopCreditAuto(); 
    }
  }
});

window.addEventListener('load', ()=>{
  populateRoomList(); 
  showTooltip(); 
  
  setTransform();
  resizeCanvasAndRedraw();
  
  if(searchBtn) searchBtn.addEventListener('click', locateRoom);
  if(resetBtn) resetBtn.addEventListener('click', ()=>{ 
    mapImage.src='map-1.png'; 
    if(pin) pin.style.display=animMarker.style.display='none'; 
    clearPath(); 
    if(roomInput) roomInput.value=''; 
    if(errorMsg) errorMsg.style.display='none'; 
    currentScale = 1;
    currentTrans = {x:0, y:0};
    setTransform();
    resizeCanvasAndRedraw(); 
  });

  if(openHomeInfo) openHomeInfo.addEventListener('click', ()=>{ 
    if(sidebar && sidebar.getAttribute('aria-hidden') === 'false'){ 
      sidebar.setAttribute('aria-hidden','true'); 
      if(menuToggle) menuToggle.setAttribute('aria-expanded','false'); 
      body.classList.remove('sidebar-open'); 
      stopCreditAuto(); 
    }
    openModal(homeInfoModal); 
    typeHomeText(); 
  });
  if(homeBackdrop) homeBackdrop.addEventListener('click', ()=>{ closeModalGeneric(homeInfoModal); });
  if(closeHomeInfo) closeHomeInfo.addEventListener('click', ()=>{ closeModalGeneric(homeInfoModal); });
  if(closeHomeInfoBtn) closeHomeInfoBtn.addEventListener('click', ()=>{ closeModalGeneric(homeInfoModal); });

  if(openEmailModal) openEmailModal.addEventListener('click', ()=>{ 
    if(sidebar && sidebar.getAttribute('aria-hidden') === 'false'){ 
      sidebar.setAttribute('aria-hidden','true'); 
      if(menuToggle) menuToggle.setAttribute('aria-expanded','false'); 
      body.classList.remove('sidebar-open'); 
      stopCreditAuto(); 
    }
    openModal(emailModal, { fancy:true }); 
    if(uniIdInput) uniIdInput.focus(); 
  });
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

  if(openDoctorModal) openDoctorModal.addEventListener('click', ()=>{ 
    if(sidebar && sidebar.getAttribute('aria-hidden') === 'false'){ 
      sidebar.setAttribute('aria-hidden','true'); 
      if(menuToggle) menuToggle.setAttribute('aria-expanded','false'); 
      body.classList.remove('sidebar-open'); 
      stopCreditAuto(); 
    }
    populateDoctorList();
    openModal(doctorModal); 
    if(doctorSearchInput) doctorSearchInput.focus();
  });
  if(doctorBackdrop) doctorBackdrop.addEventListener('click', ()=>{ closeModalGeneric(doctorModal); });
  if(closeDoctor) closeDoctor.addEventListener('click', ()=>{ closeModalGeneric(doctorModal); });
  if(closeDoctorBtn) closeDoctorBtn.addEventListener('click', ()=>{ closeModalGeneric(doctorModal); });
  if(doctorSearchInput) doctorSearchInput.addEventListener('input', (e)=>{ populateDoctorList(e.target.value); });

  if(complainFile) complainFile.addEventListener('change', handlePreview);
  if(removePreview) removePreview.addEventListener('click', removePreviewImage);

  if(document.body.classList.contains('sidebar-open')) startCreditAuto();
  
  // Welcome Screen Handler
  if(enterMapBtn){
    enterMapBtn.addEventListener('click', ()=>{
      if(welcomeScreen){
        welcomeScreen.classList.add('hidden');
        setTimeout(()=>{ welcomeScreen.style.display = 'none'; }, 500);
      }
    });
  }
});



// دعم الضغط على Enter
if(roomInput){
  roomInput.addEventListener('keypress', e => {
    if (e.key === 'Enter') locateRoom();
  });
}

window.addEventListener('resize', ()=>{ 
  setTransform();
  resizeCanvasAndRedraw(); 
  if(roomInput && roomInput.value) locateRoom(); 
});

// إيقاف/استئناف الحركة عند تبديل التبويب (Page Visibility API)
document.addEventListener('visibilitychange', () => {
  if (document.hidden) {
    // التبويب أصبح مخفياً - إيقاف مؤقت للحركة
    animPaused = true;
  } else {
    // التبويب أصبح مرئياً مجدداً - استئناف الحركة
    animPaused = false;
    lastTs = 0; // إعادة تعيين lastTs لتجنب قفزة كبيرة في dt
  }
});

if(mapImage) mapImage.addEventListener('load', ()=> resizeCanvasAndRedraw());

window.addEventListener('beforeunload', ()=>{ 
  stopCreditAuto(); 
});