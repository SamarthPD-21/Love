import re
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
    idx2 += len(end_str)
    content = content[:idx1] + new_str + content[idx2:]

# 1. STREAM_SOURCES
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

export default function CinemaPage() {"""
content = content.replace("export default function CinemaPage() {", stream_sources)

replace_between(
    '<option value="cineby">',
    '🤖 AutoEmbed (Backup 10)</option>',
    '{STREAM_SOURCES.map(s => (<option key={s.key} value={s.key}>{s.emoji} {s.label}</option>))}'
)

# 2. Canvas-based emoji renderer
content = content.replace(
    "const [floatingParticles, setFloatingParticles] = useState<FloatingParticle[]>([]);",
    """const canvasRef = useRef<HTMLCanvasElement>(null);
  const particlesRef = useRef<{emoji:string, x:number, y:number, opacity:number, vy:number, scale:number}[]>([]);
  const animationFrameRef = useRef<number>(0);"""
)

new_tr = """const triggerReaction = useCallback((emoji: string, count = 1) => {
    if (!chatSoundEnabled && isPartnerPresent) {
      playSound("pop");
    }
    const newParticles = Array.from({ length: count }).map(() => ({
      emoji,
      x: 10 + Math.random() * 80,
      y: 110,
      opacity: 1,
      vy: -(2 + Math.random() * 2),
      scale: 0.5 + Math.random() * 1.5
    }));
    
    particlesRef.current = [...particlesRef.current, ...newParticles].slice(-30);
    
    if (!animationFrameRef.current) {
      const animate = (time: number) => {
        const canvas = canvasRef.current;
        const ctx = canvas?.getContext('2d');
        if (!ctx || !canvas) {
          animationFrameRef.current = requestAnimationFrame(animate);
          return;
        }
        
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        let activeParticles = false;
        
        particlesRef.current.forEach(p => {
          if (p.opacity > 0) {
            activeParticles = true;
            p.y += p.vy;
            p.opacity -= 0.005;
            ctx.globalAlpha = Math.max(0, p.opacity);
            ctx.font = `${p.scale * 30}px Arial`;
            ctx.fillText(p.emoji, (p.x / 100) * canvas.width, (p.y / 100) * canvas.height);
          }
        });
        
        particlesRef.current = particlesRef.current.filter(p => p.opacity > 0);
        
        if (activeParticles) {
          animationFrameRef.current = requestAnimationFrame(animate);
        } else {
          animationFrameRef.current = 0;
          ctx.clearRect(0, 0, canvas.width, canvas.height);
        }
      };
      animationFrameRef.current = requestAnimationFrame(animate);
    }
  }, [chatSoundEnabled, isPartnerPresent, playSound]);"""
replace_between(
    "const triggerReaction = (emoji: string, count = 1) => {",
    "timeoutsRef.current.push(t);\n  };",
    new_tr
)

replace_between(
    "const triggerPopcornFight = () => {",
    "timeoutsRef.current.push(t);\n  };",
    """const triggerPopcornFight = useCallback(() => {
    triggerReaction('🍿', 16);
  }, [triggerReaction]);"""
)

replace_between(
    "interface FloatingParticle {",
    "}\n",
    ""
)

# Precisely locate floatingParticles.map AnimatePresence
idx = content.find("floatingParticles.map")
if idx != -1:
    start_tag = content.rfind("<AnimatePresence>", 0, idx)
    end_tag = content.find("</AnimatePresence>", idx) + len("</AnimatePresence>")
    content = content[:start_tag] + '<canvas ref={canvasRef} className="fixed inset-0 pointer-events-none z-[55]" style={{width:\'100%\',height:\'100%\'}} />' + content[end_tag:]

# 3. Sync Toasts
content = content.replace(
    """if (data.status === "paused") showActionToast("Paused", "⏸");""",
    """if (data.status === "paused") showActionToast("Partner paused", "⏸");"""
)
content = content.replace(
    """if (data.status === "playing") showActionToast("Playing", "▶");""",
    """if (data.status === "playing") showActionToast("Partner resumed", "▶");"""
)
content = content.replace(
    """showActionToast(`Changed source to ${data.provider.toUpperCase()}`, "🔌");""",
    """showActionToast(`Partner changed source to ${data.provider.toUpperCase()}`, "🔌");"""
)

# 4. Remove Hardcoded Languages
content = re.sub(r'const LANGUAGES = \[\s*(?:\{[^}]*\},\s*)*\];\s*', '', content)
content = re.sub(r'const translations: Record<string, Record<string, string>> = \{[\s\S]*?^};\s*', '', content, flags=re.MULTILINE)
content = re.sub(r'const \[uiLang, setUiLang\] = useState<string>\(\(\) => \{[\s\S]*?return "en";\s*\}\);\s*', '', content)

# `{translations[uiLang]?.lobby || "Cinema Lobby"}`
content = re.sub(r'\{?translations\[uiLang\]\?\.[a-zA-Z0-9_]+\s*\|\|\s*("[^"]*")\}?', r'\1', content)
content = re.sub(r'\{?translations\[uiLang\]\?\.[a-zA-Z0-9_]+\?\.toUpperCase\(\)\s*\|\|\s*("[^"]*")\}?', r'\1', content)

# Active sticker pack issue:
content = re.sub(r'\{pack\.label === "Romantic"[\s\S]*?pack\.label\}', '{pack.label}', content)

while re.search(r'uiLang\s*===\s*"[a-z]+"\s*\?\s*"[^"]*"\s*:\s*', content):
    content = re.sub(r'uiLang\s*===\s*"[a-z]+"\s*\?\s*"[^"]*"\s*:\s*', '', content)
content = re.sub(r'\{\s*"([^"]+)"\s*\}', r'"\1"', content)

# Remove UI Language selector
content = re.sub(r'<select[^>]*value=\{uiLang\}[^>]*onChange=\{[^}]*\}[^>]*>[\s\S]*?</select>', '', content)
content = re.sub(r'<label className="text-\[10px\] font-semibold text-zinc-500"[^>]*>UI Language</label>\s*', '', content)


# 5. states
new_states = '''const [snacks, setSnacks] = useState<Record<string, boolean>>({
    popcorn: false,
    pizza: false,
    soda: false,
    candy: false,
  });
  const [countdown, setCountdown] = useState<number|null>(null);
  const [latency, setLatency] = useState<number|null>(null);'''
idx = content.find("const [snacks, setSnacks] = useState<Record<string, boolean>>({")
if idx != -1:
    end = content.find("});", idx) + 3
    content = content[:idx] + new_states + content[end:]

content = content.replace(
    """<span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.6)]" />""",
    """<span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.6)]" />
                    {latency !== null && <span className="text-[9px] text-zinc-500">{latency}ms</span>}"""
)

