// script.js
// —————————————————————————————
// عناصر DOM
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

// أبعاد الخريطة الأصلية (بالبكسل)
const IMG_W = 901, IMG_H = 988;
let animId;

// —————————————————————————————
// نحصل على roomCoordinates و pathsMap من نافذة المتصفح
// (تعريفهما يكون في rooms.js و paths.rel.js كما هو موضّح أعلاه)
const roomCoordinates = window.roomCoordinates || {};
const pathsMap        = window.pathsMap        || {};

// —————————————————————————————
// دالة ملء قائمة القاعات (datalist)
function populateRoomList(){
  Object.keys(roomCoordinates).forEach(rn => {
    const o = document.createElement('option');
    o.value = rn;
    roomList.appendChild(o);
  });
}

// —————————————————————————————
// تولتيب يظهر عند بداية التحميل
function showTooltip(){
  tooltip.classList.add('show');
  setTimeout(() => tooltip.classList.remove('show'), 4000);
}

// —————————————————————————————
// الوضع الليلي / النهاري مع حفظ الإعداد في LocalStorage
if (localStorage.getItem('theme') === 'dark') {
  document.body.classList.add('dark');
  themeBtn.textContent = '☀️';
}
themeBtn.onclick = () => {
  document.body.classList.toggle('dark');
  const dark = document.body.classList.contains('dark');
  themeBtn.textContent = dark ? '☀️' : '🌙';
  localStorage.setItem('theme', dark ? 'dark' : 'light');
};

// —————————————————————————————
// دالة إعادة التعيين (مسح الدبوس والمسار واستعادة الخريطة الأصلية)
function resetMap(){
  mapImage.src = 'map-1.png';
  pin.style.display = animMarker.style.display = 'none';
  clearPath();
  cancelAnimationFrame(animId);
  roomInput.value = '';
  errorMsg.style.display = 'none';
}

// —————————————————————————————
// رسم المسار على عنصر <canvas>
function drawPath(pts){
  const cw = pathCanvas.width  = mapContainer.clientWidth;
  const ch = pathCanvas.height = mapContainer.clientHeight;
  const ctx = pathCanvas.getContext('2d');
  ctx.clearRect(0, 0, cw, ch);
  ctx.strokeStyle = 'rgba(0,0,255,0.7)';
  ctx.lineWidth   = 4;
  ctx.beginPath();
  pts.forEach((p, i) => i === 0
    ? ctx.moveTo(p.x, p.y)
    : ctx.lineTo(p.x, p.y)
  );
  ctx.stroke();
}
function clearPath(){
  const ctx = pathCanvas.getContext('2d');
  ctx.clearRect(0, 0, pathCanvas.width, pathCanvas.height);
  if (typeof startAnim.stop === 'function') startAnim.stop();
}

// —————————————————————————————
// تحريك السهم (animMarker) على طول النقاط
let seg = 0, t = 0, lastTs = 0;
function easeInOut(x) {
  // دالة تسهيل بسيطة (ease-in-out)
  return x < 0.5 ? 2 * x * x : 1 - Math.pow(-2 * x + 2, 2) / 2;
}
function startAnim(pts) {
  cancelAnimationFrame(animId);
  seg = 0; t = 0; lastTs = 0;
  animMarker.style.display = 'block';
  animMarker.style.left = '-1000px';
  animMarker.style.top = '-1000px';
  let running = true;
  let totalDist = 0;
  for (let i = 0; i < pts.length - 1; i++) {
    totalDist += Math.hypot(pts[i+1].x - pts[i].x, pts[i+1].y - pts[i].y);
  }
  // سرعة ثابتة (بالبكسل/ثانية)
  const spd = 60;
  let progress = 0;
  function loop(ts) {
    if (!running) return;
    if (!lastTs) lastTs = ts;
    const dt = (ts - lastTs) / 1000;
    lastTs = ts;
    progress += spd * dt;
    if (progress > totalDist) progress = 0;
    // حساب موقع المثلث على المسار
    let distSoFar = 0;
    let found = false;
    for (let i = 0; i < pts.length - 1; i++) {
      const segDist = Math.hypot(pts[i+1].x - pts[i].x, pts[i+1].y - pts[i].y);
      if (distSoFar + segDist >= progress) {
        const ratio = (progress - distSoFar) / segDist;
        const cx = pts[i].x + (pts[i+1].x - pts[i].x) * ratio;
        const cy = pts[i].y + (pts[i+1].y - pts[i].y) * ratio;
        animMarker.style.left = `${cx}px`;
        animMarker.style.top = `${cy}px`;
        const ang = Math.atan2(pts[i+1].y - pts[i].y, pts[i+1].x - pts[i].x) * 180 / Math.PI + 90;
        animMarker.style.transform = `translate(-50%,-50%) rotate(${ang}deg)`;
        found = true;
        break;
      }
      distSoFar += segDist;
    }
    if (!found && pts.length > 1) {
      // إذا لم يجد نقطة مناسبة، ضع المثلث في آخر نقطة
      animMarker.style.left = `${pts[pts.length-1].x}px`;
      animMarker.style.top = `${pts[pts.length-1].y}px`;
    }
    animId = requestAnimationFrame(loop);
  }
  animId = requestAnimationFrame(loop);
  startAnim.stop = () => { running = false; cancelAnimationFrame(animId); };
}

