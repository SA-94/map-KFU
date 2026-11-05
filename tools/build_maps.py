"""build_maps.py — يرسم مخططَي الدورين من جديد كرسم متجه (SVG).

المخطط القديم (assets/maps/map-*.png) يُستخدم مرجعاً للمواقع فقط:
نستخرج منه الغرف والممرات والأبواب ودورات المياه والمصاعد، ثم نرسمها
من الصفر بأسلوب جديد في assets/maps/floor-*.svg بنفس الأبعاد (901×988)
حتى تبقى كل إحداثيات القاعات والمسارات صالحة كما هي.

التشغيل (من جذر المشروع):
    python tools/build_maps.py
المتطلبات: numpy, opencv-python, pillow, node (لقراءة rooms.js)
"""
import json
import os
import subprocess
import sys

import cv2
import numpy as np
from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
W, H = 901, 988

# ───────────────────────── الألوان (الهوية الجديدة) ─────────────────────────
PAL = {
    'ground':    '#F4F1EA',   # خارج المبنى
    'paving':    '#E7E2D6',   # الأرصفة حول المبنى
    'wall':      '#2E3640',   # الجدران
    'corridor':  '#F1D3A2',   # الممرات (لون كهرماني فاتح واضح)
    'classroom': '#DCE8EE',   # القاعات الدراسية (الأزرق القديم)
    'office':    '#EFE6D2',   # المكاتب (الأصفر/الكريمي القديم)
    'hall':      '#E9D9C4',   # القاعات الكبيرة والمعامل (الخوخي القديم)
    'service':   '#E4E1DA',   # غرف خدمات/غير مصنفة
    'court':     '#E2DAC8',   # الفناء
    'label':     '#5B6673',
    'door':      '#B08A4E',
    'wc':        '#2F7F86',
    'wcStaff':   '#6B5B95',
    'lift':      '#C2410C',
    'stairs':    '#8A6D3B',
    'exit':      '#15803D',
    'stairsFill': '#E8DFCB',  # أرضية بيت الدرج
    'tread':     '#B9A98A',   # خطوط الدرجات
}


# ═════════════════════ النموذج المعماري (شبكة الجدران) ═════════════════════
# المبنى يُبنى على خطوط جدران مستقيمة مشتركة: كل جدار عمودي يقع على خط x
# من مجموعة واحدة، وكل جدار أفقي على خط y. الغرف خلايا بين هذه الخطوط،
# فتتطابق جدران الجيران تماماً ولا يوجد ميلان ولا كسر.

def wall_lines(part, vertical, tol=4, min_hits=3):
    """مواقع خطوط الجدران: حيث تتغير المنطقة من بكسل لجاره."""
    if vertical:
        diff = part[:, 1:] != part[:, :-1]
        counts = diff.sum(0)
    else:
        diff = part[1:, :] != part[:-1, :]
        counts = diff.sum(1)
    pos = np.nonzero(counts >= min_hits)[0]
    lines = []
    i = 0
    while i < len(pos):
        j = i
        while j + 1 < len(pos) and pos[j + 1] - pos[i] <= tol:
            j += 1
        seg = pos[i:j + 1]
        w = counts[seg].astype(float)
        lines.append((float((seg + 1) @ w / w.sum()), float(w.sum())))  # (الموقع، الوزن)
        i = j + 1
    return lines


def cell_grid(part, X, Y):
    """كل خلية بين خطين متجاورين تأخذ المنطقة الأكثر فيها."""
    labels, inv = np.unique(part, return_inverse=True)
    inv = inv.reshape(part.shape)
    ix = np.searchsorted(X, np.arange(W) + 0.5) - 1
    iy = np.searchsorted(Y, np.arange(H) + 0.5) - 1
    nx, ny, nl = len(X) - 1, len(Y) - 1, len(labels)
    cell = (iy[:, None] * nx + ix[None, :])
    key = cell.ravel().astype(np.int64) * nl + inv.ravel()
    cnt = np.bincount(key, minlength=nx * ny * nl).reshape(nx * ny, nl)
    grid = labels[cnt.argmax(1)].reshape(ny, nx)
    return grid


def grid_rects(grid, X, Y, label):
    """تحويل خلايا منطقة إلى أقل عدد من المستطيلات (صفوف ثم دمج عمودي)."""
    ny, nx = grid.shape
    runs_prev = {}
    rects = []
    for j in range(ny):
        runs = {}
        i = 0
        row = grid[j]
        while i < nx:
            if row[i] == label:
                k = i
                while k + 1 < nx and row[k + 1] == label:
                    k += 1
                runs[(i, k)] = runs_prev.get((i, k), j)  # بداية المستطيل عمودياً
                i = k + 1
            else:
                i += 1
        for (a, b), j0 in runs_prev.items():
            if (a, b) not in runs:
                rects.append((X[a], Y[j0], X[b + 1], Y[j]))
        runs_prev = runs
    for (a, b), j0 in runs_prev.items():
        rects.append((X[a], Y[j0], X[b + 1], Y[ny]))
    return rects


def rects_d(rects):
    """مستطيلات كثيرة في مسار واحد: لا خطوط وهمية بين المستطيلات المتلاصقة."""
    return ''.join(f'M{a:g},{b:g}H{c:g}V{d:g}H{a:g}Z' for a, b, c, d in rects)


def grid_walls(grid, X, Y, is_open):
    """قطع الجدران: حدود بين منطقتين مختلفتين (إلا ممر|ممر)، مدموجة في خطوط طويلة.
    تُرجع (داخلية، خارجية)."""
    ny, nx = grid.shape
    inner, outer = [], []

    def kind(a, b):
        if a == b:
            return None
        if is_open(a) and is_open(b):
            return None
        return 'out' if (a == OUT_LABEL or b == OUT_LABEL) else 'in'

    # جدران عمودية على x = X[i+1]
    for i in range(nx - 1):
        cur = None
        for j in range(ny + 1):
            k = kind(grid[j, i], grid[j, i + 1]) if j < ny else None
            if cur and (k != cur[0]):
                (outer if cur[0] == 'out' else inner).append((X[i + 1], Y[cur[1]], X[i + 1], Y[j]))
                cur = None
            if k and not cur:
                cur = (k, j)
    # جدران أفقية على y = Y[j+1]
    for j in range(ny - 1):
        cur = None
        for i in range(nx + 1):
            k = kind(grid[j, i], grid[j + 1, i]) if i < nx else None
            if cur and (k != cur[0]):
                (outer if cur[0] == 'out' else inner).append((X[cur[1]], Y[j + 1], X[i], Y[j + 1]))
                cur = None
            if k and not cur:
                cur = (k, i)
    # حدود الصورة
    for j in range(ny):
        for i, xx in ((0, X[0]), (nx - 1, X[nx])):
            if grid[j, i] != OUT_LABEL:
                outer.append((xx, Y[j], xx, Y[j + 1]))
    return inner, outer


OUT_LABEL = 1_000_001
CORR_LABEL = 1_000_000


def snap_lines(lines, size, min_gap=6):
    """يدمج الخطوط المتقاربة (يبقى الأقوى) فلا تنشأ شرائح رفيعة تسبب درجات في الجدران."""
    L = sorted([[0.0, 1e9]] + [list(l) for l in lines] + [[float(size), 1e9]])
    changed = True
    while changed:
        changed = False
        for i in range(len(L) - 1):
            if L[i + 1][0] - L[i][0] < min_gap:
                keep = L[i] if L[i][1] >= L[i + 1][1] else L[i + 1]
                L[i:i + 2] = [[keep[0], L[i][1] + L[i + 1][1]]]
                changed = True
                break
    return np.array([round(v * 2) / 2 for v, _ in L])


def clean_grid(grid, X, Y, min_area=40):
    """الجزر الصغيرة جداً (بقايا جدران قديمة) تُضم لجارها الأكبر."""
    cw = np.diff(X)[None, :]
    ch = np.diff(Y)[:, None]
    area = ch * cw
    for _ in range(3):
        changed = False
        for lab in np.unique(grid):
            m = (grid == lab).astype(np.uint8)
            n, cc = cv2.connectedComponents(m, connectivity=4)
            for k in range(1, n):
                sel = cc == k
                if area[sel].sum() >= min_area:
                    continue
                # الجار الأطول حداً مشتركاً
                votes = {}
                ys, xs = np.nonzero(sel)
                for y, x in zip(ys, xs):
                    for dy, dx in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                        yy, xx = y + dy, x + dx
                        if 0 <= yy < grid.shape[0] and 0 <= xx < grid.shape[1] and not sel[yy, xx]:
                            ln = cw[0, x] if dy else ch[y, 0]
                            votes[grid[yy, xx]] = votes.get(grid[yy, xx], 0) + ln
                if votes:
                    grid[sel] = max(votes, key=votes.get)
                    changed = True
        if not changed:
            break
    return grid


def load_paths():
    js = r"""global.window={};require(process.argv[1]+'/data/agri-food/male/paths.rel.js');
console.log(JSON.stringify(window.pathsMap));"""
    out = subprocess.check_output(['node', '-e', js, ROOT], encoding='utf-8')
    return json.loads(out)


PATHS = {}
DEBUG = {}
MARKS = {}     # علامات المستخدم لكل طابق
SUGGEST = {}   # اقتراحات تلقائية لكل طابق
BASE = {}      # خلفية المحرر (بلا أبواب ولا رموز)
REPORT = {}
GRIDEXP = {}
AUTO_MARKS = '--auto-marks' in sys.argv
# (محور، موضع الخط الجديد، نقطة داخل الخلية التي تصير سيباً، 'corr')
# الدور 2: غرفة 2119 بابها في المخطط القديم في فتحة صغيرة يسار مربع دورة مياه الدكاترة
GRID_FIX = {2: [('x', 643.5, (640.0, 482.0), 'corr')]}
NAMED_ICONS = {'درج': 'stairs', 'المسجد': 'mosque', 'المسرح': 'theater'}
MARKS_FILE = os.path.join(ROOT, 'tools', 'map-marks.json')
CACHE = os.path.join(ROOT, 'tools', '.cache')


def load_rooms():
    js = r"""global.window={};require(process.argv[1]+'/data/agri-food/male/rooms.js');
console.log(JSON.stringify(window.roomCoordinates));"""
    out = subprocess.check_output(['node', '-e', js, ROOT], encoding='utf-8')
    return json.loads(out)


def classify(im):
    """يصنّف كل بكسل في المخطط القديم إلى فئة."""
    a = im.astype(np.int32)
    r, g, b = a[..., 0], a[..., 1], a[..., 2]
    mx, mn = a.max(2), a.min(2)
    sat = mx - mn
    c = {}
    c['ink'] = mx < 75
    c['corridor'] = (r > 110) & (g > 70) & (g < 150) & (b < 115) & (r > g) & (g > b) & (r - b > 40) & (g > 0.6 * r)
    c['rust'] = (r > 130) & (r < 215) & (g > 35) & (g < 105) & (b < 85) & (r - g > 55)
    c['pink'] = (r > 200) & (g > 100) & (g < 175) & (b > 115) & (b < 195) & (r - g > 55)
    c['magenta'] = (r > 140) & (r < 205) & (g > 40) & (g < 105) & (b > 95) & (b < 175)
    c['red'] = (r > 195) & (g < 75) & (b < 75)
    c['orange'] = (r > 220) & (g > 130) & (g < 205) & (b < 90)
    c['green'] = (g > 100) & (g - r > 30) & (g - b > 25)
    c['peach'] = (r > 235) & (g > 180) & (g < 225) & (b > 120) & (b < 190)
    c['light'] = ((mn > 150) | c['peach']) & ~c['corridor'] & ~c['orange'] & ~c['pink']
    c['grey'] = (mx >= 75) & (mx < 150) & (sat < 45)
    return c


def flood_outside(light):
    """الخارج = البكسلات الفاتحة المتصلة بإطار الصورة."""
    m = light.astype(np.uint8)
    n, lab = cv2.connectedComponents(m, connectivity=4)
    border = set(np.unique(np.concatenate([lab[0], lab[-1], lab[:, 0], lab[:, -1]])))
    border.discard(0)
    return np.isin(lab, list(border)) & light


