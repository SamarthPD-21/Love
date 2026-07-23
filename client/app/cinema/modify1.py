import re
import os

file_path = r"c:\Users\Samarth Deshpande\Desktop\Sam_N\Love\client\app\cinema\page.tsx"
with open(file_path, "r", encoding="utf-8") as f:
    content = f.read()

# Helper function
def replace_exact(old, new):
    global content
    if old not in content:
        print(f"FAILED TO FIND:\n{old[:100]}...\n")
    content = content.replace(old, new)

# Phase 4.6: STREAM_SOURCES
stream_sources = """const STREAM_SOURCES = [
  { key: 'cineby', label: 'Cineby.at', emoji: '🌟' },
  { key: 'default', label: '1HD.to', emoji: '🎬' },
  { key: 'miruro', label: 'Miruro (Anime)', emoji: '🌸' },
  { key: 'bflix', label: 'BFlix', emoji: '🅱️' },
  { key: 'vidsrc_to', label: 'VidSrc.to', emoji: '⚡' },
  { key: 'vidsrc_me', label: 'VidSrc.me', emoji: '⚡' },
  { key: 'vidsrcme_ru', label: 'VidSrcMe.ru', emoji: '🇷🇺' },
  { key: 'vidsrc_xyz', label: 'VidSrc.xyz', emoji: '⚡' },
  { key: 'two_embed', label: '2Embed', emoji: '🎞️' },
  { key: 'multiembed', label: 'MultiEmbed', emoji: '🔗' },
  { key: 'embedsu', label: 'Embed.su', emoji: '🎥' },
  { key: 'autoembed', label: 'AutoEmbed', emoji: '🤖' },
  { key: 'smashystream', label: 'SmashyStream', emoji: '💥' },
] as const;
"""
content = content.replace("export default function CinemaPage() {", stream_sources + "\nexport default function CinemaPage() {")

# Phase 4.2: Canvas-based emoji renderer
content = re.sub(r'const \[floatingParticles, setFloatingParticles\] = useState<FloatingParticle\[\]>\(\[\]\);',
    r'''const canvasRef = useRef<HTMLCanvasElement>(null);
  const particlesRef = useRef<{emoji:string, x:number, y:number, opacity:number, vy:number, scale:number}[]>([]);
  const animationFrameRef = useRef<number>();''', content)

old_trigger_reaction = """  const triggerReaction = (emoji: string, count = 1) => {
    if (!chatSoundEnabled && isPartnerPresent) {
      playSound("pop");
    }
    const batch: FloatingParticle[] = Array.from({ length: count }).map(() => ({
      id: Math.random().toString(36).substr(2, 9),
      emoji,
      x: 10 + Math.random() * 80,
    }));
    
    setFloatingParticles((prev) => [...prev, ...batch]);
    setTimeout(() => {
      setFloatingParticles((prev) => prev.filter((r) => !batch.some((b) => b.id === r.id)));
    }, 2500);
  };"""
new_trigger_reaction = """  const triggerReaction = useCallback((emoji: string, count = 1) => {
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
  }, [chatSoundEnabled, isPartnerPresent, playSound]);"""

replace_exact(old_trigger_reaction, new_trigger_reaction)

old_popcorn_fight = """  const triggerPopcornFight = () => {
    const batch: FloatingParticle[] = Array.from({ length: 16 }).map(() => ({
      id: Math.random().toString(36).substr(2, 9),
      emoji: "🍿",
      x: 10 + Math.random() * 80,
    }));
    
    setFloatingParticles((prev) => [...prev, ...batch]);
    setTimeout(() => {
      setFloatingParticles((prev) => prev.filter((r) => !batch.some((b) => b.id === r.id)));
    }, 2500);
  };"""
new_popcorn_fight = """  const triggerPopcornFight = useCallback(() => {
    triggerReaction('🍿', 16);
  }, [triggerReaction]);"""

replace_exact(old_popcorn_fight, new_popcorn_fight)

content = re.sub(r'interface FloatingParticle \{[\s\S]*?\}\n', '', content)

old_floating_particles_jsx = """          <AnimatePresence>
            {floatingParticles.map((particle) => (
              <motion.div
                key={particle.id}
                initial={{ y: "100vh", opacity: 0, scale: 0.5 }}
                animate={{
                  y: "-20vh",
                  opacity: [0, 1, 1, 0],
                  scale: [0.5, 1.5, 1, 1],
                  rotate: Math.random() * 360,
                }}
                exit={{ opacity: 0 }}
                transition={{ duration: 2.5, ease: "easeOut" }}
                className="cinema-floating-particle fixed pointer-events-none z-[55] text-4xl"
                style={{ left: `${particle.x}%` }}
              >
                {particle.emoji}
              </motion.div>
            ))}
          </AnimatePresence>"""
new_floating_particles_jsx = """          <canvas ref={canvasRef} className="fixed inset-0 pointer-events-none z-[55]" style={{width:'100%',height:'100%'}} />"""
replace_exact(old_floating_particles_jsx, new_floating_particles_jsx)


# Phase 4.3: Sync toasts — Who Did What
# find cinema_state_changed
old_state_changed = """      socket.on("cinema_state_changed", (data: CinemaSession) => {
        setSession(data);
        if (data.status === "paused") showActionToast("Paused", "⏸");
        if (data.status === "playing") showActionToast("Playing", "▶");
      });"""
new_state_changed = """      socket.on("cinema_state_changed", (data: CinemaSession) => {
        setSession(data);
        if (data.status === "paused") showActionToast("Partner paused", "⏸");
        if (data.status === "playing") showActionToast("Partner resumed", "▶");
      });"""
replace_exact(old_state_changed, new_state_changed)

old_source_changed = """      socket.on("cinema_source_changed", (data: { provider: string; server?: string }) => {
        setSession((prev) => prev ? { ...prev, provider: data.provider, server: data.server } : null);
        showActionToast(`Changed source to ${data.provider.toUpperCase()}`, "🔌");
      });"""
new_source_changed = """      socket.on("cinema_source_changed", (data: { provider: string; server?: string }) => {
        setSession((prev) => prev ? { ...prev, provider: data.provider, server: data.server } : null);
        showActionToast(`Partner changed source to ${data.provider.toUpperCase()}`, "🔌");
      });"""
replace_exact(old_source_changed, new_source_changed)

with open(file_path, "w", encoding="utf-8") as f:
    f.write(content)

print("Modifications saved.")
