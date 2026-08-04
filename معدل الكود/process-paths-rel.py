import json
import os

IMG_WIDTH = 901
IMG_HEIGHT = 988

INPUT_FILE = os.path.join(os.path.dirname(__file__), 'paths.rel.json')
OUTPUT_FILE = os.path.join(os.path.dirname(__file__), 'paths.abs.js')

with open(INPUT_FILE, 'r', encoding='utf-8') as f:
    data = json.load(f)

# الآن data عبارة عن dict: { "1029": [...], "1030": [...] }
map_entries = []

for room_name, points_list in data.items():
    abs_pts = []
    for p in points_list:
        x = round(p['x'] * IMG_WIDTH, 4)
        y = round(p['y'] * IMG_HEIGHT, 4)
        abs_pts.append(f'    {{ x: {x}, y: {y}, type: "{p["type"]}" }}')

    entry = f'  "{room_name}": [\n' + ",\n".join(abs_pts) + '\n  ]'
    map_entries.append(entry)

joined_entries = ',\n'.join(map_entries)

file_content = f"""// paths.abs.js — مولَّد آلياً من process_paths_rel.py
const pathsMap = {{
{joined_entries}
}};

if (typeof module !== 'undefined') {{
  module.exports = pathsMap;
}}
"""

with open(OUTPUT_FILE, 'w', encoding='utf-8') as f:
    f.write(file_content)

print(f"✅ تم إنشاء {OUTPUT_FILE} بالإحداثيات المطلقة بنجاح!")