def orthogonalize(pts, tol=0.22):
    """يجعل الأضلاع شبه الأفقية/العمودية مستقيمة تماماً (مظهر معماري نظيف)."""
    p = pts.astype(float).copy()
    n = len(p)
    for _ in range(2):
        for i in range(n):
            a, b = p[i], p[(i + 1) % n]
            dx, dy = abs(b[0] - a[0]), abs(b[1] - a[1])
            if dx > 0 and dy <= dx * tol:
                m = (a[1] + b[1]) / 2
                a[1] = b[1] = m
            elif dy > 0 and dx <= dy * tol:
                m = (a[0] + b[0]) / 2
                a[0] = b[0] = m
    # حذف النقاط المكررة والواقعة على خط مستقيم
    out = []
    for i in range(n):
        prev, cur, nxt = p[i - 1], p[i], p[(i + 1) % n]
        if np.hypot(*(cur - prev)) < 0.6:
            continue
        cross = (cur[0] - prev[0]) * (nxt[1] - cur[1]) - (cur[1] - prev[1]) * (nxt[0] - cur[0])
        if abs(cross) < 0.5:
            continue
        out.append(cur)
    return np.array(out) if len(out) >= 3 else p


def poly_path(cnt, eps=1.0):
    ap = cv2.approxPolyDP(cnt, eps, True).reshape(-1, 2)
    if len(ap) < 3:
        return ''
    ap = orthogonalize(ap)
    return 'M' + ' L'.join(f'{x:.1f},{y:.1f}' for x, y in ap) + 'Z'


def mask_paths(mask, eps=1.0, min_area=12, rect_snap=True):
    """يحوّل قناعاً إلى مسارات SVG (مستطيلات نظيفة حيث أمكن)."""
    m = mask.astype(np.uint8) * 255
    cnts, hier = cv2.findContours(m, cv2.RETR_CCOMP, cv2.CHAIN_APPROX_NONE)
    out = []
    if hier is None:
        return out
    hier = hier[0]
    for i, cnt in enumerate(cnts):
        if hier[i][3] != -1:
            continue  # الثقوب تُضاف مع أبيها
        area = cv2.contourArea(cnt)
        if area < min_area:
            continue
        x, y, w, h = cv2.boundingRect(cnt)
        d = ''
        if rect_snap and area / max(1, w * h) > 0.84:
            d = f'M{x},{y} h{w} v{h} h{-w}Z'
        else:
            d = poly_path(cnt, eps)
        # الثقوب
        j = hier[i][2]
        while j != -1:
            if cv2.contourArea(cnts[j]) >= min_area:
                d += poly_path(cnts[j], eps)
            j = hier[j][0]
        if d:
            out.append((d, (x, y, w, h), cnt))
    return out


def room_kind(mean):
    r, g, b = mean
    if b > r + 6 and b > 215:
        return 'classroom'
    if r > 238 and g < 220 and b < 185:
        return 'hall'
    if r > 225 and g > 215 and b < 232 and r - b > 10:
        return 'office'
    if r > 200 and g > 185 and b < 175:
        return 'court'
    return 'service'


def blobs(mask, min_area, max_area=10**9):
    n, lab, st, cen = cv2.connectedComponentsWithStats(mask.astype(np.uint8), connectivity=8)
    res = []
    for i in range(1, n):
        if min_area <= st[i, 4] <= max_area:
            res.append(dict(x=st[i, 0], y=st[i, 1], w=st[i, 2], h=st[i, 3], area=st[i, 4],
                            cx=float(cen[i][0]), cy=float(cen[i][1])))
    return res


