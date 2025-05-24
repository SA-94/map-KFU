// script.js
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

// أبعاد الخريطة الأصلية
const IMG_W = 901, IMG_H = 988;
let animId;

// ملء القائمة
function populateRoomList(){
  Object.keys(roomCoordinates).forEach(rn=>{
    const o = document.createElement('option');
    o.value = rn;
    roomList.appendChild(o);
  });
}

// تولتيب
function showTooltip(){
  tooltip.classList.add('show');
  setTimeout(()=>tooltip.classList.remove('show'),4000);
}

// الوضع الليلي
if(localStorage.getItem('theme')==='dark'){
  document.body.classList.add('dark');
  themeBtn.textContent='☀️';
}
themeBtn.onclick = ()=>{
  document.body.classList.toggle('dark');
  const dark = document.body.classList.contains('dark');
  themeBtn.textContent = dark ? '☀️' : '🌙';
  localStorage.setItem('theme', dark ? 'dark' : 'light');
};

// إعادة التعيين
function resetMap(){
  mapImage.src='map-1.png';
  pin.style.display = animMarker.style.display = 'none';
  clearPath();
  cancelAnimationFrame(animId);
  roomInput.value='';
  errorMsg.style.display='none';
}

// رسم المسار
function drawPath(pts){
  const cw = pathCanvas.width = mapContainer.clientWidth;
  const ch = pathCanvas.height= mapContainer.clientHeight;
  const ctx = pathCanvas.getContext('2d');
  ctx.clearRect(0,0,cw,ch);
  ctx.strokeStyle='rgba(0,0,255,0.7)';
  ctx.lineWidth=4;
  ctx.beginPath();
  pts.forEach((p,i)=> i===0 ? ctx.moveTo(p.x,p.y) : ctx.lineTo(p.x,p.y) );
  ctx.stroke();
}
function clearPath(){
  const ctx = pathCanvas.getContext('2d');
  ctx.clearRect(0,0,pathCanvas.width,pathCanvas.height);
}

// تحريك السهم
let seg=0, t=0, lastTs=0;
function startAnim(pts){
  cancelAnimationFrame(animId);
  seg=0; t=0; lastTs=0;
  animMarker.style.display='block';
  animId = requestAnimationFrame(ts=>animFrame(pts,ts));
}
function animFrame(pts,ts){
  if(!lastTs) lastTs=ts;
  const dt = (ts - lastTs)/1000; lastTs=ts;
  const p0=pts[seg], p1=pts[(seg+1)%pts.length];
  const dx=p1.x-p0.x, dy=p1.y-p0.y;
  const dist=Math.hypot(dx,dy), spd=150;
  t += (spd*dt)/dist;
  if(t>=1){ seg=(seg+1)%pts.length; t=0; }
  const cx=p0.x+dx*t, cy=p0.y+dy*t;
  animMarker.style.left=`${cx}px`;
  animMarker.style.top =`${cy}px`;
  const ang=Math.atan2(dy,dx)*180/Math.PI+90;
  animMarker.style.transform=`translate(-50%,-50%) rotate(${ang}deg)`;
  animId = requestAnimationFrame(next=>animFrame(pts,next));
}

// تحديد القاعة
function locateRoom(){
  const rn = roomInput.value.trim();
  if(!roomCoordinates[rn]){
    errorMsg.textContent='رقم القاعة غير موجود.';
    errorMsg.style.display='block';
    pin.style.display=animMarker.style.display='none';
    clearPath(); cancelAnimationFrame(animId);
    return;
  }
  errorMsg.style.display='none';
  const {x,y,floor} = roomCoordinates[rn];
  mapImage.src = floor===1 ? 'map-1.png' : 'map-2.png';

  const W=mapContainer.clientWidth, H=mapContainer.clientHeight;
  const xAbs=(x/IMG_W)*W, yAbs=(y/IMG_H)*H;
  pin.style.left=`${xAbs}px`;
  pin.style.top =`${yAbs}px`;
  pin.style.display='block';

  if(pathsMap[rn]){
    const absPts = pathsMap[rn].map(p=>({
      x: (p.x/IMG_W)*W,
      y: (p.y/IMG_H)*H
    }));
    drawPath(absPts);
    startAnim(absPts);
  } else {
    clearPath(); cancelAnimationFrame(animId);
  }
}

