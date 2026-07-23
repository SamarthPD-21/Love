import re
import os

file_path = r"c:\Users\Samarth Deshpande\Desktop\Sam_N\Love\client\app\cinema\page.tsx"
with open(file_path, "r", encoding="utf-8") as f:
    content = f.read()

# Fix canvas syntax error
content = content.replace("style={{width:\\'100%\\',height:\\'100%\\'}}", "style={{width:'100%',height:'100%'}}")
content = content.replace("style={{width:\\\"100%\\\",height:\\\"100%\\\"}}", "style={{width:'100%',height:'100%'}}")

# Fix `pack.label` issue specifically:
# Original: 
# {pack.label === "Romantic" ? (uiLang === "es" ? "Romántico" : uiLang === "ja" ? "恋愛" : "Romantic") : 
#  pack.label === "Reactions" ? (uiLang === "es" ? "Reacciones" : uiLang === "ja" ? "リアクション" : "Reactions") :
#  pack.label === "Cozy Vibes" ? (uiLang === "es" ? "Acogedor" : uiLang === "ja" ? "まったり" : "Cozy Vibes") :
#  pack.label}
# We can just replace this whole block with {pack.label}
sticker_block_regex = r'\{pack\.label === "Romantic"[\s\S]*?pack\.label\}'
content = re.sub(sticker_block_regex, '{pack.label}', content)

# Remove uiLang everywhere
content = re.sub(r'uiLang\s*===\s*"[a-z]+"\s*\?\s*"[^"]*"\s*:\s*', '', content)
while re.search(r'uiLang\s*===\s*"[a-z]+"\s*\?\s*"[^"]*"\s*:\s*', content):
    content = re.sub(r'uiLang\s*===\s*"[a-z]+"\s*\?\s*"[^"]*"\s*:\s*', '', content)

# Also there's one with variable interpolations like: 
# {uiLang === "es" ? "Cargar \ud83c\udfac" : "Load \ud83c\udfac"}
# Wait, just `{uiLang === "en" ? ... : "Default"}`
content = re.sub(r'\{\s*"([^"]+)"\s*\}', r'"\1"', content)

# Remove LANGUAGES select in settings
content = re.sub(r'<select[^>]*value=\{uiLang\}[^>]*onChange=\{[^}]*\}[^>]*>[\s\S]*?</select>', '', content)
content = re.sub(r'<label className="text-\[10px\] font-semibold text-zinc-500"[^>]*>UI Language</label>\s*', '', content)

with open(file_path, "w", encoding="utf-8") as f:
    f.write(content)
print("Fixes applied.")
