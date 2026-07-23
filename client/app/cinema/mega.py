import re
import os

file_path = r"c:\Users\Samarth Deshpande\Desktop\Sam_N\Love\client\app\cinema\page.tsx"
# First we reset from git again to be safe
os.system(f'git checkout "{file_path}"')

with open(file_path, "r", encoding="utf-8") as f:
    content = f.read()

# Helper
def reg_replace(pattern, repl):
    global content
    content, count = re.subn(pattern, repl, content, flags=re.MULTILINE)
    if count == 0:
        print(f"FAILED TO FIND: {pattern[:50]}")

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
reg_replace(r'export default function CinemaPage\(\) \{', stream_sources)

# Replace Stream Select options
reg_replace(
    r'<option value="cineby">🌟 Cineby\.at \(Primary / First\)</option>[\s\S]*?<option value="autoembed">🤖 AutoEmbed \(Backup 10\)</option>',
    '{STREAM_SOURCES.map(s => (<option key={s.key} value={s.key}>{s.emoji} {s.label}</option>))}'
)

# 2. Canvas-based emoji renderer
reg_replace(
    r'const \[floatingParticles, setFloatingParticles\] = useState<FloatingParticle\[\]>\(\[\]\);',
    r'''const canvasRef = useRef<HTMLCanvasElement>(null);
  const particlesRef = useRef<{emoji:string, x:number, y:number, opacity:number, vy:number, scale:number}[]>([]);
  const animationFrameRef = useRef<number>(0);'''
)

new_tr = r'''const triggerReaction = useCallback((emoji: string, count = 1) => {
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
  }, [chatSoundEnabled, isPartnerPresent, playSound]);'''

reg_replace(r'const triggerReaction = \(emoji: string, count = 1\) => \{[\s\S]*?timeoutsRef\.current\.push\(t\);\s*\};', new_tr)

reg_replace(r'const triggerPopcornFight = \(\) => \{[\s\S]*?timeoutsRef\.current\.push\(t\);\s*\};',
    '''const triggerPopcornFight = useCallback(() => {
    triggerReaction('🍿', 16);
  }, [triggerReaction]);''')

reg_replace(r'interface FloatingParticle \{[\s\S]*?\}\s*', '')

reg_replace(r'<div className="fixed inset-0 pointer-events-none overflow-hidden z-\[55\]">\s*<AnimatePresence>[\s\S]*?</AnimatePresence>\s*</div>', 
    r'<canvas ref={canvasRef} className="fixed inset-0 pointer-events-none z-[55]" style={{width:\'100%\',height:\'100%\'}} />')

# 3. Sync Toasts
reg_replace(
    r'if \(data\.status === "paused"\) showActionToast\("Paused", "⏸"\);\s*if \(data\.status === "playing"\) showActionToast\("Playing", "▶"\);',
    r'if (data.status === "paused") showActionToast("Partner paused", "⏸");\n        if (data.status === "playing") showActionToast("Partner resumed", "▶");'
)

reg_replace(
    r'showActionToast\(`Changed source to \$\{data\.provider\.toUpperCase\(\)\}`, "🔌"\);',
    r'showActionToast(`Partner changed source to ${data.provider.toUpperCase()}`, "🔌");'
)


# 4. Remove Hardcoded Languages
reg_replace(r'const LANGUAGES = \[\s*(?:\{[^}]*\},\s*)*\];\s*', '')
reg_replace(r'const translations: Record<string, Record<string, string>> = \{[\s\S]*?^};\s*', '')
reg_replace(r'const \[uiLang, setUiLang\] = useState<string>\(\(\) => \{[\s\S]*?return "en";\s*\}\);\s*', '')

# Replace translation fallbacks `{translations[uiLang]?.lobby || "Cinema Lobby"}` -> `"Cinema Lobby"`
reg_replace(r'\{?translations\[uiLang\]\?\.[a-zA-Z0-9_]+\s*\|\|\s*("[^"]*")\}?', r'\1')
reg_replace(r'\{?translations\[uiLang\]\?\.[a-zA-Z0-9_]+\?\.toUpperCase\(\)\s*\|\|\s*("[^"]*")\}?', r'\1')

# Replace inline ternaries `uiLang === "es" ? "Romántico" : "Romantic"`
while re.search(r'uiLang\s*===\s*"[a-z]+"\s*\?\s*"[^"]*"\s*:\s*', content):
    content = re.sub(r'uiLang\s*===\s*"[a-z]+"\s*\?\s*"[^"]*"\s*:\s*', '', content)
# Sometimes it looks like: `uiLang === "es" ? "Elegir archivo" : uiLang === "fr" ...`
# The above loop will strip all the conditions and leave the default fallback string.
# Also fix any orphaned `{ "String" }` created by this
content = re.sub(r'\{\s*"([^"]+)"\s*\}', r'"\1"', content)

# Specific fix for the activeStickerPack label issue (from earlier error)
reg_replace(r'\{pack\.label === "Romantic"[\s\S]*?pack\.label\}', '{pack.label}')

# Remove UI Language selector
reg_replace(r'<select[^>]*value=\{uiLang\}[^>]*onChange=\{[^}]*\}[^>]*>[\s\S]*?</select>', '')
reg_replace(r'<label className="text-\[10px\] font-semibold text-zinc-500"[^>]*>UI Language</label>\s*', '')

# 5. Keyboard Shortcuts, Auto-pause, Heartbeat
new_states = '''const [snacks, setSnacks] = useState<Record<string, boolean>>({
    popcorn: false,
    pizza: false,
    soda: false,
    candy: false,
  });
  const [countdown, setCountdown] = useState<number|null>(null);
  const [latency, setLatency] = useState<number|null>(null);'''
reg_replace(r'const \[snacks, setSnacks\] = useState<Record<string, boolean>>\(\{[\s\S]*?candy: false,\s*\}\);', new_states)

# Add latency indicator
reg_replace(
    r'<span className="w-2 h-2 rounded-full bg-\[\#E8587A\] animate-pulse shadow-\[0_0_8px_\#E8587A\]" />\s*<span>"LIVE"</span>',
    r'<span className="w-2 h-2 rounded-full bg-[#E8587A] animate-pulse shadow-[0_0_8px_#E8587A]" />\n                    <span>"LIVE"</span>\n                    {latency !== null && <span className="text-[9px] text-zinc-500">{latency}ms</span>}'
)

use_effects_block = '''  const socket = getSocket();
  // Keyboard shortcuts (Phase 5.3)
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

# Insert the block after socket
reg_replace(r'const socket = getSocket\(\);\s*', use_effects_block)

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

# Insert right after `<div className="min-h-screen bg-black text-white font-sans overflow-hidden flex flex-col relative selection:bg-[#E8587A]/30">`
reg_replace(
    r'<div className="min-h-screen bg-black text-white font-sans overflow-hidden flex flex-col relative selection:bg-\[\#E8587A\]/30">\s*',
    '<div className="min-h-screen bg-black text-white font-sans overflow-hidden flex flex-col relative selection:bg-[#E8587A]/30">\n' + countdown_render + '\n'
)

# Phase 5.1: start countdown when ready
# Find handleStartShow
handle_start_show_new = '''  const handleStartShow = () => {
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
reg_replace(
    r'const handleStartShow = \(\) => \{[\s\S]*?socket\.emit\("cinema_start_show", \{ relationshipId: relId \}\);\s*\};',
    handle_start_show_new
)

with open(file_path, "w", encoding="utf-8") as f:
    f.write(content)
print("Complete rewrite finished.")