// الشريط الجانبي
menuToggle.onclick = ()=> sidebar.classList.toggle('active');
closeSidebar.onclick= ()=> sidebar.classList.remove('active');
document.addEventListener('click', e=>{
  if(sidebar.classList.contains('active')
     && !sidebar.contains(e.target)
     && !menuToggle.contains(e.target)){
    sidebar.classList.remove('active');
  }
});

// PAN / ZOOM حول المركز
let currentScale=1, initialScale=1;
let currentTrans={x:0,y:0}, initialTrans={x:0,y:0};
let touchStart=[], startDist=0, pinchCenter={x:0,y:0};
function setTransform(){
  const W=mapContainer.clientWidth, H=mapContainer.clientHeight;
  const sW=W*currentScale, sH=H*currentScale;
  // قيد الترجمة
  currentTrans.x = sW>W ? Math.min(0,Math.max(W-sW,currentTrans.x)) : (W-sW)/2;
  currentTrans.y = sH>H ? Math.min(0,Math.max(H-sH,currentTrans.y)) : (H-sH)/2;
  mapWrapper.style.transform=`translate(${currentTrans.x}px,${currentTrans.y}px) scale(${currentScale})`;
}
mapContainer.addEventListener('touchstart',e=>{
  if(e.touches.length===1){
    touchStart=[{x:e.touches[0].clientX,y:e.touches[0].clientY}];
    initialTrans={...currentTrans};
  } else if(e.touches.length===2){
    touchStart=[{x:e.touches[0].clientX,y:e.touches[0].clientY},
                {x:e.touches[1].clientX,y:e.touches[1].clientY}];
    startDist=Math.hypot(
      touchStart[0].x-touchStart[1].x,
      touchStart[0].y-touchStart[1].y
    );
    initialScale=currentScale;
    const rect=mapContainer.getBoundingClientRect();
    pinchCenter={
      x: ((e.touches[0].clientX+e.touches[1].clientX)/2)-rect.left,
      y: ((e.touches[0].clientY+e.touches[1].clientY)/2)-rect.top
    };
    initialTrans={...currentTrans};
  }
});
mapContainer.addEventListener('touchmove',e=>{
  e.preventDefault();
  if(e.touches.length===1 && touchStart.length===1){
    const dx=e.touches[0].clientX-touchStart[0].x;
    const dy=e.touches[0].clientY-touchStart[0].y;
    currentTrans.x=initialTrans.x+dx;
    currentTrans.y=initialTrans.y+dy;
    setTransform();
  } else if(e.touches.length===2 && touchStart.length===2){
    const newDist=Math.hypot(
      e.touches[0].clientX-e.touches[1].clientX,
      e.touches[0].clientY-e.touches[1].clientY
    );
    currentScale = Math.min(Math.max(initialScale*(newDist/startDist),1),5);
    // حول المركز
    currentTrans.x = initialTrans.x - ((currentScale-initialScale)/initialScale)*pinchCenter.x;
    currentTrans.y = initialTrans.y - ((currentScale-initialScale)/initialScale)*pinchCenter.y;
    setTransform();
  }
});
mapContainer.addEventListener('wheel',e=>{
  e.preventDefault();
  const rect=mapContainer.getBoundingClientRect();
  const mx=e.clientX-rect.left, my=e.clientY-rect.top;
  const delta = e.deltaY<0?1.1:0.9;
  const newScale = Math.min(Math.max(currentScale*delta,1),5);
  // adjust translate so zoom center stays
  currentTrans.x -= ( (newScale/currentScale) -1 ) * mx;
  currentTrans.y -= ( (newScale/currentScale) -1 ) * my;
  currentScale=newScale;
  setTransform();
});

// دعم Enter و Resize
roomInput.addEventListener('keypress',e=>{ if(e.key==='Enter') locateRoom(); });
window.addEventListener('resize',()=>{ if(roomInput.value) locateRoom(); });

// Init
window.onload = ()=>{
  populateRoomList();
  showTooltip();
};