use_effects_block = '''  // Keyboard shortcuts (Phase 5.3)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger if typing in input
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      switch(e.key.toLowerCase()) {
        case ' ':
          if (session?.showStarted) {
            e.preventDefault();
            const relId = user?.relationshipId ? (typeof user.relationshipId === "string" ? user.relationshipId : user.relationshipId._id) : "";
            if (session.status === 'playing') {
              if (relId) socket?.emit('cinema_state_change', { relationshipId: relId, status: 'paused' });
            } else {
              if (relId) socket?.emit('cinema_state_change', { relationshipId: relId, status: 'playing' });
            }
          }
          break;
        case 'f':
          e.preventDefault();
          if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen().catch(console.error);
          } else {
            document.exitFullscreen();
          }
          break;
        case 'm':
          if (videoRef.current) {
            videoRef.current.muted = !videoRef.current.muted;
          }
          break;
        case 'd':
          break;
        case 'escape':
          if (document.fullscreenElement) {
            document.exitFullscreen();
          }
          break;
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [session, socket, user]);

  // Smart auto-pause on tab switch (Phase 5.5)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden && session?.status === 'playing') {
        const relId = user?.relationshipId ? (typeof user.relationshipId === "string" ? user.relationshipId : user.relationshipId._id) : "";
        if (relId) socket?.emit('cinema_state_change', { relationshipId: relId, status: 'paused' });
      } else if (!document.hidden && session?.showStarted) {
        showActionToast("Welcome back! Press play to resume", "👋");
      }
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, [session, socket, user, showActionToast]);

  // Sync heartbeat indicator (Phase 5.6)
  useEffect(() => {
    if (!session?.showStarted || !socket) return;
    
    const interval = setInterval(() => {
      socket.emit('cinema_heartbeat_ping', { timestamp: Date.now() });
    }, 10000);

    const handlePong = (data: { timestamp: number }) => {
      setLatency(Date.now() - data.timestamp);
    };

    socket.on('cinema_heartbeat_pong', handlePong);
    return () => {
      clearInterval(interval);
      socket.off('cinema_heartbeat_pong', handlePong);
    };
  }, [session?.showStarted, socket]);
'''
content = content.replace("const socket = getSocket();", "const socket = getSocket();\n" + use_effects_block)

countdown_render = '''      {countdown !== null && (
        <motion.div className="fixed inset-0 z-[60] bg-black/80 flex items-center justify-center">
          <motion.span 
            className="text-9xl font-black text-white" 
            key={countdown} 
            initial={{scale:2,opacity:0}} 
            animate={{scale:1,opacity:1}} 
            exit={{scale:0.5,opacity:0}}
          >
            {countdown === 0 ? '🎬' : countdown}
          </motion.span>
        </motion.div>
      )}'''
div_str = '<div className="min-h-screen bg-black text-white font-sans overflow-hidden flex flex-col relative selection:bg-[#E8587A]/30">'
content = content.replace(div_str, div_str + "\n" + countdown_render)

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

idx = content.find("const handleStartShow = () => {")
if idx != -1:
    end = content.find("};\n", idx)
    if end == -1: end = content.find("};\r\n", idx)
    content = content[:idx] + handle_start_show_new + content[end+2:]

with open(file_path, "w", encoding="utf-8") as f:
    f.write(content)
print("Finished rewriting extremely safely.")
