/* رقم العميد (ضع الرقم هنا بصيغة محلية أو دولية) */
const DEAN_PHONE = '0135895711';

/* Telegram Bot Configuration */
const TELEGRAM_BOT_TOKEN = '8255886307:AAExiaoy_30ClKvZnkoG9LTRetwYhOED3mg';
const TELEGRAM_CHAT_ID = '7821474319';

/* ----- DOM ----- */
const body = document.body;
const welcomeScreen = document.getElementById('welcomeScreen');
const enterMapBtn = document.getElementById('enterMapBtn');
const welcomeCollegeSelect = document.getElementById('welcomeCollegeSelect');
const welcomeAudienceSelect = document.getElementById('welcomeAudienceSelect');
const welcomeSelectionHint = document.getElementById('welcomeSelectionHint');
const floatingComplaintBtn = document.getElementById('floatingComplaintBtn');
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
let roomCoordinates     = window.roomCoordinates || {};
let doctorsData         = window.doctorsData || [];
let pathsMap          = window.pathsMap || {}; // سيتم تحميله عند الطلب (lazy-load)
let pathsLoading      = false; // علامة لمنع التحميل المتكرر
let pathsLoaded       = false; // علامة لتتبع حالة التحميل
/* غيّر هذا الرقم مع كل تحديث حتى يصل للطلاب فوراً بدل النسخة المخزّنة */
const ASSET_VERSION   = '1.2.0';
let pathsScriptUrl    = 'data/agri-food/male/paths.rel.js';

let datasetRegistry   = Array.isArray(window.datasetRegistry) ? window.datasetRegistry : [];
let currentDataset    = null;
let currentMapFloor   = 1;
let selectedWelcomeDataset = null;
const DEFAULT_DATASET_KEY = 'agri-food:male';

/* ----- ثابتات الخريطة ----- */
/* أبعاد صورة الخريطة الأصلية — تُحدَّث من سجل البيانات عند تبديل الكلية */
let IMG_W = 901, IMG_H = 988;

/* ----- إعدادات الحركة ----- */
/* الزمن ثابت بدل السرعة: كل مسار يُقطع في نفس المدة تقريباً مهما كان طوله */
const ANIM_DURATION  = 2600;  // ms — زمن قطع المسار كاملاً
const ANIM_MIN_SPEED = 70;    // px/s — حد أدنى حتى لا تبدو المسارات القصيرة متجمدة
const ANIM_MAX_SPEED = 850;   // px/s — حد أعلى حتى لا تبدو المسارات الطويلة قفزة
const ANIM_END_PAUSE = 900;   // ms — وقفة قبل إعادة تشغيل المسار

let animId = null;
let animTimer = null;         // مؤقّت وقفة النهاية (يجب إلغاؤه مع الحركة)
let animSpeed = 200;          // px/s — يُحسب لكل مسار حسب طوله
let animPaused = false;       // حالة إيقاف مؤقت للحركة
let previewObjectUrl = null;
let seg = 0, t = 0, lastTs = 0;
let currentAnimPts = null;    // النقاط الحالية للحركة (يتم تحديثها عند التكبير)

function applyImageSize(datasetItem){
  const size = (datasetItem && datasetItem.imageSize) || { width: 901, height: 988 };
  IMG_W = size.width  || 901;
  IMG_H = size.height || 988;
}

function getMapSrcForFloor(floor){
  if(currentDataset && currentDataset.maps){
    return floor === 2 ? currentDataset.maps.floor2 : currentDataset.maps.floor1;
  }
  return floor === 2 ? 'assets/maps/map-2.png' : 'assets/maps/map-1.png';
}

function setMapToFloor(floor){
  currentMapFloor = floor;
  if(mapImage) mapImage.src = getMapSrcForFloor(floor);
}

function resetMapView(){
  setMapToFloor(1);
  if(pin) pin.style.display = 'none';
  if(animMarker) animMarker.style.display = 'none';
  clearPath();
  if(roomInput) roomInput.value = '';
  if(errorMsg) errorMsg.style.display = 'none';
  currentScale = 1;
  currentTrans = {x:0, y:0};
  setTransform();
  resizeCanvasAndRedraw();
}

function updateDatasetStatus(msg, isError = false){
  if(isError && msg){
    showError(msg);
  }
}