def build(floor, rooms):
    src = np.array(Image.open(os.path.join(ROOT, 'assets', 'maps', f'map-{floor}.png')).convert('RGB'))
    assert src.shape[:2] == (H, W), src.shape
    c = classify(src)
    # مربعات الخدمات (دورات المياه والمصاعد) غرف، لا ممرات، حتى لو قارب لونها لون الممر
    svc = cv2.morphologyEx((c['rust'] | c['pink'] | c['magenta'] | c['red']).astype(np.uint8), cv2.MORPH_CLOSE, np.ones((5, 5), np.uint8)).astype(bool)
    c['corridor'] &= ~svc
    c['rust'] |= svc & ~(c['pink'] | c['magenta'] | c['red'])

    outside = flood_outside(c['light'] | (c['grey'] & (src.min(2) > 120)))
    building = ~outside
    # إغلاق الفجوات الصغيرة وملء المبنى
    k3 = np.ones((3, 3), np.uint8)
    building = cv2.morphologyEx(building.astype(np.uint8), cv2.MORPH_CLOSE, k3).astype(bool)

    # الأبواب: كتل حبر سميكة (نصف دائرة) تبقى بعد إزالة الخطوط الرفيعة
    ink = c['ink'] | (c['grey'] & ~outside)
    k = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (5, 5))
    thick = cv2.morphologyEx(ink.astype(np.uint8), cv2.MORPH_OPEN, k).astype(bool)
    doors = [d for d in blobs(thick, 8, 90) if d['w'] <= 14 and d['h'] <= 14]

    # الخدمات
    rust = blobs(cv2.morphologyEx(c['rust'].astype(np.uint8), cv2.MORPH_OPEN, k3), 40)
    staff = blobs(cv2.morphologyEx((c['pink'] | c['magenta']).astype(np.uint8), cv2.MORPH_OPEN, k3), 20)
    lifts = blobs(c['red'], 10)
    stairs = blobs(cv2.morphologyEx(c['orange'].astype(np.uint8), cv2.MORPH_OPEN, k3), 60)
    if floor == 1:  # لافتات الطابق الأرضي خضراء داكنة
        a = src.astype(np.int32)
        dg = (a[..., 1] > a[..., 0] + 12) & (a[..., 1] > a[..., 2] + 8) & (a.max(2) < 140)
        exits = blobs(dg, 300)
    else:
        exits = blobs(c['green'], 300)
    # اللافتة القديمة تُمسح: داخل المبنى تصير ممراً، وخارجه تصير أرضاً
    for e in exits:
        x0, y0, x1, y1 = e['x'] - 2, e['y'] - 2, e['x'] + e['w'] + 2, e['y'] + e['h'] + 2
        ring = np.zeros((H, W), bool)
        ring[max(0, y0 - 4):y1 + 4, max(0, x0 - 4):x1 + 4] = True
        ring[max(0, y0):y1, max(0, x0):x1] = False
        if c['corridor'][ring].mean() > 0.4:
            c['corridor'][max(0, y0):y1, max(0, x0):x1] = True
        else:
            building[max(0, y0):y1, max(0, x0):x1] = False

    # الطبقة الأولى من الطابق الأرضي فيها مواقف ومظلات خارجية: نعزلها
    outdoor = np.zeros_like(building)
    if floor == 1:
        outdoor[0:440, 330:760] = True
        outdoor[340:440, 225:330] = True
        building &= ~outdoor

    def inside(lst):
        return [b for b in lst if building[int(b['cy']), int(b['cx'])]]
    doors, rust, staff, lifts, stairs = map(inside, (doors, rust, staff, lifts, stairs))

    # الغرف = المناطق الفاتحة داخل المبنى (+ الأبواب ومربعات الخدمات تُعامل كأرضية الغرفة)
    fill = (c['light'] | c['rust'] | c['pink'] | c['magenta'] | c['red'] | c['orange'] | c['green']) & building
    # (الأبواب لا تُضاف هنا: تقسيم المبنى يضمّها لأقرب غرفة تلقائياً،
    #  وإضافتها كمستطيلات كانت تصل الغرف المتجاورة عبر الجدار فتندمج)
    fill &= ~c['corridor']
    fill = cv2.morphologyEx(fill.astype(np.uint8), cv2.MORPH_OPEN, k3).astype(bool)

    corridor = c['corridor'] & building
    corridor = cv2.morphologyEx(corridor.astype(np.uint8), cv2.MORPH_CLOSE, k3)
    corridor = cv2.morphologyEx(corridor, cv2.MORPH_OPEN, k3).astype(bool)

    # ── تقسيم المبنى: كل بكسل يتبع أقرب غرفة أو ممر ──
    # الجدران القديمة (سميكة وغير منتظمة) تُقسم بالمنتصف بين جيرانها،
    # فتتلاصق الغرف وتُرسم الجدران خطوطاً رفيعة متساوية على الحدود.
    CORR, OUT = 1_000_000, 1_000_001
    nlab, rl, st, _ = cv2.connectedComponentsWithStats(fill.astype(np.uint8), connectivity=4)
    seeds = np.zeros((H, W), np.int32)
    keep = [i for i in range(1, nlab) if st[i, 4] >= 90]
    for i in keep:
        seeds[rl == i] = i
    seeds[corridor & (seeds == 0)] = CORR
    seeds[~building] = OUT
    unknown = (seeds == 0).astype(np.uint8)
    _, lab = cv2.distanceTransformWithLabels(unknown, cv2.DIST_L2, 5, labelType=cv2.DIST_LABEL_PIXEL)
    lut = np.zeros(lab.max() + 1, np.int32)
    lut[lab[seeds != 0]] = seeds[seeds != 0]
    part = np.where(seeds != 0, seeds, lut[lab])

    svg = []
    add = svg.append
    add(f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {W} {H}" width="{W}" height="{H}" '
        f'font-family="Tahoma, \'Segoe UI\', Arial, sans-serif">')
    add(defs())
    add(f'<rect width="{W}" height="{H}" fill="{PAL["ground"]}"/>')

    # الأرصفة حول المبنى (الرمادي الفاتح القديم)
    a = src.astype(np.int32)
    paving = outside & (a.min(2) > 190) & (a.min(2) < 236) & ((a.max(2) - a.min(2)) < 22)
    paving = cv2.morphologyEx(paving.astype(np.uint8), cv2.MORPH_OPEN, np.ones((5, 5), np.uint8)).astype(bool)
    for d, _, _ in mask_paths(paving, eps=1.5, min_area=300, rect_snap=True):
        add(f'<path d="{d}" fill="{PAL["paving"]}"/>')

    if floor == 1:
        add(outdoor_floor1(src, c))

    # ── الشبكة المعمارية: خطوط جدران مشتركة، وكل خلية تتبع منطقة واحدة ──
    X = snap_lines(wall_lines(part, True), W)
    Y = snap_lines(wall_lines(part, False), H)
    grid = clean_grid(cell_grid(part, X, Y), X, Y)
    # تصحيحات يدوية دقيقة حيث دمجت الشبكة خطّين متقاربين فضاع ممر صغير أمام باب
    for axis, at, (px_, py_), lab_ in GRID_FIX.get(floor, []):
        L = list(X) if axis == 'x' else list(Y)
        k = int(np.searchsorted(L, at)) - 1          # الخلية التي يقسمها الخط الجديد
        L.insert(k + 1, float(at))
        grid = np.insert(grid, k, grid[:, k] if axis == 'x' else grid[k, :], axis=1 if axis == 'x' else 0)
        if axis == 'x':
            X = np.array(L)
        else:
            Y = np.array(L)
        ci = int(np.searchsorted(X, px_)) - 1
        cj = int(np.searchsorted(Y, py_)) - 1
        grid[cj, ci] = CORR if lab_ == 'corr' else grid[cj, ci]
    ix = np.searchsorted(X, np.arange(W) + 0.5) - 1
    iy = np.searchsorted(Y, np.arange(H) + 0.5) - 1
    gimg = grid[iy[:, None], ix[None, :]]          # المنطقة لكل بكسل بعد التقويم
    is_open = lambda a: a == CORR   # ممر|ممر فقط بلا جدار؛ ممر|خارج = جدار خارجي

    # المبنى: أرضية الممرات + ظل خفيف
    base = []
    for lab_ in np.unique(grid):
        if lab_ != OUT:
            base += grid_rects(grid, X, Y, lab_)
    add(f'<path d="{rects_d(base)}" fill="{PAL["corridor"]}" filter="url(#lift)"/>')

    # الغرف: مستطيلات صافية بلا حدود (الجدران تُرسم بعدها خطوطاً موحدة)
    room_fill = {}
    for i in keep:
        if not (grid == i).any():
            continue
        sel = (rl == i) & c['light']
        mean = src[sel].mean(0) if sel.sum() > 5 else src[rl == i].mean(0)
        room_fill[i] = PAL[room_kind(mean)]
    fm_icons = (MARKS.get(str(floor)) or {}).get('icons')
    if fm_icons is None:
        st_pts = [(b['cx'], b['cy']) for b in stairs] + \
                 [(v['x'], v['y']) for nm, v in rooms.items() if v['floor'] == floor and NAMED_ICONS.get(nm) == 'stairs']
    else:
        st_pts = [(float(i['x']), float(i['y'])) for i in fm_icons if i.get('type') in ('stairs', 'stairsV')]
    stairs_rooms = set()
    for sx, sy in st_pts:
        l = gimg[int(min(H - 1, max(0, sy))), int(min(W - 1, max(0, sx)))]
        if l in room_fill and (gimg == l).sum() <= 3000:   # لا نحوّل قاعة كبيرة لدرج بالخطأ
            stairs_rooms.add(l)
            room_fill[l] = PAL['stairsFill']
    by_color = {}
    for i, col in room_fill.items():
        by_color.setdefault(col, []).extend(grid_rects(grid, X, Y, i))
    for col, rects in by_color.items():
        add(f'<path d="{rects_d(rects)}" fill="{col}"/>')
    room_count = len(room_fill)
    for l in stairs_rooms:   # الدرجات: خطوط متوازية بعرض بيت الدرج
        segs = []
        for x0, y0, x1, y1 in grid_rects(grid, X, Y, l):
            if (x1 - x0) >= (y1 - y0):
                xs = np.arange(x0 + 2.5, x1 - 1, 3.0)
                segs += [f'M{x:.1f},{y0 + 1:.1f}V{y1 - 1:.1f}' for x in xs]
            else:
                ys = np.arange(y0 + 2.5, y1 - 1, 3.0)
                segs += [f'M{x0 + 1:.1f},{y:.1f}H{x1 - 1:.1f}' for y in ys]
        add(f'<path d="{"".join(segs)}" stroke="{PAL["tread"]}" stroke-width="0.7" fill="none"/>')

    # الجدران: داخلية رفيعة وخارجية أسمك، كلها على خطوط الشبكة
    inner_w, outer_w = grid_walls(grid, X, Y, is_open)
    def seg_path(segs):
        return ' '.join(f'M{a:.1f},{b:.1f}L{c_:.1f},{d_:.1f}' for a, b, c_, d_ in segs)
    add(f'<path d="{seg_path(inner_w)}" fill="none" stroke="{PAL["wall"]}" stroke-width="1.5" '
        f'stroke-linecap="square"/>')
    add(f'<path d="{seg_path(outer_w)}" fill="none" stroke="{PAL["wall"]}" stroke-width="3" '
        f'stroke-linecap="square" stroke-linejoin="miter"/>')

    # الأبواب: كل باب في جدار غرفة (لا داخلها)، وباب عند نهاية كل مسار
    placed = []
    for key, pts in PATHS.items():
        v = rooms.get(key)
        if not v or v['floor'] != floor or not pts:
            continue
        ex, ey = pts[-1]['x'], pts[-1]['y']
        if not (0 <= ex < W and 0 <= ey < H):
            continue
        hint = gimg[int(min(H - 1, max(0, v['y']))), int(min(W - 1, max(0, v['x'])))]
        p = None
        for reach in (18, 40):   # نهاية المسار قد تقف قبل الباب بقليل
            q = place_door(gimg, ex, ey, CORR, OUT, hint=hint, reach=reach)
            p = q and (fit_door(gimg, q) or fit_door(gimg, q, r=5.0, margin=0.5)
                       or fit_door(gimg, q, r=5.0, margin=0.5, loose=True))
            if p:
                break
        if p:
            p['src'] = 'path'
            placed.append(p)
    for d in doors:
        p = place_door(gimg, d['cx'], d['cy'], CORR, OUT)
        p = p and fit_door(gimg, p)
        if p:
            p['src'] = 'blob'
            placed.append(p)
    # إزالة التكرار: باب المسار هو المرجع؛ بابان لنفس الغرفة على نفس الجدار
    # ومتقاربان = باب واحد
    doors_final = []
    for p in placed:
        dup = False
        for q in doors_final:
            if q['vertical'] != p['vertical'] or abs(q['wall'] - p['wall']) > 3:
                continue
            gap = abs(q['along'] - p['along'])
            both_path = q['src'] == 'path' and p['src'] == 'path'
            if gap < 9 or (q['room'] == p['room'] and gap < (12 if both_path else 24)):
                dup = True
                break
        if not dup:
            doors_final.append(p)
    # ── الاقتراحات التلقائية (يستعملها المحرر فقط) ──
    spots = [(v['x'], v['y']) for k, v in rooms.items() if v['floor'] == floor and k.isdigit()]
    def clear_of_labels(b):
        for (lx, ly) in spots:
            if abs(lx - b['cx']) < 13 and abs(ly - b['cy']) < 8:
                side = -1 if b['cx'] <= lx else 1
                return dict(b, cx=lx + side * 17)
        return b
    auto_icons = []
    for kind, L in (('wc', rust), ('wcStaff', staff), ('lift', lifts), ('stairs', stairs)):
        for b in L:
            if kind == 'stairs':
                kind_ = 'stairsV' if b['h'] > b['w'] else 'stairs'
            else:
                kind_, b = kind, clear_of_labels(b)
            auto_icons.append(dict(type=kind_, x=round(b['cx'], 1), y=round(b['cy'], 1)))
    for nm, v in rooms.items():
        if v['floor'] == floor and nm in NAMED_ICONS:
            auto_icons.append(dict(type=NAMED_ICONS[nm], x=round(v['x'], 1), y=round(v['y'], 1)))
    for b in exits:
        auto_icons.append(dict(type='exitV' if b['h'] > b['w'] else 'exit',
                               x=round(b['cx'], 1), y=round(b['cy'], 1)))
    auto_doors = [dict(x=round(p['wall'] if p['vertical'] else p['along'], 1),
                       y=round(p['along'] if p['vertical'] else p['wall'], 1)) for p in doors_final
                  if p.get('other') in (CORR, OUT) and p['room'] not in stairs_rooms]
    SUGGEST[floor] = dict(doors=auto_doors, icons=auto_icons)

    # ── علامات المستخدم (tools/map-marks.json): هي المرجع للرموز والأبواب ──
    if AUTO_MARKS:
        MARKS[str(floor)] = auto_marks(floor, rooms, gimg, grid, X, Y, CORR, OUT, doors,
                                       rust, staff, lifts, stairs_rooms, MARKS.get(str(floor)))
    fm = MARKS.setdefault(str(floor), dict(icons=auto_icons, doors=[]))
    BASE[floor] = '\n'.join(svg + [labels(rooms, floor), '</svg>'])   # خلفية المحرر

    doors_final, unplaced = [], []
    for d in fm.get('doors', []):
        p = place_mark_door(gimg, float(d['x']), float(d['y']), CORR, OUT)
        p = p and (fit_door(gimg, p) or fit_door(gimg, p, r=5.0, margin=0.5)
                   or fit_door(gimg, p, r=5.0, margin=0.5, loose=True))
        if p and p['room'] in stairs_rooms:
            p = None
        if p:
            doors_final.append(p)
        else:
            unplaced.append(dict(x=d['x'], y=d['y']))
    def side_fill(l):
        if l in room_fill:
            return room_fill[l]
        return PAL['ground'] if l == OUT else PAL['corridor']
    for p in doors_final:
        add(door_svg(p, side_fill(p['room']), side_fill(p.get('other'))))
    doors = doors_final
    # شبكة الجدران للمحرر: حتى يلصق النقطة بالجدار ويرسم الباب مثل الناتج تماماً
    uniq, gidx = np.unique(grid, return_inverse=True)
    GRIDEXP[floor] = dict(X=[float(v) for v in X], Y=[float(v) for v in Y],
                          grid=gidx.reshape(grid.shape).tolist(),
                          corr=int(np.searchsorted(uniq, CORR)), out=int(np.searchsorted(uniq, OUT)),
                          fill=[side_fill(int(l)) for l in uniq],
                          stairs=[int(np.searchsorted(uniq, l)) for l in stairs_rooms])
    DEBUG[floor] = dict(gimg=gimg, X=X, Y=Y, grid=grid, doors=doors_final, CORR=CORR, OUT=OUT)
    REPORT[str(floor)] = dict(doors=len(doors_final), unplaced=unplaced)

    # أرقام القاعات: مخفية في الخريطة المنشورة (البحث يدل على القاعة بالدبوس)،
    # وتبقى ظاهرة في خلفية المحرر (BASE) للضبط اليدوي
    if SHOW_ROOM_NUMBERS:
        add(labels(rooms, floor))

    # الرموز
    counts = {}
    for ic in fm.get('icons', []):
        t = ic.get('type')
        b = dict(cx=float(ic['x']), cy=float(ic['y']), w=14, h=14)
        if t == 'exit':
            add(exit_sign(dict(b, w=30, h=13)))
        elif t == 'exitV':
            add(exit_sign(dict(b, w=13, h=30)))
        elif t in ('stairs', 'stairsV'):   # الدرج مرسوم درجات بدل الشعار
            sw_, sh_ = (28.0, 16.0) if t == 'stairs' else (16.0, 28.0)
            add(stairs_svg(dict(x=b['cx'] - sw_ / 2 + 1, y=b['cy'] - sh_ / 2 + 1, w=sw_ - 2, h=sh_ - 2)))
        elif t in ('wc', 'wcStaff', 'lift', 'mosque', 'theater'):
            add(badge(t, b, ic.get('s')))
        else:
            continue
        counts[t] = counts.get(t, 0) + 1

    add('</svg>')
    stats = dict(rooms=room_count, doors=len(doors), unplaced=len(unplaced), **counts)
    return '\n'.join(svg), stats


def defs():
    P = PAL
    return f'''<defs>
  <filter id="soft" x="-20%" y="-20%" width="140%" height="140%">
    <feDropShadow dx="0" dy="0.6" stdDeviation="0.7" flood-color="#1b2430" flood-opacity="0.25"/>
  </filter>
  <filter id="lift" x="-5%" y="-5%" width="110%" height="110%">
    <feDropShadow dx="0" dy="2" stdDeviation="3" flood-color="#3a3224" flood-opacity="0.18"/>
  </filter>
  <pattern id="hatch" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
    <rect width="6" height="6" fill="#ECE7DC"/><line x1="0" y1="0" x2="0" y2="6" stroke="#D9D2C2" stroke-width="2"/>
  </pattern>
  <symbol id="i-wc" viewBox="0 0 24 24"><circle cx="8" cy="5" r="2.2" fill="#fff"/><path d="M5.6 9h4.8l.9 7H9.6l-.4 6H6.8l-.4-6H4.7z" fill="#fff"/><circle cx="16.5" cy="5" r="2.2" fill="#fff"/><path d="M14 9h5v6h-1.3v7h-2.4v-7H14z" fill="#fff"/></symbol>
  <symbol id="i-wcStaff" viewBox="0 0 24 24"><path d="M12 3 2 7.5 12 12l8-3.6V14h1.6V7.5z" fill="#fff"/><path d="M6 10.6V15c0 1.7 2.7 3.2 6 3.2s6-1.5 6-3.2v-4.4L12 13.3z" fill="#fff"/></symbol>
  <symbol id="i-lift" viewBox="0 0 24 24"><rect x="3" y="2.5" width="18" height="19" rx="2.5" fill="none" stroke="#fff" stroke-width="2"/><path d="M8 10.5 12 6l4 4.5zM8 13.5l4 4.5 4-4.5z" fill="#fff"/></symbol>
  <symbol id="i-stairs" viewBox="0 0 24 24"><path d="M3 20h5v-4.5h4.5V11H17V6.5h4V4h-6.5v4.5H10V13H5.5v4.5H3z" fill="#fff"/></symbol>
  <symbol id="i-mosque" viewBox="0 0 24 24"><path d="M12 3c-.6 1.8-4.5 3.6-4.5 7h9C16.5 6.6 12.6 4.8 12 3z" fill="#fff"/><path d="M5 11h14v9H14v-3.5a2 2 0 0 0-4 0V20H5z" fill="#fff"/><rect x="2" y="7" width="2" height="13" fill="#fff"/><rect x="20" y="7" width="2" height="13" fill="#fff"/></symbol>
  <symbol id="i-theater" viewBox="0 0 24 24"><path d="M3 5h18v3c-2 0-3 1.5-3 3.5S19 15 21 15v4H3v-4c2 0 3-1.5 3-3.5S5 8 3 8z" fill="none" stroke="#fff" stroke-width="2"/><circle cx="12" cy="12" r="2.3" fill="#fff"/></symbol>
  <symbol id="i-exit" viewBox="0 0 24 24"><path d="M4 3h9v4h-2V5H6v14h5v-2h2v4H4z" fill="#fff"/><path d="M14 8l5 4-5 4v-3H9v-2h5z" fill="#fff"/></symbol>
</defs>'''


