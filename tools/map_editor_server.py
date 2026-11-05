#!/usr/bin/env python3
"""
خادم محرر الخريطة (للتطوير فقط، يعمل على جهازك ولا يُرفع للموقع).

    python tools/map_editor_server.py
    ثم افتح: http://localhost:8010/tools/map-editor.html

- يعرض ملفات المشروع.
- POST /api/marks       يحفظ tools/map-marks.json ثم يعيد بناء الخريطتين.
- POST /api/fix-paths   يعيد البناء ويولّد شبكة المسارات من جديد (أقصر طريق في السيب حتى باب كل قاعة، يعدّل paths.rel.js).
"""
import http.server
import json
import os
import subprocess
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
BUILD = os.path.join(ROOT, 'tools', 'build_maps.py')
MARKS = os.path.join(ROOT, 'tools', 'map-marks.json')
PORT = int(os.environ.get('PORT', '8010'))
ICON_TYPES = {'wc', 'wcStaff', 'lift', 'stairs', 'stairsV', 'mosque', 'theater', 'exit', 'exitV'}


def clean_marks(data):
    """يقبل فقط الشكل المتوقع: {"1": {"icons": [...], "doors": [...]}, "2": {...}}."""
    out = {}
    for fl in ('1', '2'):
        f = data.get(fl) or {}
        icons = []
        for i in f.get('icons', []):
            if i.get('type') not in ICON_TYPES:
                continue
            ic = dict(type=i['type'], x=round(float(i['x']), 1), y=round(float(i['y']), 1))
            if i.get('s'):
                ic['s'] = round(min(30.0, max(6.0, float(i['s']))), 1)   # حجم الرمز = حجم غرفته
            icons.append(ic)
        doors = [dict(x=round(float(d['x']), 1), y=round(float(d['y']), 1)) for d in f.get('doors', [])]
        out[fl] = dict(icons=icons, doors=doors)
    return out


def run_build(*args):
    r = subprocess.run([sys.executable, '-I', BUILD, *args], capture_output=True,
                       encoding='utf-8', errors='replace', cwd=ROOT)
    report = {}
    try:
        with open(os.path.join(ROOT, 'tools', '.cache', 'report.json'), encoding='utf-8') as f:
            report = json.load(f)
    except OSError:
        pass
    return dict(ok=r.returncode == 0, log=(r.stdout + r.stderr)[-3000:], report=report)


class Handler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *a, **k):
        super().__init__(*a, directory=ROOT, **k)

    def end_headers(self):
        self.send_header('Cache-Control', 'no-store')
        super().end_headers()

    def reply(self, obj, code=200):
        body = json.dumps(obj, ensure_ascii=False).encode('utf-8')
        self.send_response(code)
        self.send_header('Content-Type', 'application/json; charset=utf-8')
        self.send_header('Content-Length', str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def do_POST(self):
        n = int(self.headers.get('Content-Length') or 0)
        raw = self.rfile.read(n) if n else b'{}'
        try:
            if self.path == '/api/marks':
                marks = clean_marks(json.loads(raw.decode('utf-8')))
                with open(MARKS, 'w', encoding='utf-8') as f:
                    json.dump(marks, f, ensure_ascii=False, indent=1)
                self.reply(run_build())
            elif self.path == '/api/fix-paths':
                self.reply(run_build('--net-paths'))
            else:
                self.reply(dict(ok=False, log='not found'), 404)
        except Exception as e:  # خطأ في البيانات المرسلة
            self.reply(dict(ok=False, log=str(e)), 400)

    def log_message(self, fmt, *args):
        if 'POST' in str(args[0] if args else ''):
            super().log_message(fmt, *args)


if __name__ == '__main__':
    srv = http.server.ThreadingHTTPServer(('127.0.0.1', PORT), Handler)
    print(f'محرر الخريطة: http://localhost:{PORT}/tools/map-editor.html')
    srv.serve_forever()