// —————————————————————————————
// دالة تحديد القاعة (input + datalist) ورسم الدبوس والمسار
function locateRoom(){
  const rn = roomInput.value.trim();
  // إزالة سؤال الدرج إذا كان موجود مسبقاً
  const oldStairsDiv = document.getElementById('stairsQuestion');
  if (oldStairsDiv) oldStairsDiv.remove();

  // منطق الدور: إذا القاعة فوق (2000 وفوق) يبقى في الدور الثاني، إذا كنت في الدور الأول يرسم مسار الدرج
  const isUpperRoom = /^2\d{3,}$/.test(rn);
  const currentFloor = mapImage.src.indexOf('map-2.png') !== -1 ? 2 : 1;

  if (!roomCoordinates[rn]) {
    errorMsg.textContent = 'رقم القاعة غير موجود.';
    errorMsg.style.display = 'block';
    pin.style.display = animMarker.style.display = 'none';
    clearPath();
    return;
  }
  errorMsg.style.display = 'none';

  const room = roomCoordinates[rn];
  // إذا القاعة فوق وكنت في الدور الأول يرسم مسار الدرج
  if (isUpperRoom && currentFloor === 1) {
    // استخدم مسار الدرج أو دبوس الدرج
    const stairsPath = pathsMap['درج'];
    mapImage.src = 'map-1.png';
    const W = mapContainer.clientWidth;
    const H = mapContainer.clientHeight;
    if (stairsPath) {
      const absPts = stairsPath.map(p => ({
        x: (p.x / IMG_W) * W,
        y: (p.y / IMG_H) * H
      }));
      drawPath(absPts);
      startAnim(absPts);
      pin.style.display = 'none';
    } else if (roomCoordinates['درج']) {
      clearPath();
      if (typeof startAnim.stop === 'function') startAnim.stop();
      // إظهار دبوس عند الدرج
      const { x, y } = roomCoordinates['درج'];
      const xAbs = (x / IMG_W) * W;
      const yAbs = (y / IMG_H) * H;
      pin.style.left    = `${xAbs}px`;
      pin.style.top     = `${yAbs}px`;
      pin.style.display = 'block';
    } else {
      clearPath();
      if (typeof startAnim.stop === 'function') startAnim.stop();
      pin.style.display = 'none';
    }

    // إضافة سؤال الدرج بجانب البحث
    const stairsDiv = document.createElement('div');
    stairsDiv.id = 'stairsQuestion';
    stairsDiv.style.marginTop = '10px';
    stairsDiv.innerHTML = `<span>هل وصلت للدرج؟</span> <button id="stairsYes">نعم</button> <button id="stairsNo">لا</button>`;
    // إضافة سؤال الدرج داخل form-container
    const formContainer = document.querySelector('.form-container');
    formContainer.appendChild(stairsDiv);

    document.getElementById('stairsYes').onclick = function() {
      // عند الضغط على نعم: تظهر خريطة الدور الثاني والمسار المعتاد للغرفة
      mapImage.src = 'map-2.png';
      stairsDiv.remove();
      // رسم المسار المعتاد للغرفة المطلوبة
      if (pathsMap[rn]) {
        const absPts2 = pathsMap[rn].map(p => ({
          x: (p.x / IMG_W) * W,
          y: (p.y / IMG_H) * H
        }));
        drawPath(absPts2);
        startAnim(absPts2);
      } else {
        clearPath();
        if (typeof startAnim.stop === 'function') startAnim.stop();
      }
      // إظهار دبوس الغرفة
      const { x, y } = roomCoordinates[rn];
      const xAbs = (x / IMG_W) * W;
      const yAbs = (y / IMG_H) * H;
      pin.style.left    = `${xAbs}px`;
      pin.style.top     = `${yAbs}px`;
      pin.style.display = 'block';
    };
    document.getElementById('stairsNo').onclick = function() {
      stairsDiv.remove();
      clearPath();
      if (typeof startAnim.stop === 'function') startAnim.stop();
    };
    return;
  }

  // إذا القاعة فوق وكنت بالفعل في الدور الثاني يرسم المسار مباشرة
  if (isUpperRoom && currentFloor === 2) {
    mapImage.src = 'map-2.png';
    const { x, y } = roomCoordinates[rn];
    const W = mapContainer.clientWidth;
    const H = mapContainer.clientHeight;
    const xAbs = (x / IMG_W) * W;
    const yAbs = (y / IMG_H) * H;
    pin.style.left    = `${xAbs}px`;
    pin.style.top     = `${yAbs}px`;
    pin.style.display = 'block';
    if (pathsMap[rn]) {
      const absPts = pathsMap[rn].map(p => ({
        x: (p.x / IMG_W) * W,
        y: (p.y / IMG_H) * H
      }));
      drawPath(absPts);
      startAnim(absPts);
    } else {
      clearPath();
      if (typeof startAnim.stop === 'function') startAnim.stop();
    }
    return;
  }

  // إذا كانت القاعة في الدور الثاني (floor: 2) ولم تكن من 2000 وفوق، أظهر سؤال الدرج
  if (room && room.floor === 2 && !isUpperRoom) {
    // استخدم مسار الدرج أو دبوس الدرج
    const stairsPath = pathsMap['درج'];
    mapImage.src = 'map-1.png';
    const W = mapContainer.clientWidth;
    const H = mapContainer.clientHeight;
    if (stairsPath) {
      const absPts = stairsPath.map(p => ({
        x: (p.x / IMG_W) * W,
        y: (p.y / IMG_H) * H
      }));
      drawPath(absPts);
      startAnim(absPts);
      pin.style.display = 'none';
    } else if (roomCoordinates['درج']) {
      clearPath();
      if (typeof startAnim.stop === 'function') startAnim.stop();
      // إظهار دبوس عند الدرج
      const { x, y } = roomCoordinates['درج'];
      const xAbs = (x / IMG_W) * W;
      const yAbs = (y / IMG_H) * H;
      pin.style.left    = `${xAbs}px`;
      pin.style.top     = `${yAbs}px`;
      pin.style.display = 'block';
    } else {
      clearPath();
      if (typeof startAnim.stop === 'function') startAnim.stop();
      pin.style.display = 'none';
    }

    // إضافة سؤال الدرج بجانب البحث
    const stairsDiv = document.createElement('div');
    stairsDiv.id = 'stairsQuestion';
    stairsDiv.style.marginTop = '10px';
    stairsDiv.innerHTML = `<span>هل وصلت للدرج؟</span> <button id="stairsYes">نعم</button> <button id="stairsNo">لا</button>`;
    // إضافة سؤال الدرج داخل form-container
    const formContainer = document.querySelector('.form-container');
    formContainer.appendChild(stairsDiv);

    document.getElementById('stairsYes').onclick = function() {
      // عند الضغط على نعم: تظهر خريطة الدور الثاني والمسار المعتاد للغرفة
      mapImage.src = 'map-2.png';
      stairsDiv.remove();
      // رسم المسار المعتاد للغرفة المطلوبة
      if (pathsMap[rn]) {
        const absPts2 = pathsMap[rn].map(p => ({
          x: (p.x / IMG_W) * W,
          y: (p.y / IMG_H) * H
        }));
        drawPath(absPts2);
        startAnim(absPts2);
      } else {
        clearPath();
        if (typeof startAnim.stop === 'function') startAnim.stop();
      }
      // إظهار دبوس الغرفة
      const { x, y } = roomCoordinates[rn];
      const xAbs = (x / IMG_W) * W;
      const yAbs = (y / IMG_H) * H;
      pin.style.left    = `${xAbs}px`;
      pin.style.top     = `${yAbs}px`;
      pin.style.display = 'block';
    };
    document.getElementById('stairsNo').onclick = function() {
      stairsDiv.remove();
      clearPath();
      if (typeof startAnim.stop === 'function') startAnim.stop();
    };
    return;
  }

  // 1) اختيار الخريطة المناسبة بناءً على المتغيّر floor
  const { x, y, floor } = roomCoordinates[rn];
  mapImage.src = (floor === 1) ? 'map-1.png' : 'map-2.png';

  // 2) نحسب الإحداثيات الفعلية داخل العنصر بناءً على الحجم الحالي
  const W = mapContainer.clientWidth;
  const H = mapContainer.clientHeight;
  // بما أن x و y هي إحداثيات بكسلية على الخريطة الأصلية (901×988):
  const xAbs = (x / IMG_W) * W;
  const yAbs = (y / IMG_H) * H;
  pin.style.left    = `${xAbs}px`;
  pin.style.top     = `${yAbs}px`;
  pin.style.display = 'block';

  // 3) إذا وجدت مساراً في pathsMap، نحسب النقاط المعروضة ونرسمها
  if (pathsMap[rn]) {
    const absPts = pathsMap[rn].map(p => ({
      x: (p.x / IMG_W) * W,
      y: (p.y / IMG_H) * H
    }));
    drawPath(absPts);
    startAnim(absPts);
  } else {
    clearPath();
    if (typeof startAnim.stop === 'function') startAnim.stop();
  }
}