def auto_marks(floor, rooms, gimg, grid, X, Y, CORR, OUT, door_blobs, rust, staff, lifts,
               stairs_rooms, old):
    """العلامات من المخطط القديم:
    - الأبواب: كل نصف دائرة في المخطط القديم تُلصق بجدارها الحقيقي؛ تبقى فقط
      إن كان الجدار يطل على سيب أو على الخارج. ثم كل غرفة يصلها مسار ولا باب لها
      قرب نهاية المسار تأخذ باباً هناك.
    - الرموز (دورات المياه والمصاعد): في منتصف غرفتها وبحجمها."""
    fit3 = lambda p: p and (fit_door(gimg, p) or fit_door(gimg, p, r=5.0, margin=0.5)
                            or fit_door(gimg, p, r=5.0, margin=0.5, loose=True))
    ok = lambda p: bool(p) and p.get('other') == CORR and p['room'] not in stairs_rooms   # الباب يطل على سيب فقط
    placed = []

    def add_door(p):
        for q in placed:
            if q['vertical'] == p['vertical'] and abs(q['wall'] - p['wall']) < 3 \
                    and abs(q['along'] - p['along']) < 10:
                return
        placed.append(p)

    for d in door_blobs:
        p = fit3(place_mark_door(gimg, d['cx'], d['cy'], CORR, OUT, allow_inner=True))
        if ok(p):
            add_door(p)
    for key, pts in PATHS.items():
        v = rooms.get(key)
        if not v or v['floor'] != floor or not pts:
            continue
        ex, ey = pts[-1]['x'], pts[-1]['y']
        hint = gimg[int(min(H - 1, max(0, v['y']))), int(min(W - 1, max(0, v['x'])))]
        p = None
        for reach in (18, 40):
            p = fit3(place_door(gimg, ex, ey, CORR, OUT, hint=hint, reach=reach))
            if p:
                break
        if not ok(p):
            continue
        near = any(q['room'] == p['room'] and
                   ((q['wall'] if q['vertical'] else q['along']) - ex) ** 2 +
                   ((q['along'] if q['vertical'] else q['wall']) - ey) ** 2 < 28 ** 2 for q in placed)
        if not near:
            add_door(p)

    # قاعة بلا باب على السيب: رمز الباب في المخطط القديم ملتصق بالجدار فلم يُكتشف كبقعة.
    # نمسح جدرانها المطلة على السيب في المخطط القديم: الباب = انتفاخ داكن أسمك من خط الجدار.
    src = np.array(Image.open(os.path.join(ROOT, 'assets', 'maps', f'map-{floor}.png')).convert('RGB'))
    dark = src.max(2) < 110
    ny, nx = grid.shape
    have = {q['room'] for q in placed}
    for key, v in rooms.items():
        if v['floor'] != floor or not key.isdigit():
            continue
        l = gimg[int(min(H - 1, max(0, v['y']))), int(min(W - 1, max(0, v['x'])))]
        if l in (CORR, OUT) or l in have or l in stairs_rooms:
            continue
        segs = []          # (عمودي؟، خط الجدار، من، إلى، اتجاه الغرفة)
        for j in range(ny):
            for i in range(nx):
                if grid[j, i] != l:
                    continue
                if i + 1 < nx and grid[j, i + 1] == CORR:
                    segs.append((True, X[i + 1], Y[j], Y[j + 1], -1))
                if i > 0 and grid[j, i - 1] == CORR:
                    segs.append((True, X[i], Y[j], Y[j + 1], 1))
                if j + 1 < ny and grid[j + 1, i] == CORR:
                    segs.append((False, Y[j + 1], X[i], X[i + 1], -1))
                if j > 0 and grid[j - 1, i] == CORR:
                    segs.append((False, Y[j], X[i], X[i + 1], 1))
        best = None        # (سماكة، عمودي، جدار، موضع، اتجاه)
        for vert, w, a0, a1, s in segs:
            for a in range(int(a0) + 2, int(a1) - 1):
                run = top = 0
                for kk in range(-4, 13):
                    q = int(w + s * kk)
                    px, py = (q, a) if vert else (a, q)
                    if 0 <= px < W and 0 <= py < H and dark[py, px]:
                        run += 1
                        top = max(top, run)
                    else:
                        run = 0
                if run or not (5 <= top <= 12):
                    continue                     # جدار عمودي ممتد أو لا انتفاخ
                if best is None or top > best[0]:
                    best = (top, vert, w, a, s)
        if best is None:
            continue
        _, vert, w, a, s = best
        cx, cy = (w + s * 3, a) if vert else (a, w + s * 3)
        p = fit3(place_mark_door(gimg, cx, cy, CORR, OUT, allow_inner=True))
        if ok(p) and p['room'] == l:
            placed.append(p)
            have.add(l)
    dots = []
    for p in placed:
        k, a = round(p['wall'] + p['into'] * 0.6, 1), round(p['along'], 1)
        dots.append(dict(x=k, y=a) if p['vertical'] else dict(x=a, y=k))

    # الرموز: منتصف أكبر مستطيل في الغرفة، وحجمها = أصغر بُعد ناقص هامش
    labels_pts = [(v['x'], v['y']) for k, v in rooms.items() if v['floor'] == floor and k.isdigit()]
    icons, used = [], set()
    for kind, L in (('lift', lifts), ('wc', rust), ('wcStaff', staff)):
        for b in L:
            l = gimg[int(b['cy']), int(b['cx'])]
            if l in (CORR, OUT) or l in used or (gimg == l).sum() > 2500:
                s_ = max(11.0, min(20.0, min(b['w'], b['h']) - 1.0))
                icons.append(dict(type=kind, x=round(b['cx'], 1), y=round(b['cy'], 1), s=s_))
                continue
            used.add(l)
            x0, y0, x1, y1 = max(grid_rects(grid, X, Y, l), key=lambda r: (r[2] - r[0]) * (r[3] - r[1]))
            # رقم قاعة يلمس المستطيل؟ الرمز يأخذ أوسع جزء فاضي حوله (يمين/يسار/فوق/تحت) حتى لا يغطيه
            # (رقم من 4 أرقام بخط 6 عريض ≈ 15×7 بكسل، + هامش)
            boxes = [(lx - 7.5, ly - 4, lx + 7.5, ly + 4) for lx, ly in labels_pts]
            boxes = [b_ for b_ in boxes if b_[0] < x1 and b_[2] > x0 and b_[1] < y1 and b_[3] > y0]
            if boxes:
                lx0, ly0, lx1, ly1 = boxes[0]
                cands = [(x0, y0, min(x1, lx0), y1), (max(x0, lx1), y0, x1, y1),
                         (x0, y0, x1, min(y1, ly0)), (x0, max(y0, ly1), x1, y1)]
                x0, y0, x1, y1 = max(cands, key=lambda r: min(r[2] - r[0], r[3] - r[1]))
            # الحجم = المساحة الصافية داخل الجدران (خط الجدار 1.5) ناقص هامش صغير
            s_ = max(10.0, min(24.0, min(x1 - x0, y1 - y0) - 6.0))
            icons.append(dict(type=kind, x=round((x0 + x1) / 2, 1), y=round((y0 + y1) / 2, 1), s=round(s_, 1)))
    # غرفة خدمة بلا باب: باب في منتصف أطول جدار لها على السيب
    ny, nx = grid.shape
    for l in used:
        if any(q['room'] == l for q in placed):
            continue
        runs = []   # (طول، عمودي؟، خط الجدار، بداية، نهاية، اتجاه الغرفة)
        for j in range(ny):
            for i in range(nx):
                if grid[j, i] != l:
                    continue
                for di, into in ((-1, 1), (1, -1)):        # جار يسار/يمين = جدار عمودي
                    ii = i + di
                    if 0 <= ii < nx and grid[j, ii] == CORR:
                        runs.append((True, X[i] if di < 0 else X[i + 1], Y[j], Y[j + 1], into))
                for dj, into in ((-1, 1), (1, -1)):        # جار فوق/تحت = جدار أفقي
                    jj = j + dj
                    if 0 <= jj < ny and grid[jj, i] == CORR:
                        runs.append((False, Y[j] if dj < 0 else Y[j + 1], X[i], X[i + 1], into))
        # دمج القطع المتتالية على نفس الخط
        runs.sort()
        merged = []
        for r_ in runs:
            if merged and merged[-1][0] == r_[0] and merged[-1][1] == r_[1] and merged[-1][4] == r_[4]                     and abs(merged[-1][3] - r_[2]) < 0.01:
                merged[-1] = (r_[0], r_[1], merged[-1][2], r_[3], r_[4])
            else:
                merged.append(r_)
        for vert, wl, a0, a1, into in sorted(merged, key=lambda m: -(m[3] - m[2])):
            p = fit3(dict(vertical=vert, wall=float(wl), along=(a0 + a1) / 2, into=into, room=l))
            if ok(p):
                placed.append(p)
                k, a = round(p['wall'] + p['into'] * 0.6, 1), round(p['along'], 1)
                dots.append(dict(x=k, y=a) if p['vertical'] else dict(x=a, y=k))
                break
    keep = [i for i in (old or {}).get('icons', []) if i.get('type') not in ('wc', 'wcStaff', 'lift')]
    return dict(icons=icons + keep, doors=dots)


def badge(kind, b, size=None):
    color = {'wc': PAL['wc'], 'wcStaff': PAL['wcStaff'], 'lift': PAL['lift'], 'stairs': PAL['stairs'],
             'mosque': PAL['exit'], 'theater': PAL['hall'] and '#9A6B2F'}[kind]
    s = 13 if kind in ('wc', 'wcStaff', 'lift', 'stairs') else 16
    s = max(s, min(18, int(min(b.get('w', s), b.get('h', s)) * 0.9)))
    if size:
        s = float(size)
    x, y = b['cx'] - s / 2, b['cy'] - s / 2
    return (f'<g filter="url(#soft)"><rect x="{x:.1f}" y="{y:.1f}" width="{s}" height="{s}" rx="{s*0.28:.1f}" '
            f'fill="{color}"/><use href="#i-{kind}" x="{x+s*0.14:.1f}" y="{y+s*0.14:.1f}" '
            f'width="{s*0.72:.1f}" height="{s*0.72:.1f}"/></g>')