function updateWelcomeHint(msg, isError = true){
  if(!welcomeSelectionHint) return;
  welcomeSelectionHint.textContent = msg || '';
  welcomeSelectionHint.style.color = isError ? '#ef4444' : '#10b981';
}

function loadScriptFile(url, forceReload = false){
  return new Promise((resolve, reject) => {
    if(!url){ reject(new Error('مسار الملف غير موجود')); return; }
    const script = document.createElement('script');
    script.async = true;
    script.src = forceReload ? `${url}${url.includes('?') ? '&' : '?'}v=${Date.now()}` : url;
    script.onload = () => resolve(true);
    script.onerror = () => reject(new Error(`تعذر تحميل الملف: ${url}`));
    document.body.appendChild(script);
  });
}

function getDatasetBySelection(collegeId, audience){
  return datasetRegistry.find(ds => ds.collegeId === collegeId && ds.audience === audience);
}

function getEnabledDatasets(){
  return datasetRegistry.filter(ds => ds.enabled);
}

async function applyDataset(datasetItem, options = { resetView: true }){
  if(!datasetItem){
    updateDatasetStatus('لم يتم العثور على إعدادات البيانات.', true);
    return false;
  }
  if(!datasetItem.enabled){
    updateDatasetStatus('هذه الكلية/الشطر غير متاحين حالياً.', true);
    return false;
  }

  if(currentDataset && currentDataset.key === datasetItem.key){
    applyImageSize(datasetItem);
    if(options && options.resetView){
      resetMapView();
    }
    updateDatasetStatus(`النشط: ${datasetItem.collegeName} - ${datasetItem.audienceName}`);
    return true;
  }

  try{
    updateDatasetStatus(`جاري تحميل: ${datasetItem.collegeName} - ${datasetItem.audienceName}...`);

    await loadScriptFile(datasetItem.files.rooms, true);
    await loadScriptFile(datasetItem.files.doctors, true);

    roomCoordinates = window.roomCoordinates || {};
    doctorsData = window.doctorsData || [];

    pathsScriptUrl = datasetItem.files.paths || 'data/agri-food/male/paths.rel.js';
    window.pathsMap = {};
    pathsMap = {};
    pathsLoaded = false;
    pathsLoading = false;

    applyImageSize(datasetItem);
    currentDataset = datasetItem;
    try { localStorage.setItem('selectedDatasetKey', datasetItem.key); } catch(e){}

    populateRoomList();
    if(options && options.resetView){
      resetMapView();
    } else {
      setMapToFloor(1);
    }

    updateDatasetStatus(`النشط: ${datasetItem.collegeName} - ${datasetItem.audienceName}`);
    return true;
  } catch(err){
    console.error(err);
    updateDatasetStatus('فشل تحميل بيانات الكلية المختارة.', true);
    showError('فشل تحميل بيانات الكلية المختارة.');
    return false;
  }
}

function fillCollegeOptions(selectEl, withPlaceholder = false, enabledOnly = false, showSoonLabel = false){
  if(!selectEl) return;
  const collegesMap = new Map();
  const source = enabledOnly ? datasetRegistry.filter(ds => ds.enabled) : datasetRegistry;
  source.forEach(ds => {
    if(!collegesMap.has(ds.collegeId)){
      const hasEnabled = datasetRegistry.some(item => item.collegeId === ds.collegeId && item.enabled);
      const label = (showSoonLabel && !hasEnabled) ? `${ds.collegeName} (قريباً)` : ds.collegeName;
      collegesMap.set(ds.collegeId, label);
    }
  });

  selectEl.innerHTML = '';
  if(withPlaceholder){
    const option = document.createElement('option');
    option.value = '';
    option.textContent = '-- اختر الكلية --';
    selectEl.appendChild(option);
  }
  collegesMap.forEach((name, id) => {
    const option = document.createElement('option');
    option.value = id;
    option.textContent = name;
    selectEl.appendChild(option);
  });
}

function fillAudienceOptions(selectEl, collegeId, withPlaceholder = false, enabledOnly = false, showSoonLabel = false){
  if(!selectEl) return;
  selectEl.innerHTML = '';
  if(withPlaceholder){
    const option = document.createElement('option');
    option.value = '';
    option.textContent = '-- اختر الشطر --';
    selectEl.appendChild(option);
  }
  const related = datasetRegistry.filter(ds => ds.collegeId === collegeId && (!enabledOnly || ds.enabled));
  related.forEach(ds => {
    const option = document.createElement('option');
    option.value = ds.audience;
    option.textContent = (showSoonLabel && !ds.enabled) ? `${ds.audienceName} (قريباً)` : ds.audienceName;
    selectEl.appendChild(option);
  });
}

