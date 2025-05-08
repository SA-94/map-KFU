// بيانات DOM
const roomInput   = document.getElementById('roomInput');
const roomList    = document.getElementById('roomList');
const mapContainer= document.getElementById('mapContainer');
const mapWrapper  = document.getElementById('mapWrapper');
const mapImage    = document.getElementById('mapImage');
const pin         = document.getElementById('pin');
const errorMessage= document.getElementById('errorMessage');
const tooltip     = document.getElementById('tooltip');

// تعبئة القائمة
function populateRoomList() {
  for (const rn in roomCoordinates) {
    const opt = document.createElement('option');
    opt.value = rn;
    roomList.appendChild(opt);
  }
}

// عرض التولتيب
function showTooltip() {
  tooltip.classList.add('show');
  setTimeout(()=> tooltip.classList.remove('show'), 4000);
}

// تحقق من رقم القاعة
function isValidNumber(val) {
  return /^[0-9\u0660-\u0669]+$/.test(val);
}

// متغيرات الزوم والبان
let currentScale=1, currentTranslate={x:0,y:0}, initialTranslate={x:0,y:0};
let initialDistance=0, initialScale=1, startTouches=[], initialCenter={x:0,y:0};

function setTransform() {
  const W = mapContainer.clientWidth, H = mapContainer.clientHeight;
  const sW = W*currentScale, sH = H*currentScale;
  // تقييد
  if (sW>W) {
    currentTranslate.x = Math.min(0, Math.max(W-sW, currentTranslate.x));
  } else currentTranslate.x=(W-sW)/2;
  if (sH>H) {
    currentTranslate.y = Math.min(0, Math.max(H-sH, currentTranslate.y));
  } else currentTranslate.y=(H-sH)/2;

  mapWrapper.style.transform = `translate(${currentTranslate.x}px,${currentTranslate.y}px) scale(${currentScale})`;
}

// لمسات اللمس (بان + زوم)
mapContainer.addEventListener('touchstart', e=>{
  if (e.touches.length===1) {
    startTouches=[{x:e.touches[0].clientX,y:e.touches[0].clientY}];
  } else if (e.touches.length===2) {
    startTouches=[{x:e.touches[0].clientX,y:e.touches[0].clientY},{x:e.touches[1].clientX,y:e.touches[1].clientY}];
    initialDistance = Math.hypot(
      startTouches[0].x - startTouches[1].x,
      startTouches[0].y - startTouches[1].y
    );
    initialScale = currentScale;
    const rect = mapContainer.getBoundingClientRect();
    initialCenter = {
      x: ((e.touches[0].clientX+e.touches[1].clientX)/2)-rect.left,
      y: ((e.touches[0].clientY+e.touches[1].clientY)/2)-rect.top
    };
  }
});
mapContainer.addEventListener('touchmove', e=>{
  e.preventDefault();
  if (e.touches.length===1 && startTouches.length===1) {
    let dx = e.touches[0].clientX - startTouches[0].x;
    let dy = e.touches[0].clientY - startTouches[0].y;
    currentTranslate.x = initialTranslate.x + dx;
    currentTranslate.y = initialTranslate.y + dy;
    setTransform();
  } else if (e.touches.length===2 && startTouches.length===2) {
    let newD = Math.hypot(
      e.touches[0].clientX - e.touches[1].clientX,
      e.touches[0].clientY - e.touches[1].clientY
    );
    let newScale = initialScale * (newD/initialDistance);
    currentScale = newScale;
    currentTranslate.x = initialTranslate.x - ((newScale - initialScale)/initialScale)*initialCenter.x;
    currentTranslate.y = initialTranslate.y - ((newScale - initialScale)/initialScale)*initialCenter.y;
    setTransform();
  }
});
mapContainer.addEventListener('touchend', e=>{
  if (!e.touches.length) {
    initialTranslate = {...currentTranslate};
    startTouches = [];
  }
});

// إعادة التعيين
function resetMap(){
  mapImage.src="map-1.png";
  currentScale=1;
  currentTranslate={x:0,y:0};
  initialTranslate={x:0,y:0};
  setTransform();
  pin.style.display='none';
  roomInput.value='';
  errorMessage.style.display='none';
}

// تحديد القاعة
function locateRoom(){
  const rn=roomInput.value.trim();
  if (!isValidNumber(rn)||!roomCoordinates[rn]){
    errorMessage.textContent = roomCoordinates[rn] ? "" : "رقم القاعة غير صحيح.";
    errorMessage.style.display = 'block';
    pin.style.display='none';
    return;
  }
  const {x,y,floor} = roomCoordinates[rn];
  mapImage.src = floor===1 ? "map-1.png" : "map-2.png";
  const xP=(x/901)*100, yP=(y/988)*100;
  pin.style.left=`${xP}%`;
  pin.style.top=`${yP}%`;
  pin.style.display='block';
  errorMessage.style.display='none';
}

// تفعيل القائمة الجانبية
function toggleSidebar(){
  document.getElementById('sidebar').classList.toggle('active');
}

// بداية
window.onload = ()=>{
  if (typeof roomCoordinates==='undefined') console.error("rooms.js لم يُحمّل!");
  populateRoomList();
  showTooltip();
};