def exit_sign(b):
    w, h = b['w'], b['h']
    vertical = h > w
    cx, cy = b['cx'], b['cy']
    rw, rh = (13, 30) if vertical else (30, 13)
    x, y = cx - rw / 2, cy - rh / 2
    if vertical:
        t = f'<use href="#i-exit" x="{cx-5.5:.1f}" y="{cy-5.5:.1f}" width="11" height="11"/>'
    else:
        t = (f'<text x="{cx:.1f}" y="{cy:.1f}" fill="#fff" font-size="7.5" font-weight="700" '
             f'text-anchor="middle" dominant-baseline="central">خروج</text>')
    return (f'<g filter="url(#soft)"><rect x="{x:.1f}" y="{y:.1f}" width="{rw}" height="{rh}" rx="4" '
            f'fill="{PAL["exit"]}"/>{t}</g>')


def place_mark_door(gimg, cx, cy, CORR, OUT, reach=14, allow_inner=False):
    """نقطة باب وضعها المستخدم: أقرب جدار لها هو جدار الباب.
    الباب يفتح نحو الغرفة؛ وإن كان بين ممر وخارج (مدخل) يفتح نحو الممر."""
    cx = min(W - 1, max(0, cx)); cy = min(H - 1, max(0, cy))
    own = gimg[int(cy), int(cx)]
    is_room = lambda l: l not in (CORR, OUT)
    best = None
    for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
        for dist in range(1, reach + 1):
            x, y = int(cx + dx * dist), int(cy + dy * dist)
            if not (0 <= x < W and 0 <= y < H):
                break
            lab = gimg[y, x]
            if lab == own:
                continue
            if is_room(own) and is_room(lab) and not allow_inner:
                break      # جدار بين غرفتين: لا أبواب داخلية
            if is_room(own):
                inside = own
            elif is_room(lab):
                inside = lab
            elif own == CORR:
                inside = own
            else:
                inside = lab
            if dx:
                wall = int(cx + dx * (dist - 1)) + (1 if dx > 0 else 0)
                gap = abs(wall - cx)
            else:
                wall = int(cy + dy * (dist - 1)) + (1 if dy > 0 else 0)
                gap = abs(wall - cy)
            d = dx or dy
            into = -d if inside == own else d
            if best is None or gap < best[0]:
                best = (gap, dict(vertical=bool(dx), wall=float(wall),
                                  along=float(cy if dx else cx), into=into, room=inside))
            break
    return best[1] if best else None


def place_door(gimg, cx, cy, CORR, OUT, hint=None, reach=14):
    """يجد الجدار الذي ينتمي له الباب: حد بين غرفة وجارها.
    يُرجع موقع الباب على خط الجدار نفسه، واتجاه فتحه نحو داخل الغرفة."""
    cx = min(W - 1, max(0, cx)); cy = min(H - 1, max(0, cy))
    own = gimg[int(cy), int(cx)]
    own_room = own not in (CORR, OUT)
    best = None
    for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
        prev = own
        for dist in range(1, reach + 1):
            x, y = int(cx + dx * dist), int(cy + dy * dist)
            if not (0 <= x < W and 0 <= y < H):
                break
            lab = gimg[y, x]
            if lab == prev:
                continue
            if own_room:
                room, other = own, lab
            else:
                room, other = lab, own
            if room in (CORR, OUT) or other == OUT:   # ليس جدار غرفة داخلي (المخارج لها لافتات)
                break
            score = dist
            score += 0 if other == CORR else (4 if other != OUT else 10)
            if hint is not None and room != hint:
                score += 12
            if best is None or score < best[0]:
                # الحد يقع بين البكسل dist-1 و dist
                if dx:
                    wall = int(cx + dx * (dist - 1)) + (1 if dx > 0 else 0)
                    into = -dx if own_room else dx
                else:
                    wall = int(cy + dy * (dist - 1)) + (1 if dy > 0 else 0)
                    into = -dy if own_room else dy
                # الغرفة في اتجاه into من الجدار
                best = (score, dict(vertical=bool(dx), wall=float(wall),
                                    along=float(cy if dx else cx), into=into, room=room))
            break
    return best[1] if best else None


def fit_door(gimg, p, r=6.0, margin=2.0, loose=False):
    """يُبقي الباب داخل امتداد الجدار نفسه (بين نفس الغرفة ونفس الجار)،
    بعيداً عن الزوايا وتقاطعات الجدران. يُرجع None إن كان الجدار أقصر من الباب."""
    w = int(p['wall'])
    a = int(round(p['along']))
    if p['vertical']:
        rc, oc = (w, w - 1) if p['into'] > 0 else (w - 1, w)
        if not (0 <= rc < W and 0 <= oc < W):
            return None
        get = lambda t: (gimg[t, rc], gimg[t, oc])
        n = H
    else:
        rc, oc = (w, w - 1) if p['into'] > 0 else (w - 1, w)
        if not (0 <= rc < H and 0 <= oc < H):
            return None
        get = lambda t: (gimg[rc, t], gimg[oc, t])
        n = W
    a = min(n - 1, max(0, a))
    room, other = get(a)
    if room != p['room'] or other == room:
        return None
    # loose: يكفي أن يبقى جانب الغرفة نفسه وأن يكون خلف الجدار شيء آخر
    same = (lambda t: get(t)[0] == room and get(t)[1] != room) if loose else (lambda t: get(t) == (room, other))
    lo = hi = a
    while lo - 1 >= 0 and same(lo - 1):
        lo -= 1
    while hi + 1 < n and same(hi + 1):
        hi += 1
    half = r / 2 + margin
    if (hi + 1 - lo) < r + 2 * margin:
        return None
    p = dict(p)
    p['along'] = float(min(max(p['along'], lo + half), hi + 1 - half))
    p['other'] = other
    return p


def stairs_svg(b):
    """درج مرسوم: إطار + درجات متوازية على الطول + سهم الصعود."""
    x, y, w, h = float(b['x']) - 1, float(b['y']) - 1, float(b['w']) + 2, float(b['h']) + 2
    if w < 14 and h < 14:   # المربع الأصلي صغير: نكبّره لحجم يُقرأ
        cx, cy = x + w / 2, y + h / 2
        w, h = (22.0, 12.0) if w >= h else (12.0, 22.0)
        x, y = cx - w / 2, cy - h / 2
    lines = []
    if w >= h:
        for t in np.arange(x + 2.2, x + w - 1, 2.2):
            lines.append(f'M{t:.1f},{y + 1:.1f}V{y + h - 1:.1f}')
        arrow = f'M{x + 3:.1f},{y + h / 2:.1f}H{x + w - 3:.1f}m-2.5,-2l2.5,2l-2.5,2'
    else:
        for t in np.arange(y + 2.2, y + h - 1, 2.2):
            lines.append(f'M{x + 1:.1f},{t:.1f}H{x + w - 1:.1f}')
        arrow = f'M{x + w / 2:.1f},{y + h - 3:.1f}V{y + 3:.1f}m-2,2.5l2,-2.5l2,2.5'
    return (f'<g><rect x="{x:.1f}" y="{y:.1f}" width="{w:.1f}" height="{h:.1f}" rx="1.2" '
            f'fill="{PAL["stairsFill"]}" stroke="{PAL["wall"]}" stroke-width="0.8"/>'
            f'<path d="{"".join(lines)}" stroke="{PAL["tread"]}" stroke-width="0.7" fill="none"/>'
            f'<path d="{arrow}" stroke="{PAL["wall"]}" stroke-width="0.7" fill="none" '
            f'stroke-linecap="round" stroke-linejoin="round"/></g>')


def door_svg(p, room_color, other_color):
    """باب معماري نظيف: الجدار يُقطع بعرض الباب (كل نصف بلون جهته)،
    ثم ضلفة عمودية على الجدار داخل الغرفة وقوس فتحها.
    (نفس المنطق منسوخ في tools/map-editor.html: أي تعديل هنا يُعدَّل هناك)"""
    r = 6.0
    w, a, s_ = p['wall'], p['along'], p['into']
    h = (3.0 if p.get('other') == OUT_LABEL else 1.5) / 2 + 0.7   # نصف سمك الجدار + هامش
    if p['vertical']:
        cut_in = (min(w, w + s_ * h), a - r / 2, h, r)
        cut_out = (min(w, w - s_ * h), a - r / 2, h, r)
        j0, j1 = (w, a - r / 2), (w, a + r / 2)
        tip = (w + s_ * r, a - r / 2)
        sweep = 1 if s_ > 0 else 0
    else:
        cut_in = (a - r / 2, min(w, w + s_ * h), r, h)
        cut_out = (a - r / 2, min(w, w - s_ * h), r, h)
        j0, j1 = (a - r / 2, w), (a + r / 2, w)
        tip = (a - r / 2, w + s_ * r)
        sweep = 0 if s_ > 0 else 1
    f = lambda q: f'{q[0]:.2f},{q[1]:.2f}'
    rect = lambda c, col: (f'<rect x="{c[0]:.2f}" y="{c[1]:.2f}" width="{c[2]:.2f}" '
                           f'height="{c[3]:.2f}" fill="{col}"/>')
    return (f'<g>{rect(cut_in, room_color)}{rect(cut_out, other_color)}'
            f'<path d="M{f(j0)}L{f(tip)}" stroke="{PAL["door"]}" stroke-width="1.2" stroke-linecap="round"/>'
            f'<path d="M{f(tip)}A{r},{r} 0 0 {sweep} {f(j1)}" fill="none" stroke="{PAL["door"]}" '
            f'stroke-width="0.6"/></g>')


def door_symbol(d, part):
    """باب صغير: فتحة في الجدار + قوس فتح خفيف نحو داخل الغرفة."""
    cx, cy = d['cx'], d['cy']
    own = part[int(cy), int(cx)]
    # جهة الجدار = أقرب اتجاه ندخل فيه منطقة أخرى (ممر أو غرفة مجاورة)
    best = None
    for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
        for dist in range(1, 16):
            x, y = int(round(cx + dx * dist)), int(round(cy + dy * dist))
            if not (0 <= x < W and 0 <= y < H):
                break
            if part[y, x] != own:
                if best is None or dist < best[0]:
                    best = (dist, dx, dy)
                break
    r = 4.2
    if best is None:
        return f'<circle cx="{cx:.1f}" cy="{cy:.1f}" r="1.6" fill="{PAL["door"]}"/>'
    _, dx, dy = best
    # نقطة على الجدار باتجاه الممر
    wx, wy = cx + dx * (best[0] - 0.5), cy + dy * (best[0] - 0.5)
    if dx:  # جدار عمودي
        p0 = (wx, wy - r / 2)
        p1 = (wx, wy + r / 2)
        leaf = (wx - dx * r, wy - r / 2)
        arc = f'M{p1[0]:.1f},{p1[1]:.1f} A{r},{r} 0 0 {1 if dx > 0 else 0} {leaf[0]:.1f},{leaf[1]:.1f}'
    else:
        p0 = (wx - r / 2, wy)
        p1 = (wx + r / 2, wy)
        leaf = (wx - r / 2, wy - dy * r)
        arc = f'M{p1[0]:.1f},{p1[1]:.1f} A{r},{r} 0 0 {0 if dy > 0 else 1} {leaf[0]:.1f},{leaf[1]:.1f}'
    return (f'<g><line x1="{p0[0]:.1f}" y1="{p0[1]:.1f}" x2="{p1[0]:.1f}" y2="{p1[1]:.1f}" '
            f'stroke="{PAL["corridor"]}" stroke-width="2.2"/>'
            f'<line x1="{p0[0]:.1f}" y1="{p0[1]:.1f}" x2="{leaf[0]:.1f}" y2="{leaf[1]:.1f}" '
            f'stroke="{PAL["door"]}" stroke-width="0.9" stroke-linecap="round"/>'
            f'<path d="{arc}" fill="none" stroke="{PAL["door"]}" stroke-width="0.5" stroke-dasharray="1 0.8"/></g>')


