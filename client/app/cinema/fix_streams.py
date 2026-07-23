import os

file_path = r"c:\Users\Samarth Deshpande\Desktop\Sam_N\Love\client\app\cinema\page.tsx"

with open(file_path, "r", encoding="utf-8") as f:
    content = f.read()

def replace_between(start_str, end_str, new_str, skip_first=False):
    global content
    idx1 = content.find(start_str)
    if skip_first and idx1 != -1:
        idx1 = content.find(start_str, idx1 + 1)
    if idx1 == -1:
        print("FAILED TO FIND:", start_str[:30])
        return
    idx2 = content.find(end_str, idx1)
    if idx2 == -1:
        print("FAILED TO FIND:", end_str[:30])
        return
    # we don't include end_str if we want to keep it
    content = content[:idx1] + new_str + content[idx2:]

replace_between(
    '<option value="cineby">',
    '</select>',
    '{STREAM_SOURCES.map(s => (<option key={s.key} value={s.key}>{s.emoji} {s.label}</option>))}\n                    '
)

with open(file_path, "w", encoding="utf-8") as f:
    f.write(content)
print("Fixed stream sources.")