// —————————————————————————————
// قائمة الشريط الجانبي (sidebar) فتح/إغلاق
menuToggle.onclick   = () => sidebar.classList.toggle('active');
closeSidebar.onclick = () => sidebar.classList.remove('active');
document.addEventListener('click', e => {
  if (
    sidebar.classList.contains('active') &&
    !sidebar.contains(e.target) &&
    !menuToggle.contains(e.target)
  ) {
    sidebar.classList.remove('active');
  }
});

// —————————————————————————————
// PAN / ZOOM عبر اللمس أو عجلة الفأرة
let currentScale   = 1;
let initialScale   = 1;
let currentTrans   = { x: 0, y: 0 };
let initialTrans   = { x: 0, y: 0 };
let touchStart     = [];
let startDist      = 0;
let pinchCenter    = { x: 0, y: 0 };

function setTransform(){
  const W  = mapContainer.clientWidth;
  const H  = mapContainer.clientHeight;
  const sW = W * currentScale;
  const sH = H * currentScale;

  currentTrans.x = (sW > W)
    ? Math.min(0, Math.max(W - sW, currentTrans.x))
    : (W - sW) / 2;
  currentTrans.y = (sH > H)
    ? Math.min(0, Math.max(H - sH, currentTrans.y))
    : (H - sH) / 2;

  mapWrapper.style.transform = `translate(${currentTrans.x}px,${currentTrans.y}px) scale(${currentScale})`;
}

