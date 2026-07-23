import re
file_path = r"c:\Users\Samarth Deshpande\Desktop\Sam_N\Love\client\app\cinema\page.tsx"
with open(file_path, "r", encoding="utf-8") as f:
    content = f.read()

# Fix floating particles JSX
content = re.sub(
    r'<AnimatePresence>[\s\S]*?floatingParticles\.map[\s\S]*?</AnimatePresence>',
    r'<canvas ref={canvasRef} className="fixed inset-0 pointer-events-none z-[55]" style={{width:\'100%\',height:\'100%\'}} />',
    content
)

# Fix AutoEmbed (Backup 10) not being found
content = re.sub(
    r'<option value="cineby">[\s\S]*?<option value="smashystream">💥 SmashyStream \(Backup 9\)</option>',
    r'{STREAM_SOURCES.map(s => (<option key={s.key} value={s.key}>{s.emoji} {s.label}</option>))}',
    content
)

# Fix handleStartShow
handle_start_show_new = '''const handleStartShow = () => {
    if (!socket || !user || !user.relationshipId) return;
    const relId = typeof user.relationshipId === "string" ? user.relationshipId : user.relationshipId._id;
    
    setCountdown(3);
    let count = 3;
    const int = setInterval(() => {
      count--;
      setCountdown(count);
      if (count === 0) {
        clearInterval(int);
        setTimeout(() => {
          setCountdown(null);
          socket.emit("cinema_start_show", { relationshipId: relId });
        }, 1000);
      }
    }, 1000);
  };'''
content = re.sub(r'const handleStartShow = \(\) => \{[\s\S]*?socket\.emit\("cinema_start_show", \{ relationshipId: relId \}\);\s*\};', handle_start_show_new, content)

with open(file_path, "w", encoding="utf-8") as f:
    f.write(content)
print("Fixed remaining")
