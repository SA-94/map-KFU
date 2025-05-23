// script.js
// === عناصر DOM ===
const roomInput    = document.getElementById('roomInput');
const roomList     = document.getElementById('roomList');
const mapContainer = document.getElementById('mapContainer');
const mapWrapper   = document.getElementById('mapWrapper');
const mapImage     = document.getElementById('mapImage');
const pathCanvas   = document.getElementById('pathCanvas');
const pin          = document.getElementById('pin');
const animMarker   = document.getElementById('animMarker');
const errorMessage = document.getElementById('errorMessage');
const tooltip      = document.getElementById('tooltip');
const themeBtn     = document.getElementById('theme-toggle');

// أبعاد الخريطة الأصلية
const IMG_WIDTH  = 901;
const IMG_HEIGHT = 988;

// === تهيئة قائمة القاعات ===
function populateRoomList() {
  Object.keys(roomCoordinates).forEach(rn => {
    const opt = document.createElement('option');
    opt.value = rn;
    roomList.appendChild(opt);
  });
}

// === تولتيب يظهر مرة واحدة ===
function showTooltip() {
  tooltip.classList.add('show');
  setTimeout(() => tooltip.classList.remove('show'), 4000);
}

// === الوضع الليلي ===
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

// === إعادة التعيين ===
let animId;
function resetMap() {
  mapImage.src = 'map-1.png';
  pin.style.display = animMarker.style.display = 'none';
  clearPath();
  cancelAnimationFrame(animId);
  roomInput.value = '';
  errorMessage.style.display = 'none';
}

// === رسم المسار ===
function drawPath(pts) {
  const cw = pathCanvas.width  = mapContainer.clientWidth;
  const ch = pathCanvas.height = mapContainer.clientHeight;
  const ctx = pathCanvas.getContext('2d');
  ctx.clearRect(0, 0, cw, ch);
  ctx.strokeStyle = 'rgba(0,0,255,0.7)';
  ctx.lineWidth   = 4;
  ctx.beginPath();
  pts.forEach((p, i) => {
    if (i === 0) ctx.moveTo(p.x, p.y);
    else         ctx.lineTo(p.x, p.y);
  });
  ctx.stroke();
}
function clearPath() {
  const ctx = pathCanvas.getContext('2d');
  ctx.clearRect(0, 0, pathCanvas.width, pathCanvas.height);
}

// === حركة المثلث ===
let seg = 0, t = 0, lastTs = 0;
function startAnim(pts) {
  seg = 0; t = 0; lastTs = 0;
  animMarker.style.display = 'block';
  requestAnimationFrame(ts => animFrame(pts, ts));
}
function animFrame(pts, ts) {
  if (!lastTs) lastTs = ts;
  const dt = (ts - lastTs) / 1000;
  lastTs = ts;
  const p0 = pts[seg];
  const p1 = pts[(seg + 1) % pts.length];
  const dx = p1.x - p0.x, dy = p1.y - p0.y;
  const dist = Math.hypot(dx, dy), speed = 150;
  t += (speed * dt) / dist;
  if (t >= 1) { seg = (seg + 1) % pts.length; t = 0; }
  const cx = p0.x + dx * t, cy = p0.y + dy * t;
  animMarker.style.left = `${cx}px`;
  animMarker.style.top  = `${cy}px`;
  const ang = Math.atan2(dy, dx) * 180 / Math.PI + 90;
  animMarker.style.transform = `translate(-50%, -50%) rotate(${ang}deg)`;
  animId = requestAnimationFrame(next => animFrame(pts, next));
}

// === تحديد القاعة وعرض الموقع/المسار ===
function locateRoom() {
  const rn = roomInput.value.trim();

  // تحقق من وجود القاعة في rooms.js
  if (!roomCoordinates[rn]) {
    errorMessage.textContent = 'رقم القاعة غير موجود.';
    errorMessage.style.display = 'block';
    pin.style.display = animMarker.style.display = 'none';
    clearPath();
    cancelAnimationFrame(animId);
    return;
  }

  // القاعة موجودة
  errorMessage.style.display = 'none';
  const { x, y, floor } = roomCoordinates[rn];
  mapImage.src = floor === 1 ? 'map-1.png' : 'map-2.png';

  // حساب إحداثيات البكسل المكيّفة
  const W = mapContainer.clientWidth;
  const H = mapContainer.clientHeight;
  const xAbs = (x / IMG_WIDTH) * W;
  const yAbs = (y / IMG_HEIGHT) * H;

  pin.style.left    = `${xAbs}px`;
  pin.style.top     = `${yAbs}px`;
  pin.style.display = 'block';

  // إذا المسار موجود في pathsMap (بكسل مطلقة)
  if (pathsMap[rn]) {
    // تحويل نقاط المسار من بكسل أصلي إلى مكيّف
    const absPts = pathsMap[rn].map(p => ({
      x: (p.x / IMG_WIDTH) * W,
      y: (p.y / IMG_HEIGHT) * H,
      type: p.type
    }));
    drawPath(absPts);
    startAnim(absPts);
  } else {
    clearPath();
    cancelAnimationFrame(animId);
  }
}

// الشريط الجانبي
function toggleSidebar() {
  document.getElementById('sidebar').classList.toggle('active');
}

// بدء التشغيل
window.onload = () => {
  populateRoomList();
  showTooltip();
};
