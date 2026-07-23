import re
import os

file_path = r"c:\Users\Samarth Deshpande\Desktop\Sam_N\Love\client\app\cinema\page.tsx"
with open(file_path, "r", encoding="utf-8") as f:
    content = f.read()

def replace_block(start_str, end_str, new_content):
    global content
    start = content.find(start_str)
    if start == -1:
        print(f"FAILED TO FIND START:\n{start_str[:100]}")
        return
    end = content.find(end_str, start)
    if end == -1:
        print(f"FAILED TO FIND END:\n{end_str[:100]}")
        return
    end += len(end_str)
    content = content[:start] + new_content + content[end:]
    print("Replaced block successfully.")

# Remove FloatingParticle
replace_block(
    'interface FloatingParticle {',
    '}\n',
    ''
)

# Remove AnimatePresence for floating particles
replace_block(
    '<AnimatePresence>\n            {floatingParticles.map((r)',
    '</AnimatePresence>',
    '<canvas ref={canvasRef} className="fixed inset-0 pointer-events-none z-[55]" style={{width:\'100%\',height:\'100%\'}} />'
)

# Phase 4.6 Stream Provider Option replacement
# replace options with map
replace_block(
    '<option value="cineby">🌟 Cineby.at (Primary / First)</option>',
    '<option value="smashystream">💥 SmashyStream (Backup 9)</option>',
    '{STREAM_SOURCES.map(s => (<option key={s.key} value={s.key}>{s.emoji} {s.label}</option>))}'
)


with open(file_path, "w", encoding="utf-8") as f:
    f.write(content)
print("Finished updates 2.")