def labels(rooms, floor):
    groups = {}
    for k, v in rooms.items():
        if v['floor'] != floor or not k.isdigit():
            continue
        key = (round(v['x']), round(v['y']))
        groups.setdefault(key, []).append(k)
    out = ['<g fill="%s" font-size="6" font-weight="700" text-anchor="middle" dominant-baseline="central">' % PAL['label']]
    for (x, y), ks in groups.items():
        ks.sort()
        t = ks[0] if len(ks) == 1 else f'{ks[0]}–{ks[-1][-2:]}'
        out.append(f'<text x="{x}" y="{y}">{t}</text>')
    out.append('</g>')
    return '\n'.join(out)


def outdoor_floor1(src, c):
    """المواقف والمظلات والنخيل في الطابق الأرضي — مرسومة من جديد ببساطة."""
    P = PAL
    parts = ['<g>']
    # المواقف
    parts.append(f'<rect x="346" y="18" width="396" height="80" rx="6" fill="#E3E0D8" stroke="#C9C3B6"/>')
    for i in range(12):
        x = 352 + i * 32.5
        parts.append(f'<line x1="{x:.1f}" y1="22" x2="{x:.1f}" y2="46" stroke="#fff" stroke-width="1.2"/>')
        parts.append(f'<line x1="{x:.1f}" y1="70" x2="{x:.1f}" y2="94" stroke="#fff" stroke-width="1.2"/>')
    parts.append(f'<text x="544" y="58" font-size="9" fill="#9A9284" text-anchor="middle" dominant-baseline="central">مواقف</text>')
    # المظلات والممشى
    for x, y, w, h in ((350, 125, 362, 97), (355, 240, 378, 80), (238, 345, 118, 32), (428, 350, 280, 28)):
        parts.append(f'<rect x="{x}" y="{y}" width="{w}" height="{h}" rx="5" fill="url(#hatch)" stroke="#D3CBB9"/>')
    parts.append(f'<rect x="165" y="360" width="568" height="64" rx="6" fill="#ECE7DC" opacity="0.6"/>')
    parts.append('</g>')
    return '\n'.join(parts)


def corr_center(g, CORR, x, y, along_x, max_w=70):
    """منتصف السيب عند نقطة: المسح أفقياً (along_x) أو عمودياً.
    يرجع None إن لم يكن هنا سيب أو كان فراغاً واسعاً جداً."""
    xi, yi = int(round(x)), int(round(y))
    if not (0 <= xi < W and 0 <= yi < H):
        return None
    get = (lambda t: g[yi, t]) if along_x else (lambda t: g[t, xi])
    n = W if along_x else H
    pos = xi if along_x else yi
    if get(pos) != CORR:
        for d in range(1, 9):
            if pos + d < n and get(pos + d) == CORR:
                pos += d
                break
            if pos - d >= 0 and get(pos - d) == CORR:
                pos -= d
                break
        else:
            return None
    lo = hi = pos
    while lo - 1 >= 0 and get(lo - 1) == CORR:
        lo -= 1
    while hi + 1 < n and get(hi + 1) == CORR:
        hi += 1
    if hi + 1 - lo > max_w:
        return None
    return (lo + hi + 1) / 2


def rdp(pts, eps):
    """تبسيط دوغلاس-بوكر: يحذف النقاط الصغيرة على خط شبه مستقيم."""
    if len(pts) < 3:
        return pts
    a_, b_ = pts[0], pts[-1]
    dx, dy = b_['x'] - a_['x'], b_['y'] - a_['y']
    L = (dx * dx + dy * dy) ** 0.5 or 1e-9
    far, idx = 0.0, 0
    for i in range(1, len(pts) - 1):
        d = abs(dy * (pts[i]['x'] - a_['x']) - dx * (pts[i]['y'] - a_['y'])) / L
        if d > far:
            far, idx = d, i
    if far <= eps:
        return [a_, b_]
    return rdp(pts[:idx + 1], eps)[:-1] + rdp(pts[idx:], eps)


def straighten(g, CORR, P):
    """يحوّل المسار لخطوط أفقية/عمودية على منتصف السيب.
    النقطة الأولى (البداية) تبقى كما هي."""
    pts = rdp([dict(x=float(q['x']), y=float(q['y'])) for q in P], 6.0)
    clean = [pts[0]]
    for q in pts[1:]:
        if abs(q['x'] - clean[-1]['x']) + abs(q['y'] - clean[-1]['y']) > 1:
            clean.append(q)
    pts = clean
    if len(pts) < 2:
        return pts
    segs = []
    for a_, b_ in zip(pts, pts[1:]):
        vert = abs(b_['y'] - a_['y']) >= abs(b_['x'] - a_['x'])
        cs = []
        for f in (0.25, 0.5, 0.75):
            x = a_['x'] + (b_['x'] - a_['x']) * f
            y = a_['y'] + (b_['y'] - a_['y']) * f
            c = corr_center(g, CORR, x, y, along_x=vert)
            if c is not None:
                cs.append(c)
        # مقطع في فراغ واسع (بهو): لا خط سيب له، يُحدَّد بعد قليل من اتجاه الحركة
        segs.append((vert, float(np.median(cs)) if cs else None, a_, b_))
    # في البهو: المسار يكمل على خطه، أو ينعطف عند نقطة الالتقاء الأصلية؛
    # فتشترك المسارات الخارجة من نفس المدخل في خط واحد بدل "السلالم"
    res = []
    for vert, c, a_, b_ in segs:
        if c is None:
            if res and res[-1][0] == vert:
                c = res[-1][1]
            else:
                c = a_['x'] if vert else a_['y']
        res.append((vert, c, a_, b_))
    segs = res
    # مقاطع متتالية بنفس الاتجاه وعلى نفس الخط تقريباً = مقطع واحد
    merged = [segs[0]]
    for sg in segs[1:]:
        v0, c0, a0, _ = merged[-1]
        if sg[0] == v0 and abs(sg[1] - c0) < 3:
            merged[-1] = (v0, c0, a0, sg[3])
        else:
            merged.append(sg)
    segs = merged
    out = [pts[0]]
    v0, c0 = segs[0][0], segs[0][1]
    st = pts[0]
    if v0 and abs(st['x'] - c0) > 0.5:
        out.append(dict(x=c0, y=st['y']))
    elif not v0 and abs(st['y'] - c0) > 0.5:
        out.append(dict(x=st['x'], y=c0))
    for (va, ca, _, ba), (vb, cb, _, _) in zip(segs, segs[1:]):
        if va != vb:
            out.append(dict(x=ca, y=cb) if va else dict(x=cb, y=ca))
        elif va:   # عمودي ثم عمودي على خط آخر: انتقال أفقي عند نقطة الالتقاء
            out += [dict(x=ca, y=ba['y']), dict(x=cb, y=ba['y'])]
        else:
            out += [dict(x=ba['x'], y=ca), dict(x=ba['x'], y=cb)]
    vl, cl, _, bl = segs[-1]
    out.append(dict(x=cl, y=bl['y']) if vl else dict(x=bl['x'], y=cl))
    return out


def simplify(P):
    """حذف النقاط المكررة والواقعة على استقامة واحدة."""
    out = []
    for q in P:
        if out and abs(q['x'] - out[-1]['x']) < 0.3 and abs(q['y'] - out[-1]['y']) < 0.3:
            continue
        out.append(q)
    i = 1
    while i < len(out) - 1:
        a_, b_, c_ = out[i - 1], out[i], out[i + 1]
        if (abs(a_['x'] - b_['x']) < 0.3 and abs(b_['x'] - c_['x']) < 0.3) or \
           (abs(a_['y'] - b_['y']) < 0.3 and abs(b_['y'] - c_['y']) < 0.3):
            out.pop(i)
        else:
            i += 1
    return out


def fix_paths(rooms, path_file=None):
    """كل مسار: خطوط مستقيمة على منتصف السيب، ثم منتصف السيب أمام الباب، ثم الباب."""
    import re
    path_file = path_file or os.path.join(ROOT, 'data', 'agri-food', 'male', 'paths.rel.js')
    text = open(path_file, encoding='utf-8').read()
    changed, skipped = [], []
    results = {}
    for key, pts in PATHS.items():
        v = rooms.get(key)
        if not v or not pts or len(pts) < 2 or v['floor'] not in DEBUG:
            continue
        dbg = DEBUG[v['floor']]
        g, CORR = dbg['gimg'], dbg['CORR']
        end = pts[-1]
        hint = g[int(min(H - 1, max(0, v['y']))), int(min(W - 1, max(0, v['x'])))]
        best = None
        for p in dbg['doors']:
            dx_ = (p['wall'] if p['vertical'] else p['along']) - end['x']
            dy_ = (p['along'] if p['vertical'] else p['wall']) - end['y']
            dist = (dx_ * dx_ + dy_ * dy_) ** 0.5
            if dist > 45:
                continue
            score = dist + (0 if p['room'] == hint else 30)
            if best is None or score < best[0]:
                best = (score, p)
        door_ok = False
        if best:
            p = best[1]
            vert, wall, along, out = p['vertical'], p['wall'], p['along'], -p['into']
            px = lambda t: int(wall + out * t + (0 if out > 0 else -1))
            if vert:
                lab_at = lambda t: g[int(along), min(W - 1, max(0, px(t)))]
            else:
                lab_at = lambda t: g[min(H - 1, max(0, px(t))), int(along)]
            door_ok = lab_at(0) == CORR
        if door_ok:
            t = 0
            while t < 160 and lab_at(t + 1) == CORR:
                t += 1
            mid = wall + out * (t + 1) / 2
            U, A = ('x', 'y') if vert else ('y', 'x')
            core = straighten(g, CORR, pts[:-1])
            E = core[-1]
            P = core + [{U: mid, A: E[A]}, {U: mid, A: along}, {U: wall, A: along}]
        else:
            P = straighten(g, CORR, pts)
            if not best:
                skipped.append((key, 'لا يوجد باب قريب: سُوّي المسار فقط'))
            else:
                skipped.append((key, 'الباب لا يطل على سيب: سُوّي المسار فقط'))
        results[key] = (v['floor'], simplify(P), door_ok)

    # ── توحيد الخطوط: مقاطع متوازية متقاربة تصير خطاً واحداً ──
    # داخل السيب: تقارب حتى 4.5 بكسل. في البهو الواسع: حتى 26 بكسل.
    def seg_open(fl, a_, b_, axis):
        dbg = DEBUG[fl]
        mx, my = (a_['x'] + b_['x']) / 2, (a_['y'] + b_['y']) / 2
        return corr_center(dbg['gimg'], dbg['CORR'], mx, my, along_x=(axis == 'x')) is None
    for fl in {r_[0] for r_ in results.values()}:
        for axis in ('x', 'y'):            # x = مقاطع عمودية، y = أفقية
            other = 'y' if axis == 'x' else 'x'
            vals = {False: [], True: []}
            for key, (f_, P, dok) in results.items():
                if f_ != fl:
                    continue
                n = len(P) - 1
                for i in range(n):
                    if dok and i == n - 1:
                        continue           # مقطع دخول الباب يبقى كما هو
                    a_, b_ = P[i], P[i + 1]
                    if abs(a_[axis] - b_[axis]) < 0.3:
                        vals[seg_open(fl, a_, b_, axis)].append((a_[axis], abs(a_[other] - b_[other])))
            snap = {}
            for kind, tol in ((False, 4.5), (True, 26.0)):
                vs = sorted(vals[kind])
                snap[kind] = []
                if not vs:
                    continue
                clusters, cur = [], [vs[0]]
                for v_ in vs[1:]:
                    if v_[0] - cur[0][0] <= tol:
                        cur.append(v_)
                    else:
                        clusters.append(cur)
                        cur = [v_]
                clusters.append(cur)
                for cl in clusters:
                    wsum = sum(w for _, w in cl) or 1
                    snap[kind].append((cl[0][0], cl[-1][0], sum(c * w for c, w in cl) / wsum))
            def to(c, kind):
                for lo, hi, m in snap[kind]:
                    if lo - 1e-6 <= c <= hi + 1e-6:
                        return m
                return c
            for key, (f_, P, dok) in results.items():
                if f_ != fl:
                    continue
                n = len(P) - 1
                new_ = [dict(q) for q in P]
                for i in range(n):
                    if dok and i == n - 1:
                        continue
                    if abs(P[i][axis] - P[i + 1][axis]) < 0.3:
                        m = to(P[i][axis], seg_open(fl, P[i], P[i + 1], axis))
                        new_[i][axis] = m
                        new_[i + 1][axis] = m
                results[key] = (f_, new_, dok)

    for key, (f_, P, dok) in results.items():
        # البداية تنزل على نفس خط أول مقطع (فرق بكسل أو اثنين بين بدايات المسارات)
        if len(P) >= 2:
            for ax in ('x', 'y'):
                if 0 < abs(P[0][ax] - P[1][ax]) < 3:
                    P[0] = dict(P[0], **{ax: P[1][ax]})
        P = simplify(P)
        for i, q in enumerate(P):
            q['type'] = 'start' if i == 0 else ('end' if i == len(P) - 1 else 'middle')
        body = ',\n'.join(f'    {{ x: {q["x"]:.2f}, y: {q["y"]:.2f}, type: "{q["type"]}" }}' for q in P)
        pat = re.compile(r'("' + re.escape(key) + r'"\s*:\s*)\[.*?\]', re.S)
        text, n = pat.subn(lambda m: m.group(1) + '[\n' + body + '\n  ]', text, count=1)
        if n:
            changed.append(key)
    open(path_file, 'w', encoding='utf-8').write(text)
    return dict(changed=len(changed), skipped=skipped)