mapContainer.addEventListener('touchstart', e => {
  if (e.touches.length === 1) {
    touchStart   = [{ x: e.touches[0].clientX, y: e.touches[0].clientY }];
    initialTrans = { ...currentTrans };
  } else if (e.touches.length === 2) {
    touchStart = [
      { x: e.touches[0].clientX, y: e.touches[0].clientY },
      { x: e.touches[1].clientX, y: e.touches[1].clientY }
    ];
    startDist    = Math.hypot(
      touchStart[0].x - touchStart[1].x,
      touchStart[0].y - touchStart[1].y
    );
    initialScale = currentScale;

    const rect = mapContainer.getBoundingClientRect();
    pinchCenter = {
      x: ((e.touches[0].clientX + e.touches[1].clientX) / 2) - rect.left,
      y: ((e.touches[0].clientY + e.touches[1].clientY) / 2) - rect.top
    };
    initialTrans = { ...currentTrans };
  }
});

mapContainer.addEventListener('touchmove', e => {
  e.preventDefault();
  if (e.touches.length === 1 && touchStart.length === 1) {
    const dx = e.touches[0].clientX - touchStart[0].x;
    const dy = e.touches[0].clientY - touchStart[0].y;
    currentTrans.x = initialTrans.x + dx;
    currentTrans.y = initialTrans.y + dy;
    setTransform();
  } else if (e.touches.length === 2 && touchStart.length === 2) {
    const newDist = Math.hypot(
      e.touches[0].clientX - e.touches[1].clientX,
      e.touches[0].clientY - e.touches[1].clientY
    );
    currentScale = Math.min(Math.max(initialScale * (newDist / startDist), 1), 5);
    currentTrans.x = initialTrans.x - ((currentScale - initialScale) / initialScale) * pinchCenter.x;
    currentTrans.y = initialTrans.y - ((currentScale - initialScale) / initialScale) * pinchCenter.y;
    setTransform();
  }
});