function buildDatasetSelectors(){
  if(!welcomeCollegeSelect || !welcomeAudienceSelect) return;

  datasetRegistry = Array.isArray(window.datasetRegistry) ? window.datasetRegistry : [];
  if(datasetRegistry.length === 0){
    updateDatasetStatus('لم يتم العثور على سجل البيانات.', true);
    return;
  }

  const enabledDatasets = getEnabledDatasets();
  if(enabledDatasets.length === 0){
    if(welcomeCollegeSelect) welcomeCollegeSelect.disabled = true;
    if(welcomeAudienceSelect) welcomeAudienceSelect.disabled = true;
    if(enterMapBtn) enterMapBtn.disabled = true;
    updateDatasetStatus('لا توجد كليات مفعلة حالياً.', true);
    updateWelcomeHint('لا توجد كليات مفعلة حالياً.', true);
    return;
  }

  fillCollegeOptions(welcomeCollegeSelect, true, false, true);

  if(welcomeCollegeSelect && welcomeAudienceSelect){
    welcomeCollegeSelect.value = '';
    welcomeAudienceSelect.innerHTML = '<option value="">-- اختر الشطر --</option>';
    welcomeAudienceSelect.disabled = true;
    if(welcomeCollegeSelect.options.length <= 1){
      welcomeCollegeSelect.disabled = true;
      updateWelcomeHint('لا توجد كليات مفعلة حالياً.', true);
    } else {
      welcomeCollegeSelect.disabled = false;
    }
  }
  if(enterMapBtn) enterMapBtn.disabled = true;
  selectedWelcomeDataset = null;
  updateWelcomeHint('اختر الكلية والشطر أولاً.', true);

  if(welcomeCollegeSelect){
    welcomeCollegeSelect.addEventListener('change', ()=>{
      const collegeId = welcomeCollegeSelect.value;
      selectedWelcomeDataset = null;
      if(!collegeId){
        welcomeAudienceSelect.innerHTML = '<option value="">-- اختر الشطر --</option>';
        welcomeAudienceSelect.disabled = true;
        if(enterMapBtn) enterMapBtn.disabled = true;
        updateWelcomeHint('اختر الكلية والشطر أولاً.', true);
        return;
      }

      fillAudienceOptions(welcomeAudienceSelect, collegeId, true, false, true);
      if(welcomeAudienceSelect.options.length <= 1){
        welcomeAudienceSelect.disabled = true;
        if(enterMapBtn) enterMapBtn.disabled = true;
        updateWelcomeHint('لا يوجد شطر مفعّل لهذه الكلية حالياً.', true);
        return;
      }

      welcomeAudienceSelect.disabled = false;
      if(enterMapBtn) enterMapBtn.disabled = true;
      updateWelcomeHint('اختر الشطر لإكمال الدخول.', true);
    });
  }

  if(welcomeAudienceSelect){
    welcomeAudienceSelect.addEventListener('change', ()=>{
      const ds = getDatasetBySelection(welcomeCollegeSelect ? welcomeCollegeSelect.value : '', welcomeAudienceSelect.value);
      selectedWelcomeDataset = ds || null;

      if(!ds){
        if(enterMapBtn) enterMapBtn.disabled = true;
        updateWelcomeHint('اختر الكلية والشطر أولاً.', true);
        return;
      }
      if(!ds.enabled){
        if(enterMapBtn) enterMapBtn.disabled = true;
        updateWelcomeHint('هذا القسم (قريباً).', true);
        return;
      }

      if(enterMapBtn) enterMapBtn.disabled = false;
      updateWelcomeHint(`جاهز للدخول: ${ds.collegeName} - ${ds.audienceName}`, false);
    });
  }

  if(enabledDatasets.length === 1 && welcomeCollegeSelect && welcomeAudienceSelect){
    const only = enabledDatasets[0];
    welcomeCollegeSelect.value = only.collegeId;
    fillAudienceOptions(welcomeAudienceSelect, only.collegeId, true, false, true);
    welcomeAudienceSelect.disabled = false;
    welcomeAudienceSelect.value = only.audience;
    selectedWelcomeDataset = only;
    if(enterMapBtn) enterMapBtn.disabled = false;
    updateWelcomeHint(`جاهز للدخول: ${only.collegeName} - ${only.audienceName}`, false);
  }
}