SHOW_ROOM_NUMBERS = False                 # True = تُطبع أرقام القاعات على الخريطة المنشورة
NET_DOOR = {'المسجد': (108.0, 757.4)}       # المسجد: الباب الغربي المقابل لأيقونته
NET_TARGET = {'المسرح': (640.0, 710.0)}   # المسرح: القاعة الكبيرة تحت أيقونته (الأيقونة في السيب)
NET_START = {1: (251.45, 893.35),   # مدخل المبنى (الدور الأول)
             2: (518.26, 635.98)}   # أسفل الدرج الرئيسي (الدور الثاني)


def net_paths(rooms, path_file=None):
    """شبكة المسارات: شجرة أقصر طريق واحدة لكل دور من نقطة البداية، تمشي في السيب فقط،
    خطوطها أفقية/عمودية وبأقل عدد لفّات. كل قاعة: منتصف السيب أمام بابها ثم الباب بزاوية قائمة.
    كل المسارات تتشارك نفس الخطوط (شجرة واحدة) فلا تتشعب ولا تتداخل."""
    import heapq
    import re
    TURN = 40.0                       # كلفة اللفّة (بكسل): يفضّل الخط المستقيم
    DIRS = ((0, 1), (1, 0), (0, -1), (-1, 0))
    N = W * H
    path_file = path_file or os.path.join(ROOT, 'data', 'agri-food', 'male', 'paths.rel.js')
    text = open(path_file, encoding='utf-8').read()
    results, rep = {}, dict(no_door=[], unreachable=[], off_corridor=[], added=[], room_without_door=[])
    BAD = {}

    for fl in (1, 2):
        dbg = DEBUG[fl]
        g, CORR = dbg['gimg'], dbg['CORR']
        src_old = np.array(Image.open(os.path.join(ROOT, 'assets', 'maps', f'map-{fl}.png')).convert('RGB'))
        M = (g == CORR)
        dt = cv2.distanceTransform(M.astype(np.uint8), cv2.DIST_L2, 5)
        stepl = (1.0 + 3.0 / np.maximum(dt, 1.0)).ravel().tolist()   # يبتعد عن الجدران
        # يمشي فقط حيث السيب عرضه 5 بكسل على الأقل (لا يتسلل من شقوق رفيعة بين الغرف)
        Ml = (dt >= 2.0).ravel().tolist()
        ys, xs = np.nonzero(dt >= 2.0)
        sx, sy = NET_START[fl]
        k = int(np.argmin((xs + 0.5 - sx) ** 2 + (ys + 0.5 - sy) ** 2))
        s0 = int(ys[k]) * W + int(xs[k])
        inf = float('inf')
        dist = [inf] * (4 * N)
        prev = [-1] * (4 * N)
        heap = []
        for d in range(4):
            dist[d * N + s0] = 0.0
            heap.append((0.0, d * N + s0))
        heapq.heapify(heap)
        while heap:
            c, s = heapq.heappop(heap)
            if c > dist[s]:
                continue
            d, i = divmod(s, N)
            y, x = divmod(i, W)
            for nd in range(4):
                if nd == (d + 2) % 4:
                    continue
                dy, dx = DIRS[nd]
                ny, nx = y + dy, x + dx
                if not (0 <= ny < H and 0 <= nx < W):
                    continue
                j = ny * W + nx
                if not Ml[j]:
                    continue
                nc = c + stepl[j] + (TURN if nd != d else 0.0)
                t = nd * N + j
                if nc < dist[t]:
                    dist[t] = nc
                    prev[t] = s
                    heapq.heappush(heap, (nc, t))

        def best_state(px, py):
            # أقرب بكسل قابل للمشي حول النقطة (السيب الضيق جداً أمام بعض الأبواب)
            best = (inf, -1)
            for r_ in range(0, 4):
                for qy in range(py - r_, py + r_ + 1):
                    for qx in range(px - r_, px + r_ + 1):
                        if max(abs(qx - px), abs(qy - py)) != r_ or not (0 <= qx < W and 0 <= qy < H):
                            continue
                        i = qy * W + qx
                        best = min(best, min((dist[d * N + i], d * N + i) for d in range(4)))
                if best[0] < inf:
                    return best
            return best

        def trace(s):
            pts = []
            while s != -1:
                i = s % N
                pts.append((i % W + 0.5, i // W + 0.5))
                s = prev[s]
            pts.reverse()
            out = [pts[0]]
            for a_, b_, c_ in zip(pts, pts[1:], pts[2:]):
                if (a_[0] == b_[0]) != (b_[0] == c_[0]):
                    out.append(b_)
            if len(pts) > 1:
                out.append(pts[-1])
            return out

        def ray(wall, along, vert, out):
            """من الجدار نحو السيب: يرجع (منتصف السيب أمام الباب، طول المسح) أو None."""
            def lab(t):
                v = int(wall + out * t + (0 if out > 0 else -1))
                if vert:
                    return g[min(H - 1, max(0, int(along))), min(W - 1, max(0, v))]
                return g[min(H - 1, max(0, v)), min(W - 1, max(0, int(along)))]
            t0 = 0
            while t0 < 14 and lab(t0) != CORR:
                t0 += 1
            if lab(t0) != CORR:
                return None
            t = t0
            while t < 200 and lab(t + 1) == CORR:
                t += 1
            width = t + 1 - t0
            depth = (t0 + t + 1) / 2 if width <= 70 else t0 + 12
            return wall + out * depth

        def band_center(a_, b_, horiz):
            """منتصف «الشريط المشترك»: أوسع خط مستقيم يقدر المقطع يمشي فيه كله بدون ما يلمس جدار.
            لكل نقطة على المقطع نمسح عمودياً عليه ونأخذ امتداد السيب، والشريط = تقاطعها كلها."""
            c = a_['y'] if horiz else a_['x']
            lo, hi = sorted((a_['x'], b_['x']) if horiz else (a_['y'], b_['y']))
            ci = int(c)
            blo, bhi, n = -1e9, 1e9, 0
            for tq in range(int(lo) + 2, int(hi) - 1):
                get = (lambda r: g[r, tq]) if horiz else (lambda r: g[tq, r])
                lim = H if horiz else W
                if not (0 <= ci < lim) or get(ci) != CORR:
                    continue
                u = ci
                while u - 1 >= 0 and get(u - 1) == CORR and ci - u < 200:
                    u -= 1
                d = ci
                while d + 1 < lim and get(d + 1) == CORR and d - ci < 200:
                    d += 1
                blo, bhi, n = max(blo, u), min(bhi, d + 1), n + 1
            if not n or bhi - blo > 70 or bhi <= blo:
                return None
            return (blo + bhi) / 2

        def bad_count(pts, skip_end=3.0, g=g, CORR=CORR):   # ربط خريطة هذا الدور (لا الأخير)
            bad = 0
            for i in range(len(pts) - 1):
                a_, b_ = pts[i], pts[i + 1]
                L = max(abs(a_['x'] - b_['x']), abs(a_['y'] - b_['y']))
                stop = L - (skip_end if i == len(pts) - 2 else 0.0)
                tq = 0.0
                while tq <= stop:
                    r_ = tq / L if L else 0
                    qx, qy = a_['x'] + (b_['x'] - a_['x']) * r_, a_['y'] + (b_['y'] - a_['y']) * r_
                    if g[int(min(H - 1, max(0, qy))), int(min(W - 1, max(0, qx)))] != CORR:
                        bad += 1
                    tq += 1.0
            return bad
        BAD[fl] = bad_count

        doors_by_room = {}
        for p in dbg['doors']:
            if p.get('other') == CORR:
                doors_by_room.setdefault(p['room'], []).append(p)

        def room_label(x, y):
            xi, yi = int(min(W - 1, max(0, x))), int(min(H - 1, max(0, y)))
            l = g[yi, xi]
            if l in doors_by_room:
                return l
            win = g[max(0, yi - 10):yi + 11, max(0, xi - 10):xi + 11].ravel().tolist()
            cand = [q for q in win if q in doors_by_room]
            return max(set(cand), key=cand.count) if cand else None

        labelled = {g[int(min(H - 1, max(0, v_['y']))), int(min(W - 1, max(0, v_['x'])))]
                    for v_ in rooms.values() if v_.get('floor') == fl} - {CORR, dbg['OUT']}
        multi = {}
        for k_, v_ in rooms.items():
            if v_.get('floor') == fl and k_.isdigit():
                l_ = g[int(min(H - 1, max(0, v_['y']))), int(min(W - 1, max(0, v_['x'])))]
                multi[l_] = multi.get(l_, 0) + 1
        for key, v in rooms.items():
            if v.get('floor') != fl:
                continue
            old = PATHS.get(key)
            if not old and not key.isdigit():
                continue
            # الأهداف: كل أبواب القاعة المطلة على السيب
            targets = []          # (حالة في الشجرة، المحور العمودي على الجدار، جدار، امتداد)
            tx, ty = NET_TARGET.get(key, (v['x'], v['y']))
            pxi, pyi = int(min(W - 1, max(0, tx))), int(min(H - 1, max(0, ty)))
            l = g[pyi, pxi]
            cands = doors_by_room.get(l, [])
            pin_target = False
            if not cands and l in (CORR, dbg['OUT']):
                # رقم القاعة مكتوب في السيب نفسه:
                # - علامة حمراء في المخطط القديم عند الرقم (غرفة صغيرة في جدار السيب) = المسار ينتهي عند الرقم
                # - وإلا: أقرب باب للرقم (حتى 20 بكسل)
                r_, g_, b_ = (int(c_) for c_ in src_old[pyi, pxi])
                if r_ > 120 and g_ < 80 and b_ < 80:
                    pin_target = True
                else:
                    near = []
                    for p in dbg['doors']:
                        if p['room'] in labelled:
                            continue                 # باب غرفة لها رقمها الخاص: ليس باب هذه
                        dx_ = (p['wall'] if p['vertical'] else p['along']) - v['x']
                        dy_ = (p['along'] if p['vertical'] else p['wall']) - v['y']
                        dd = (dx_ * dx_ + dy_ * dy_) ** 0.5
                        if dd <= 20:
                            near.append((dd, id(p), p))
                    cands = [min(near)[2]] if near else []
                    pin_target = not cands       # لا باب واضح: ينتهي المسار عند الرقم نفسه (كالمخطط الأصلي)
            elif not cands:
                rep['room_without_door'].append(key)
            elif len(cands) > 1 and multi.get(l, 0) > 1:
                # غرفة واحدة فيها أكثر من رقم (مثل 1183-1185): كل رقم يذهب لأقرب باب له
                cands = [min(cands, key=lambda p: ((p['wall'] if p['vertical'] else p['along']) - tx) ** 2 +
                                                  ((p['along'] if p['vertical'] else p['wall']) - ty) ** 2)]
            if key in NET_DOOR:                      # باب محدد يدوياً (مثل باب المسجد الخارجي)
                qx_, qy_ = NET_DOOR[key]
                cands = [min(dbg['doors'], key=lambda p: ((p['wall'] if p['vertical'] else p['along']) - qx_) ** 2 +
                                                       ((p['along'] if p['vertical'] else p['wall']) - qy_) ** 2)]
                pin_target = False
            for p in ([] if pin_target else cands):
                vert, wall, along, out = p['vertical'], p['wall'], p['along'], -p['into']
                m = ray(wall, along, vert, out)
                if m is None:
                    continue
                ax, ay = (m, along) if vert else (along, m)
                c, s = best_state(int(ax), int(ay))
                if c < inf:
                    targets.append((c, s, vert, wall, along))
            if not targets:
                # بلا باب معروف: نهاية المسار القديم (مثل الدرج والمسجد) تُوصل بأقرب سيب بزاوية قائمة
                ex, ey = (v['x'], v['y']) if (pin_target or not old) else (old[-1]['x'], old[-1]['y'])
                for vert, out in ((True, 1), (True, -1), (False, 1), (False, -1)):
                    wall, along = (ex, ey) if vert else (ey, ex)
                    m = ray(wall, along, vert, out)
                    if m is None:
                        continue
                    ax, ay = (m, along) if vert else (along, m)
                    c, s = best_state(int(ax), int(ay))
                    if c < inf:
                        targets.append((c + abs(m - wall) * 2, s, vert, wall, along))
                if targets and not pin_target:
                    rep['no_door'].append(key)
            if not targets:
                rep['unreachable'].append(key)
                continue
            c, s, vert, wall, along = min(targets)
            core = [dict(x=a_, y=b_) for a_, b_ in trace(s)]
            # كل مقطع على منتصف سيبه (الوسيط على طول المقطع)، إلا المقطع الواقع على امتداد الباب
            U, A = ('x', 'y') if vert else ('y', 'x')
            core[-1][A] = along
            if len(core) >= 2 and abs(core[-2][A] - int(along) - 0.5) < 0.01:
                core[-2][A] = along                  # المقطع الأخير على امتداد الباب: نفس خطه بالضبط
            horiz_l = [abs(core[i]['y'] - core[i + 1]['y']) < 0.3 for i in range(len(core) - 1)]
            for i in range(len(core) - 1):
                a_, b_ = core[i], core[i + 1]
                horiz = horiz_l[i]
                ax_ = 'y' if horiz else 'x'          # الإحداثي الثابت في المقطع
                if ax_ == A and i == len(core) - 2:
                    continue
                m = band_center(a_, b_, horiz)
                if m is not None:
                    door_pt = [{U: wall, A: along}]
                    trial = [dict(q) for q in core]
                    trial[i][ax_] = trial[i + 1][ax_] = m
                    if bad_count(trial + door_pt) <= bad_count(core + door_pt):
                        core = trial
            core[-1][A] = along
            # درجات صغيرة (< 4 بكسل) بين خطين متوازيين: الخطان يصيران خطاً واحداً،
            # بشرط ألا يدخل الخط الناتج في جدار
            tried = set()
            while True:
                core = simplify(core)
                done_ = True
                for i in range(1, len(core) - 2):
                    p0, p1, p2, p3 = core[i - 1], core[i], core[i + 1], core[i + 2]
                    if max(abs(p1['x'] - p2['x']), abs(p1['y'] - p2['y'])) >= 4:
                        continue
                    ax_ = 'y' if abs(p0['y'] - p1['y']) < 0.3 else 'x'
                    if i + 2 == len(core) - 1 and ax_ == A:
                        continue                     # لا نحرك خط الباب
                    tag = (round(p1['x'], 1), round(p1['y'], 1), round(p2['x'], 1), round(p2['y'], 1))
                    if tag in tried:
                        continue
                    tried.add(tag)
                    l1 = abs(p0['x'] - p1['x']) + abs(p0['y'] - p1['y'])
                    l2 = abs(p2['x'] - p3['x']) + abs(p2['y'] - p3['y'])
                    opts = [('a', p2[ax_]), ('b', p1[ax_])]
                    if not (i + 2 == len(core) - 1 or (l2 >= l1 and i - 1 != 0)):
                        opts.reverse()
                    if i - 1 == 0:
                        opts = [o for o in opts if o[0] == 'b']        # البداية ثابتة
                    if i + 2 == len(core) - 1:
                        opts = [o for o in opts if o[0] == 'a']        # نقطة أمام الباب ثابتة
                    before = bad_count(core, 0)
                    for kind, val in opts:
                        trial = [dict(q) for q in core]
                        if kind == 'a':
                            trial[i - 1][ax_] = trial[i][ax_] = val
                        else:
                            trial[i + 1][ax_] = trial[i + 2][ax_] = val
                        if bad_count(trial, 0) <= before:
                            core = trial
                            done_ = False
                            break
                    if not done_:
                        break
                if done_:
                    break
            P = simplify(core + [{U: wall, A: along}])
            if abs(P[0]['x'] - sx) > 0.5 or abs(P[0]['y'] - sy) > 0.5:
                if len(P) > 1 and abs(P[0]['x'] - P[1]['x']) < 0.3:   # أول مقطع عمودي
                    P = simplify([{'x': P[0]['x'], 'y': sy}] + P)
                elif len(P) > 1:
                    P = simplify([{'x': sx, 'y': P[0]['y']}] + P)
            results[key] = (fl, P)
            if not old:
                rep['added'].append(key)

    # ── توحيد الخطوط المتوازية المتقاربة (نفس منطق fix_paths) ──
    def seg_open(fl, a_, b_, axis):
        dbg = DEBUG[fl]
        mx, my = (a_['x'] + b_['x']) / 2, (a_['y'] + b_['y']) / 2
        return corr_center(dbg['gimg'], dbg['CORR'], mx, my, along_x=(axis == 'x')) is None
    for fl in (1, 2):
        for axis in ('x', 'y'):
            other = 'y' if axis == 'x' else 'x'
            vals = {False: [], True: []}
            for key, (f_, P) in results.items():
                if f_ != fl:
                    continue
                for i in range(len(P) - 2):
                    a_, b_ = P[i], P[i + 1]
                    if abs(a_[axis] - b_[axis]) < 0.3:
                        vals[seg_open(fl, a_, b_, axis)].append((a_[axis], abs(a_[other] - b_[other])))
            snap = {}
            for kind, tol in ((False, 10.0), (True, 26.0)):
                vs = sorted(vals[kind])
                snap[kind] = []
                if not vs:
                    continue
                clusters, cur = [], [vs[0]]
                for v_ in vs[1:]:
                    if v_[0] - cur[0][0] <= tol:
                        cur.append(v_)
                    else:
                        clusters.append(cur)
                        cur = [v_]
                clusters.append(cur)
                for cl in clusters:
                    wsum = sum(w for _, w in cl) or 1
                    snap[kind].append((cl[0][0], cl[-1][0], sum(cc * w for cc, w in cl) / wsum))

            def to(cv, kind):
                for lo, hi, m in snap[kind]:
                    if lo - 1e-6 <= cv <= hi + 1e-6:
                        return m
                return cv
            for key, (f_, P) in results.items():
                if f_ != fl:
                    continue
                new_ = [dict(q) for q in P]
                for i in range(len(P) - 2):
                    if abs(P[i][axis] - P[i + 1][axis]) < 0.3:
                        m = to(P[i][axis], seg_open(fl, P[i], P[i + 1], axis))
                        new_[i][axis] = m
                        new_[i + 1][axis] = m
                if BAD[fl](new_) <= BAD[fl](P):
                    results[key] = (f_, new_)

    # ── فحص: كل مقطع داخل السيب (عدا آخر 3 بكسل عند الباب، ووصلة المدخل في أول المسار) ──
    for key, (f_, P) in results.items():
        g = DEBUG[f_]['gimg']
        sx, sy = NET_START[f_]
        Q = P[1:] if (abs(P[0]['x'] - sx) < 0.6 and abs(P[0]['y'] - sy) < 0.6
                      and g[int(sy), int(sx)] != DEBUG[f_]['CORR']) else P
        bad = BAD[f_](Q)
        if bad:
            rep['off_corridor'].append((key, bad))

    # ── الكتابة بنفس صيغة paths.rel.js ──
    for key, (f_, P) in results.items():
        # ضمان أخير: لا ميلان ولو بجزء من البكسل (نسحب الإحداثي الصغير من الباب للخلف)
        door_end = P[-1]
        P = simplify(P)
        P[-1] = door_end                     # نقطة الباب نفسها لا تضيع في التبسيط
        for i in range(len(P) - 2, -1, -1):
            a_, b_ = P[i], P[i + 1]
            dx_, dy_ = abs(a_['x'] - b_['x']), abs(a_['y'] - b_['y'])
            if dx_ > 1e-6 and dy_ > 1e-6:
                ax_ = 'x' if dx_ < dy_ else 'y'
                if i > 0 and abs(P[i - 1][ax_] - a_[ax_]) < 1e-6:
                    P[i - 1] = dict(P[i - 1], **{ax_: b_[ax_]})
                P[i] = dict(a_, **{ax_: b_[ax_]})
        P = simplify(P)
        for i, q in enumerate(P):
            q['type'] = 'start' if i == 0 else ('end' if i == len(P) - 1 else 'middle')
        body = ',\n'.join(f'    {{ x: {q["x"]:.2f}, y: {q["y"]:.2f}, type: "{q["type"]}" }}' for q in P)
        pat = re.compile(r'("' + re.escape(key) + r'"\s*:\s*)\[.*?\]', re.S)
        text, n = pat.subn(lambda m_: m_.group(1) + '[\n' + body + '\n  ]', text, count=1)
        if not n:
            text = re.sub(r'\n\};\s*$', f',\n  "{key}": [\n{body}\n  ]\n}};\n', text, count=1)
    open(path_file, 'w', encoding='utf-8').write(text)
    rep['written'] = len(results)
    return rep


if __name__ == '__main__':
    rooms = load_rooms()
    PATHS.update(load_paths())
    if os.path.exists(MARKS_FILE):
        MARKS.update(json.load(open(MARKS_FILE, encoding='utf-8')))
    os.makedirs(CACHE, exist_ok=True)
    for fl in (1, 2):
        svg, stats = build(fl, rooms)
        out = os.path.join(ROOT, 'assets', 'maps', f'floor-{fl}.svg')
        with open(out, 'w', encoding='utf-8') as f:
            f.write(svg)
        with open(os.path.join(CACHE, f'floor-{fl}.base.svg'), 'w', encoding='utf-8') as f:
            f.write(BASE[fl])
        with open(os.path.join(CACHE, f'suggest-{fl}.json'), 'w', encoding='utf-8') as f:
            json.dump(SUGGEST[fl], f, ensure_ascii=False)
        with open(os.path.join(CACHE, f'grid-{fl}.json'), 'w', encoding='utf-8') as f:
            json.dump(GRIDEXP[fl], f, separators=(',', ':'))
        print(f'floor-{fl}.svg', f'{len(svg)//1024}KB', stats)
    if AUTO_MARKS or not os.path.exists(MARKS_FILE):
        with open(MARKS_FILE, 'w', encoding='utf-8') as f:
            json.dump(MARKS, f, ensure_ascii=False, indent=1)
    if '--fix-paths' in sys.argv:
        REPORT['paths'] = fix_paths(rooms)
        print('paths', REPORT['paths'])
    if '--net-paths' in sys.argv:
        REPORT['paths'] = net_paths(rooms)
        print('net', json.dumps(REPORT['paths'], ensure_ascii=False))
    with open(os.path.join(CACHE, 'report.json'), 'w', encoding='utf-8') as f:
        json.dump(REPORT, f, ensure_ascii=False)
