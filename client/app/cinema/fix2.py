import re
import os

file_path = r"c:\Users\Samarth Deshpande\Desktop\Sam_N\Love\client\app\cinema\page.tsx"
with open(file_path, "r", encoding="utf-8") as f:
    content = f.read()

# Fix 1: Expected 1 arguments, but got 0.
content = content.replace("const animationFrameRef = useRef<number>();", "const animationFrameRef = useRef<number>(0);")

# Fix 2: Move the new useEffects below socket declaration.
# The `const socket = getSocket();` is around line 280.
# I'll cut out the three useEffects and paste them after `const socket = getSocket();`
# Wait, they are currently before `const socket`.
# Let's just find `const socket = getSocket();` and move it above the `useEffects`.
if "const socket = getSocket();" in content:
    # First remove it
    content = content.replace("const socket = getSocket();", "")
    # Add it right after `const chatEndRef = useRef<HTMLDivElement>(null);`
    content = content.replace("const chatEndRef = useRef<HTMLDivElement>(null);", "const chatEndRef = useRef<HTMLDivElement>(null);\n  const socket = getSocket();")

# Fix 3: canvasRef.current null check
content = content.replace("const animate = (time: number) => {", "const animate = (time: number) => {\n        const canvas = canvasRef.current;")
content = content.replace("!ctx || !canvasRef.current", "!ctx || !canvas")
content = content.replace("canvasRef.current.width", "canvas.width")
content = content.replace("canvasRef.current.height", "canvas.height")
content = content.replace("canvasRef.current?.width", "canvas.width")
content = content.replace("canvasRef.current?.height", "canvas.height")

# Fix 4: Remove leftover `translations[uiLang]`
content = re.sub(r'\{translations\[uiLang\]\?\.[a-zA-Z0-9_]+\?\.toUpperCase\(\)\s*\|\|\s*("[^"]*")\}', r'\1', content)

# Fix 5: Change socket emission event in shortcuts and auto-pause
# It should be `socket.emit("cinema_state_change", { relationshipId: relId, status: "..." })`
# Wait, I need `relId`. It's `getRelationshipId(user?.relationshipId)`. But `user` is not guaranteed in the scope of the useEffect?
# Wait, let's see how `relId` is calculated elsewhere. `const relId = getRelationshipId(user.relationshipId);`
# But I used `socket?.emit('cinema_action', { action: 'pause', sessionId: session.id });`
# I should change it to:
socket_emit_pause = '''const relId = user?.relationshipId ? typeof user.relationshipId === "string" ? user.relationshipId : user.relationshipId._id : "";
          if (relId) socket?.emit('cinema_state_change', { relationshipId: relId, status: 'paused' });'''
socket_emit_play = '''const relId = user?.relationshipId ? typeof user.relationshipId === "string" ? user.relationshipId : user.relationshipId._id : "";
          if (relId) socket?.emit('cinema_state_change', { relationshipId: relId, status: 'playing' });'''

content = content.replace("socket?.emit('cinema_action', { action: 'pause', sessionId: session.id });", socket_emit_pause)
content = content.replace("socket?.emit('cinema_action', { action: 'play', sessionId: session.id });", socket_emit_play)


with open(file_path, "w", encoding="utf-8") as f:
    f.write(content)
print("Fixes applied round 2.")