function refreshFloatingComplaintBtnVisibility(){
  if(!floatingComplaintBtn) return;
  const welcomeVisible = !!(welcomeScreen && !welcomeScreen.classList.contains('hidden') && welcomeScreen.style.display !== 'none');
  const modalOpen = document.body.classList.contains('modal-open');
  const sidebarOpen = document.body.classList.contains('sidebar-open');
  /* يظهر على شاشة الخريطة فقط: لا في شاشة الترحيب، ولا فوق نافذة مفتوحة، ولا خلف القائمة */
  if(welcomeVisible || modalOpen || sidebarOpen){
    floatingComplaintBtn.classList.add('is-hidden');
  } else {
    floatingComplaintBtn.classList.remove('is-hidden');
  }
}

/* ---------------------------
   قفل تمرير الصفحة خلف القائمة/النوافذ
   --------------------------- */
let lockedScrollY = 0;
function refreshScrollLock(){
  const html = document.documentElement;
  const shouldLock = document.body.classList.contains('sidebar-open')
                  || !!document.querySelector('.modal[aria-hidden="false"]');
  const isLocked = html.classList.contains('scroll-locked');
  if(shouldLock === isLocked) return;
  if(shouldLock){
    lockedScrollY = window.scrollY || html.scrollTop || 0;
    html.classList.add('scroll-locked');
  } else {
    html.classList.remove('scroll-locked');
    // أعِد الصفحة لموضعها حتى لا تقفز للأعلى عند الإغلاق
    window.scrollTo(0, lockedScrollY);
  }
}

/* ---------------------------
   إدارة القائمة الجانبية (مصدر واحد للحقيقة)
   --------------------------- */
function setSidebarOpen(open){
  if(!sidebar) return;
  sidebar.setAttribute('aria-hidden', open ? 'false' : 'true');
  /* inert يمنع وصول لوحة المفاتيح لأزرار القائمة وهي مخفية */
  if(open) sidebar.removeAttribute('inert'); else sidebar.setAttribute('inert','');
  if(menuToggle) menuToggle.setAttribute('aria-expanded', open ? 'true' : 'false');
  body.classList.toggle('sidebar-open', open);
  if(open){
    applyPalette(generatePalette());
    scatterGatherCreditWords();
    startCreditAuto();
  } else {
    stopCreditAuto();
  }
  refreshFloatingComplaintBtnVisibility();
  refreshScrollLock();
}
function closeSidebarPanel(){
  if(sidebar && sidebar.getAttribute('aria-hidden') === 'false') setSidebarOpen(false);
}

/* ---------------------------
   Theme toggle (night/day)
   --------------------------- */