mapContainer.addEventListener('wheel', e => {
  e.preventDefault();
  const rect = mapContainer.getBoundingClientRect();
  const mx   = e.clientX - rect.left;
  const my   = e.clientY - rect.top;
  const delta  = (e.deltaY < 0) ? 1.1 : 0.9;
  const newScale = Math.min(Math.max(currentScale * delta, 1), 5);

  currentTrans.x -= (((newScale / currentScale) - 1) * mx);
  currentTrans.y -= (((newScale / currentScale) - 1) * my);
  currentScale = newScale;
  setTransform();
});

// —————————————————————————————
// دعم الضغط على Enter وتنفيذ البحث وإعادة التعيين عند تغيير حجم النافذة
roomInput.addEventListener('keypress', e => {
  if (e.key === 'Enter') locateRoom();
});
window.addEventListener('resize', () => {
  if (roomInput.value) locateRoom();
});

// —————————————————————————————
// التهيئة عند التحميل (onload)
window.onload = () => {
  populateRoomList();
  showTooltip();

  // ربط أزرار البحث وإعادة التعيين
  searchBtn.onclick = locateRoom;
  resetBtn.onclick  = resetMap;
};

// اجعل الصورة دائماً في منتصف الإطار وتدور حول مركزها
const mapImg = mapWrapper.querySelector('img');
let currentRotation = 0;
const targetNorth = 229;
function centerMap() {
  mapImg.style.position = 'absolute';
  mapImg.style.top = '50%';
  mapImg.style.left = '50%';
  mapImg.style.transform = `translate(-50%, -50%) rotate(${currentRotation}deg)`;
}
if (window.DeviceOrientationEvent) {
  window.addEventListener('deviceorientationabsolute' in window ? 'deviceorientationabsolute' : 'deviceorientation', function(event) {
    if (typeof event.alpha === 'number') {
      currentRotation = targetNorth - event.alpha;
      centerMap();
    }
  }, true);
}
// عند تحميل الصفحة أو تغيير حجمها، أعد ضبط تموضع الصورة
window.addEventListener('resize', centerMap);
window.addEventListener('DOMContentLoaded', centerMap);

// طلب إذن البوصلة في iOS/Safari
function requestCompassPermission() {
  if (typeof DeviceOrientationEvent !== 'undefined' && typeof DeviceOrientationEvent.requestPermission === 'function') {
    DeviceOrientationEvent.requestPermission().then(function(permissionState) {
      if (permissionState === 'granted') {
        window.location.reload();
      }
    }).catch(console.error);
  }
}
// زر لطلب إذن البوصلة إذا كان مطلوباً
window.addEventListener('DOMContentLoaded', function() {
  if (typeof DeviceOrientationEvent !== 'undefined' && typeof DeviceOrientationEvent.requestPermission === 'function') {
    const compassBtn = document.createElement('button');
    compassBtn.textContent = 'تفعيل البوصلة';
    compassBtn.style.position = 'fixed';
    compassBtn.style.top = '10px';
    compassBtn.style.left = '50%';
    compassBtn.style.transform = 'translateX(-50%)';
    compassBtn.style.zIndex = '9999';
    compassBtn.style.background = '#1976d2';
    compassBtn.style.color = '#fff';
    compassBtn.style.padding = '10px 20px';
    compassBtn.style.borderRadius = '8px';
    compassBtn.style.border = 'none';
    compassBtn.style.fontSize = '1rem';
    compassBtn.onclick = requestCompassPermission;
    document.body.appendChild(compassBtn);
  }
});
