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
if "STREAM_SOURCES" not in content:
    content = content.replace("export default function CinemaPage() {", stream_sources + "export default function CinemaPage() {")

# Phase 4.2
content = re.sub(
    r'const \[floatingParticles, setFloatingParticles\] = useState<FloatingParticle\[\]>\(\[\]\);',
    r'''const canvasRef = useRef<HTMLCanvasElement>(null);
  const particlesRef = useRef<{emoji:string, x:number, y:number, opacity:number, vy:number, scale:number}[]>([]);
  const animationFrameRef = useRef<number>();''',
    content
)

replace_block(
    'const triggerReaction = (emoji: string, count = 1) => {',
    'timeoutsRef.current.push(t);\n  };',
    '''const triggerReaction = useCallback((emoji: string, count = 1) => {
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
)

replace_block(
    'const triggerPopcornFight = () => {',
    'timeoutsRef.current.push(t);\n  };',
    '''const triggerPopcornFight = useCallback(() => {
    triggerReaction('🍿', 16);
  }, [triggerReaction]);'''
)

# Phase 4.3: Sync toasts
# They are inside useEffect for sockets.
content = re.sub(
    r'if \(data\.status === "paused"\) showActionToast\("Paused", "⏸"\);\s*if \(data\.status === "playing"\) showActionToast\("Playing", "▶"\);',
    r'if (data.status === "paused") showActionToast("Partner paused", "⏸");\n        if (data.status === "playing") showActionToast("Partner resumed", "▶");',
    content
)

content = re.sub(
    r'showActionToast\(`Changed source to \$\{data\.provider\.toUpperCase\(\)\}`, "🔌"\);',
    r'showActionToast(`Partner changed source to ${data.provider.toUpperCase()}`, "🔌");',
    content
)

with open(file_path, "w", encoding="utf-8") as f:
    f.write(content)
print("Finished updates.")