function applyInitialTheme(){
  // ابدأ دائماً بالوضع النهاري عند كل فتح للتطبيق
  document.body.classList.remove('dark');
  if(themeBtn) themeBtn.textContent = '🌙';
}
if(themeBtn){
  applyInitialTheme();
  themeBtn.addEventListener('click', ()=>{
    const isDark = document.body.classList.toggle('dark');
    themeBtn.textContent = isDark ? '☀️' : '🌙';
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
  /* هوية الكلية ثابتة: الأخضر للأزرار الأساسية والأحمر للتنبيه.
     كانت الألوان تُولَّد عشوائياً فيخرج زر الشكاوى بنفسجياً في نصف الحالات.
     العشوائية بقيت في الهالة الزخرفية فقط (--holo) لأنها لا تحمل معنى. */
  return {
    '--holo1': `rgba(${rand(140,255)}, ${rand(0,140)}, ${rand(140,255)}, 0.12)`,
    '--holo2': `rgba(${rand(0,200)}, ${rand(140,255)}, ${rand(120,255)}, 0.10)`
  };
}

/* ألوان الهوية التي قد تكون نسخة قديمة كتبتها على <html> */
const LEGACY_PALETTE_VARS = ['--primary-1','--primary-2','--accent-1','--accent-2'];

function applyPalette(pal){
  // نظّف أي لون هوية خزّنته نسخة سابقة حتى تعود ألوان :root الرسمية
  LEGACY_PALETTE_VARS.forEach(k => document.documentElement.style.removeProperty(k));
  Object.keys(pal).forEach(k => document.documentElement.style.setProperty(k, pal[k]));
}

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
    
    // تحديث النقاط الحالية للحركة وإعادة ضبط السرعة على المقاس الجديد
    currentAnimPts = absPts;
    animSpeed = computeAnimSpeed(absPts);
    
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

function stopAnim(){
  cancelAnimationFrame(animId);
  animId = null;
  /* بدون إلغاء هذا المؤقّت تعود الحركة للحياة بعد وقفة النهاية رغم الإلغاء */
  if(animTimer){ clearTimeout(animTimer); animTimer = null; }
  seg = 0; t = 0; lastTs = 0;
}

function clearPath(){ 
  lastDrawnPts = null;
  originalPathData = null;  // مسح البيانات الأصلية
  currentAnimPts = null;
  if(pathCanvas && pathCanvas.getContext){ 
    const ctx = pathCanvas.getContext('2d'); 
    ctx.clearRect(0, 0, pathCanvas.width, pathCanvas.height); 
  } 
  stopAnim();
  if(animMarker) animMarker.style.display = 'none';
}

// دالة التسهيل (ease-in-out)
function easeInOut(x) {
  return x < 0.5 ? 2 * x * x : 1 - Math.pow(-2 * x + 2, 2) / 2;
}

/* طول المسار بالبكسل المعروض */
function pathLength(pts){
  let total = 0;
  for(let i = 1; i < pts.length; i++) total += Math.hypot(pts[i].x - pts[i-1].x, pts[i].y - pts[i-1].y);
  return total;
}

/* سرعة تجعل كل مسار يُقطع في ANIM_DURATION تقريباً، مهما اختلف طوله أو حجم الشاشة */
function computeAnimSpeed(pts){
  if(!pts || pts.length < 2) return ANIM_MIN_SPEED;
  const raw = pathLength(pts) / (ANIM_DURATION / 1000);
  return Math.min(ANIM_MAX_SPEED, Math.max(ANIM_MIN_SPEED, raw));
}

function startAnim(pts) {
  if(!pts || pts.length < 2) return;
  stopAnim();
  animPaused = false;
  currentAnimPts = pts;  // حفظ النقاط الحالية
  animSpeed = computeAnimSpeed(pts);
  
  // تأكد أن السهم ظاهر دائماً
  animMarker.style.display = 'block';
  animMarker.style.opacity = '1';
  const startPoint = pts[0];
  animMarker.style.left = `${startPoint.x}px`;
  animMarker.style.top = `${startPoint.y}px`;
  
  function restartAfterPause(){
    seg = 0; t = 0; lastTs = 0;
    animTimer = setTimeout(()=>{
      animTimer = null;
      animId = requestAnimationFrame(animFrame);
    }, ANIM_END_PAUSE);
  }

  function animFrame(ts) {
    // استخدام النقاط الحالية المحدثة (تتغير مع التكبير وتغيير حجم الشاشة)
    if(!currentAnimPts || currentAnimPts.length < 2){ animId = null; return; }

    // التبويب مخفي: أبقِ الحلقة حية دون تقدّم حتى لا يقفز المؤشر عند العودة
    if(animPaused){ lastTs = ts; animId = requestAnimationFrame(animFrame); return; }

    if (!lastTs) lastTs = ts;
    // تقييد dt يحمي من قفزة كبيرة بعد أي توقف للإطارات
    const dt = Math.min((ts - lastTs) / 1000, 0.05);
    lastTs = ts;

    const p0 = currentAnimPts[seg];
    const p1 = currentAnimPts[seg + 1];
    if(!p0 || !p1) { restartAfterPause(); return; }
    
    const dx = p1.x - p0.x;
    const dy = p1.y - p0.y;
    const dist = Math.hypot(dx, dy);

    // تطبيق التسهيل
    t += dist > 0 ? (animSpeed * dt) / dist : 1;
    let tEase = easeInOut(Math.min(t, 1));

    if (t >= 1) {
      seg++;
      t = 0;
      if (seg >= currentAnimPts.length - 1) {
        // وصل للنهاية - إعادة من البداية بعد وقفة
        animMarker.style.left = `${p1.x}px`;
        animMarker.style.top = `${p1.y}px`;
        restartAfterPause();
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
      setMapToFloor(2);
      
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
    showError('تابع المسار حتى الدرج، ثم اضغط "ابحث" مرة أخرى واختر "نعم".');
  };
}
function removeStairsQuestion(){ const el = document.getElementById('stairsQuestion'); if(el) el.remove(); }

/* توحيد النص للبحث: أرقام عربية → لاتينية، حذف التشكيل، توحيد الهمزات والتاء المربوطة */
function normalizeQuery(str){
  return String(str == null ? '' : str)
    .replace(/[٠-٩]/g, d => String(d.charCodeAt(0) - 0x0660))
    .replace(/[۰-۹]/g, d => String(d.charCodeAt(0) - 0x06F0))
    .replace(/[ً-ْـ]/g, '')
    .replace(/[أإآٱ]/g, 'ا')
    .replace(/ى/g, 'ي')
    .replace(/ؤ/g, 'و')
    .replace(/ئ/g, 'ي')
    .replace(/ة/g, 'ه')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

/* يحوّل ما كتبه المستخدم إلى مفتاح قاعة فعلي: مطابقة تامة ثم مطابقة جزئية */
function resolveRoomKey(raw){
  if(roomCoordinates[raw]) return raw;
  const q = normalizeQuery(raw);
  if(!q) return null;
  const keys = Object.keys(roomCoordinates);
  const exact = keys.find(k => normalizeQuery(k) === q);
  if(exact) return exact;
  const partial = keys.filter(k => normalizeQuery(k).includes(q));
  if(partial.length === 0) return null;
  // الأقصر أقرب لما كتبه المستخدم ("دورة" → "دورة المياه 1")
  partial.sort((a, b) => a.length - b.length || a.localeCompare(b, 'ar'));
  return partial[0];
}

function showError(text){ if(!errorMsg) return; errorMsg.textContent = text; errorMsg.style.display = 'block'; setTimeout(()=>{ errorMsg.style.display = 'none'; }, 3200); }

/* تحميل المسارات عند الطلب (lazy-load) لتحسين الأداء */
function loadPathsIfNeeded(callback) {
  const hasLoadedPaths = !!(window.pathsMap && Object.keys(window.pathsMap).length > 0);
  // إذا كانت المسارات محمّلة بالفعل، نفّذ callback مباشرة
  if (pathsLoaded || hasLoadedPaths) {
    if (hasLoadedPaths && !pathsLoaded) {
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
  script.src = `${pathsScriptUrl}${pathsScriptUrl.includes('?') ? '&' : '?'}v=${ASSET_VERSION}`;
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
  const typed = roomInput.value.trim();
  
  // إزالة سؤال الدرج إذا كان موجود
  removeStairsQuestion();
  
  if(!typed){ 
    showError('الرجاء إدخال رقم القاعة أو اسم الموقع.'); 
    return; 
  }
  
  const rn = resolveRoomKey(typed);
  if(!rn){ 
    showError('لم نجد هذا الموقع. جرّب رقم القاعة أو اسمها (مثل: المسجد).'); 
    if(pin) pin.style.display = 'none';
    if(animMarker) animMarker.style.display = 'none';
    clearPath(); 
    return; 
  }
  // اعرض المفتاح المطابق حتى يعرف المستخدم ما الذي عُثر عليه
  if(roomInput.value !== rn) roomInput.value = rn;
  
  // تحميل المسارات عند الطلب (lazy-load) قبل الاستخدام
  loadPathsIfNeeded(() => {
    const room = roomCoordinates[rn];
    const containerW = mapContainer.clientWidth;
    const containerH = mapContainer.clientHeight;

    // إذا كانت القاعة في الدور الثاني (floor: 2)
    if(room && room.floor === 2){
      // التحقق إذا كنا بالفعل في خريطة الدور الثاني
      if(currentMapFloor === 2){
        // نحن في الدور الثاني بالفعل - اعرض القاعة مباشرة
        setMapToFloor(2);
        
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
      setMapToFloor(1);
      
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
  setMapToFloor(floor===1 ? 1 : 2);
    
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
function doctorListMessage(text){
  const box = document.createElement('div');
  box.className = 'doctor-empty';
  box.textContent = text;
  doctorList.appendChild(box);
}

function populateDoctorList(filter = ''){
  if(!doctorList) return;
  doctorList.innerHTML = '';
  
  // التحقق من وجود بيانات الدكاترة
  if(!Array.isArray(doctorsData) || doctorsData.length === 0){
    doctorListMessage('جاري تحميل البيانات...');
    return;
  }
  
  const q = normalizeQuery(filter);
  const filtered = q
    ? doctorsData.filter(d =>
        normalizeQuery(d.name).includes(q) ||
        normalizeQuery(d.office).includes(q)
      )
    : doctorsData;
  
  if(filtered.length === 0){
    doctorListMessage('لا توجد نتائج');
    return;
  }
  
  filtered.forEach(doctor => {
    const office = String(doctor.office);
    // مكتب غير موجود على الخريطة: نوضّح ذلك بدل إغلاق النافذة ثم عرض خطأ
    const mapped = !!resolveRoomKey(office);

    const item = document.createElement('div');
    item.className = mapped ? 'doctor-item' : 'doctor-item is-unmapped';
    item.setAttribute('role', 'button');
    item.tabIndex = 0;

    const nameEl = document.createElement('div');
    nameEl.className = 'doctor-name';
    nameEl.textContent = doctor.name;

    const officeEl = document.createElement('div');
    officeEl.className = 'doctor-office';
    officeEl.textContent = mapped
      ? `مكتب رقم: ${office}`
      : `مكتب رقم: ${office} — لم يُحدَّد موقعه على الخريطة بعد`;

    item.appendChild(nameEl);
    item.appendChild(officeEl);

    if(mapped){
      item.setAttribute('aria-label', `${doctor.name} — عرض مكتب ${office} على الخريطة`);
      const go = () => {
        closeModalGeneric(doctorModal);
        if(roomInput) roomInput.value = office;
        locateRoom();
      };
      item.addEventListener('click', go);
      item.addEventListener('keydown', e => {
        if(e.key === 'Enter' || e.key === ' '){ e.preventDefault(); go(); }
      });
    } else {
      item.setAttribute('aria-disabled', 'true');
      item.title = 'موقع هذا المكتب غير متوفر في بيانات الخريطة حالياً';
    }

    doctorList.appendChild(item);
  });
}

/* ---------------------------
   Modals helpers + inner touch scroll
   --------------------------- */
let lastFocusedBeforeModal = null;

function getOpenModal(){ return document.querySelector('.modal[aria-hidden="false"]'); }

function getFocusableIn(el){
  return Array.from(el.querySelectorAll('a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])'))
    .filter(node => node.offsetWidth > 0 || node.offsetHeight > 0 || node === document.activeElement);
}

function openModal(modalEl, opts = {}){ 
  if(!modalEl) return;
  lastFocusedBeforeModal = document.activeElement;
  closeSidebarPanel();
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
  refreshFloatingComplaintBtnVisibility();
  refreshScrollLock();
}
function closeModalGeneric(modalEl){
  if(!modalEl) return;
  modalEl.setAttribute('aria-hidden','true'); modalEl.classList.remove('active');
  // إعادة التركيز للزر الذي فتح النافذة
  if(lastFocusedBeforeModal && document.contains(lastFocusedBeforeModal)){
    try { lastFocusedBeforeModal.focus(); } catch(e){}
  }
  lastFocusedBeforeModal = null;
  setTimeout(()=>{
    const openModalExists = document.querySelector('.modal[aria-hidden="false"]');
    if(!openModalExists){ document.body.classList.remove('modal-open'); try { if (mapContainer) mapContainer.style.pointerEvents = ''; if (mapWrapper) mapWrapper.style.pointerEvents = ''; } catch(e){} }
    refreshFloatingComplaintBtnVisibility();
    refreshScrollLock();
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

/* Escape يغلق النافذة أو القائمة، وTab يبقى محصوراً داخل النافذة المفتوحة */
document.addEventListener('keydown', (e)=>{
  if(e.key === 'Escape'){
    const open = getOpenModal();
    if(open){ closeModalGeneric(open); return; }
    if(sidebar && sidebar.getAttribute('aria-hidden') === 'false'){
      closeSidebarPanel();
      if(menuToggle) menuToggle.focus();
    }
    return;
  }
  if(e.key !== 'Tab') return;
  const open = getOpenModal();
  if(!open) return;
  const focusable = getFocusableIn(open);
  if(focusable.length === 0) return;
  const first = focusable[0], last = focusable[focusable.length - 1];
  if(e.shiftKey && document.activeElement === first){ e.preventDefault(); last.focus(); }
  else if(!e.shiftKey && document.activeElement === last){ e.preventDefault(); first.focus(); }
});

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
الطالب فهد عبدالله القحطاني

🧑‍🏫 بإشراف:
الأستاذ منصور البحري

الحقوق محفوظة © 2025`;

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
    closeSidebarPanel();
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
    setSidebarOpen(sidebar.getAttribute('aria-hidden') !== 'false');
  });
}
if(closeSidebar){
  closeSidebar.addEventListener('click', ()=>{ closeSidebarPanel(); if(menuToggle) menuToggle.focus(); });
}

// منع إغلاق السايدبار عند الضغط على عناصرها
document.addEventListener('click', e=>{ 
  // إذا كانت السايدبار مفتوحة
  if(sidebar.getAttribute('aria-hidden') === 'false') {
    // إذا كان الضغط خارج السايدبار وخارج زر القائمة
    if(!sidebar.contains(e.target) && !menuToggle.contains(e.target)){ 
      closeSidebarPanel();
    }
  }
});

window.addEventListener('load', ()=>{
  buildDatasetSelectors(); 
  showTooltip(); 
  refreshFloatingComplaintBtnVisibility();
  
  setMapToFloor(1);
  setTransform();
  resizeCanvasAndRedraw();
  
  if(searchBtn) searchBtn.addEventListener('click', locateRoom);
  if(resetBtn) resetBtn.addEventListener('click', resetMapView);

  if(openHomeInfo) openHomeInfo.addEventListener('click', ()=>{ 
    closeSidebarPanel();
    openModal(homeInfoModal); 
    typeHomeText(); 
  });
  if(homeBackdrop) homeBackdrop.addEventListener('click', ()=>{ closeModalGeneric(homeInfoModal); });
  if(closeHomeInfo) closeHomeInfo.addEventListener('click', ()=>{ closeModalGeneric(homeInfoModal); });
  if(closeHomeInfoBtn) closeHomeInfoBtn.addEventListener('click', ()=>{ closeModalGeneric(homeInfoModal); });

  if(openEmailModal) openEmailModal.addEventListener('click', ()=>{ 
    closeSidebarPanel();
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
    closeSidebarPanel();
    openModal(complaintModal); if(complainUni) complainUni.focus();
  });
  if(floatingComplaintBtn) floatingComplaintBtn.addEventListener('click', ()=>{
    openModal(complaintModal);
    if(complainUni) complainUni.focus();
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
    closeSidebarPanel();
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
    enterMapBtn.addEventListener('click', async ()=>{
      if(!selectedWelcomeDataset){
        updateWelcomeHint('اختر الكلية والشطر أولاً.', true);
        return;
      }
      if(!selectedWelcomeDataset.enabled){
        updateWelcomeHint('هذا القسم غير متاح حالياً.', true);
        return;
      }

      if(enterMapBtn) enterMapBtn.disabled = true;
      const loaded = await applyDataset(selectedWelcomeDataset, { resetView: true });
      if(!loaded){
        if(enterMapBtn) enterMapBtn.disabled = false;
        updateWelcomeHint('تعذر تحميل بيانات الكلية المختارة.', true);
        return;
      }

      if(welcomeScreen){
        welcomeScreen.classList.add('hidden');
        setTimeout(()=>{ welcomeScreen.style.display = 'none'; }, 500);
      }
      refreshFloatingComplaintBtnVisibility();
    });
  }
});



// دعم الضغط على Enter
if(roomInput){
  roomInput.addEventListener('keypress', e => {
    if (e.key === 'Enter') locateRoom();
  });
}

/* إعادة الرسم فقط: استدعاء locateRoom هنا كان يعيد الحركة للبداية
   مع كل ظهور/اختفاء لشريط عنوان المتصفح على الجوال */
let resizeTimer = null;
window.addEventListener('resize', ()=>{ 
  clearTimeout(resizeTimer);
  resizeTimer = setTimeout(()=>{
    setTransform();
    resizeCanvasAndRedraw(); 
  }, 120);
});

// إيقاف/استئناف الحركة عند تبديل التبويب (Page Visibility API)
document.addEventListener('visibilitychange', () => {
  // العلم يُقرأ داخل animFrame، فالحركة تتوقف وتستأنف فعلياً
  animPaused = document.hidden;
  if(!document.hidden) lastTs = 0; // تجنّب قفزة كبيرة في dt عند العودة
});

if(mapImage) mapImage.addEventListener('load', ()=> resizeCanvasAndRedraw());

window.addEventListener('beforeunload', ()=>{ 
  stopCreditAuto(); 
});