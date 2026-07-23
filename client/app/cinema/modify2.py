import re
import os

file_path = r"c:\Users\Samarth Deshpande\Desktop\Sam_N\Love\client\app\cinema\page.tsx"
with open(file_path, "r", encoding="utf-8") as f:
    content = f.read()

def replace_exact(old_regex, new_content):
    global content
    content, num = re.subn(old_regex, new_content, content, count=1, flags=re.MULTILINE)
    if num == 0:
        print(f"FAILED TO FIND REGEX:\n{old_regex[:100]}...\n")

# Phase 4.2: Canvas-based emoji renderer
content = re.sub(r'const \[floatingParticles, setFloatingParticles\] = useState<FloatingParticle\[\]>\(\[\]\);',
    r'''const canvasRef = useRef<HTMLCanvasElement>(null);
  const particlesRef = useRef<{emoji:string, x:number, y:number, opacity:number, vy:number, scale:number}[]>([]);
  const animationFrameRef = useRef<number>();''', content)

# triggerReaction
old_tr = r'const triggerReaction = \(emoji: string, count = 1\) => \{[\s\S]*?\}\n    \}, 3500\);\n    timeoutsRef\.current\.push\(t\);\n  \};'
new_tr = r'''const triggerReaction = useCallback((emoji: string, count = 1) => {
    if (!chatSoundEnabled && isPartnerPresent) {
      playSound("pop");
    }
    const newParticles = Array.from({ length: count }).map(() => ({
      emoji,
      x: 10 + Math.random() * 80,
      y: 110, // Start below screen
      opacity: 1,
      vy: -(2 + Math.random() * 2), // Upward velocity
      scale: 0.5 + Math.random() * 1.5
    }));
    
    particlesRef.current = [...particlesRef.current, ...newParticles].slice(-30);
    
    if (!animationFrameRef.current) {
      const animate = (time: number) => {
        const ctx = canvasRef.current?.getContext('2d');
        if (!ctx || !canvasRef.current) {
          animationFrameRef.current = requestAnimationFrame(animate);
          return;
        }
        
        ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
        let activeParticles = false;
        
        particlesRef.current.forEach(p => {
          if (p.opacity > 0) {
            activeParticles = true;
            p.y += p.vy;
            p.opacity -= 0.005;
            ctx.globalAlpha = Math.max(0, p.opacity);
            ctx.font = `${p.scale * 30}px Arial`;
            ctx.fillText(p.emoji, (p.x / 100) * canvasRef.current.width, (p.y / 100) * canvasRef.current.height);
          }
        });
        
        particlesRef.current = particlesRef.current.filter(p => p.opacity > 0);
        
        if (activeParticles) {
          animationFrameRef.current = requestAnimationFrame(animate);
        } else {
          animationFrameRef.current = undefined;
          ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
        }
      };
      animationFrameRef.current = requestAnimationFrame(animate);
    }
  }, [chatSoundEnabled, isPartnerPresent, playSound]);'''

replace_exact(old_tr, new_tr)

old_pf = r'const triggerPopcornFight = \(\) => \{[\s\S]*?\}\n    \}, 3500\);\n    timeoutsRef\.current\.push\(t\);\n  \};'
new_pf = r'''const triggerPopcornFight = useCallback(() => {
    triggerReaction('🍿', 16);
  }, [triggerReaction]);'''
replace_exact(old_pf, new_pf)

# Delete interface FloatingParticle
content = re.sub(r'interface FloatingParticle \{[\s\S]*?\}\n\n', '', content)

# Remove the floating particles AnimatePresence block
old_jsx = r'<AnimatePresence>\s*\{floatingParticles\.map\(\(r\) => \([\s\S]*?cinema-floating-particle[\s\S]*?\}\s*</AnimatePresence>'
new_jsx = r'<canvas ref={canvasRef} className="fixed inset-0 pointer-events-none z-[55]" style={{width:\'100%\',height:\'100%\'}} />'
replace_exact(old_jsx, new_jsx)

# Phase 4.3: Sync toasts
# find cinema_state_changed
old_state = r'socket\.on\("cinema_state_changed", \(data: CinemaSession\) => \{\s*setSession\(data\);\s*if \(data\.status === "paused"\) showActionToast\("Paused", "⏸"\);\s*if \(data\.status === "playing"\) showActionToast\("Playing", "▶"\);\s*\}\);'
new_state = r'''socket.on("cinema_state_changed", (data: CinemaSession) => {
        setSession(data);
        if (data.status === "paused") showActionToast("Partner paused", "⏸");
        if (data.status === "playing") showActionToast("Partner resumed", "▶");
      });'''
replace_exact(old_state, new_state)

old_source = r'socket\.on\("cinema_source_changed", \(data: \{ provider: string; server\?: string \}\) => \{\s*setSession\(\(prev\) => prev \? \{ \.\.\.prev, provider: data\.provider, server: data\.server \} : null\);\s*showActionToast\(`Changed source to \$\{data\.provider\.toUpperCase\(\)\}`, "🔌"\);\s*\}\);'
new_source = r'''socket.on("cinema_source_changed", (data: { provider: string; server?: string }) => {
        setSession((prev) => prev ? { ...prev, provider: data.provider, server: data.server } : null);
        showActionToast(`Partner changed source to ${data.provider.toUpperCase()}`, "🔌");
      });'''
replace_exact(old_source, new_source)

with open(file_path, "w", encoding="utf-8") as f:
    f.write(content)
print("Saved modify2")
