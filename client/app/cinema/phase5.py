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

# Phase 4.6
replace_block(
    '<option value="cineby">🌟 Cineby.at (Primary / First)</option>',
    '<option value="smashystream">💥 SmashyStream (Backup 9)</option>',
    '{STREAM_SOURCES.map(s => (<option key={s.key} value={s.key}>{s.emoji} {s.label}</option>))}'
)

# Phase 5.1: 3-2-1 Countdown
# Phase 5.6: Sync heartbeat indicator
# Add state to core cinema states
states_start = 'const [snacks, setSnacks] = useState<Record<string, boolean>>({'
states_end = '});'
new_states = '''const [snacks, setSnacks] = useState<Record<string, boolean>>({
    popcorn: false,
    pizza: false,
    soda: false,
    candy: false,
  });
  const [countdown, setCountdown] = useState<number|null>(null);
  const [latency, setLatency] = useState<number|null>(null);'''
replace_block(states_start, states_end, new_states)

# Add latency indicator to top bar
# Look for "Status Badge"
latency_indicator = '''{latency !== null && <span className="text-[9px] text-zinc-500">{latency}ms</span>}'''
replace_block(
    '                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.6)]" />\n                    <span>{translations[uiLang]?.active?.toUpperCase() || "LIVE"}</span>',
    '<span>{translations[uiLang]?.active?.toUpperCase() || "LIVE"}</span>',
    '''                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.6)]" />\n                    <span>{translations[uiLang]?.active?.toUpperCase() || "LIVE"}</span>\n                    ''' + latency_indicator
)

# Phase 5.3: Keyboard shortcuts, 5.5 Auto-pause, 5.6 Heartbeat, 5.1 Countdown logic
# Add them to useEffects
use_effects_block = '''
  // Keyboard shortcuts (Phase 5.3)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger if typing in input
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      switch(e.key.toLowerCase()) {
        case ' ':
          if (session?.showStarted) {
            e.preventDefault();
            // Need to emit pause/play
            if (session.status === 'playing') {
              socket?.emit('cinema_action', { action: 'pause', sessionId: session.id });
            } else {
              socket?.emit('cinema_action', { action: 'play', sessionId: session.id });
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
          // Need reference to mute but we can toggle global volume or video element
          if (videoRef.current) {
            videoRef.current.muted = !videoRef.current.muted;
          }
          break;
        case 'd':
          // Dim lights shortcut
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
  }, [session, socket]);

  // Smart auto-pause on tab switch (Phase 5.5)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden && session?.status === 'playing') {
        socket?.emit('cinema_action', { action: 'pause', sessionId: session.id });
      } else if (!document.hidden && session?.showStarted) {
        showActionToast("Welcome back! Press play to resume", "👋");
      }
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, [session, socket, showActionToast]);

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

  // Phase 5.1 Countdown logic for start/resume
  useEffect(() => {
    // When both are ready and start is triggered, we can set countdown
    // Let's hook it into a manual function instead, or when showStarted becomes true
  }, []);
'''

# Let's insert the new hooks before `useEffect(() => { if (!actionToast) return;`
replace_block(
    'useEffect(() => {\n    if (!actionToast) return;',
    'return () => clearTimeout(timer);\n  }, [actionToast]);',
    '''useEffect(() => {
    if (!actionToast) return;
    const timer = setTimeout(() => setActionToast(null), 3000);
    return () => clearTimeout(timer);
  }, [actionToast]);''' + use_effects_block
)

# For Phase 5.1 countdown render
countdown_render = '''
      {countdown !== null && (
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
      )}
'''
# Add it right after `<div className="min-h-screen bg-black text-white font-sans overflow-hidden flex flex-col relative selection:bg-[#E8587A]/30">`
replace_block(
    '<div className="min-h-screen bg-black text-white font-sans overflow-hidden flex flex-col relative selection:bg-[#E8587A]/30">',
    '<div className="min-h-screen bg-black text-white font-sans overflow-hidden flex flex-col relative selection:bg-[#E8587A]/30">',
    '<div className="min-h-screen bg-black text-white font-sans overflow-hidden flex flex-col relative selection:bg-[#E8587A]/30">' + countdown_render
)

# Phase 4.4 Remove ALL `translations[uiLang]?.xxx || "English"` and inline ternaries
# This requires robust regex
content = re.sub(r'\{?translations\[uiLang\]\?\.[a-zA-Z0-9_]+\s*\|\|\s*("[^"]*")\}?', r'\1', content)

# Remove `LANGUAGES` array completely
content = re.sub(r'const LANGUAGES = \[[\s\S]*?\];\n\n', '', content)
content = re.sub(r'const translations: Record<string, Record<string, string>> = \{[\s\S]*?^};\n', '', content, flags=re.MULTILINE)

# Remove uiLang state
content = re.sub(r'const \[uiLang, setUiLang\] = useState<string>\(\(\) => \{[\s\S]*?return "en";\s*\}\);\s*', '', content)

with open(file_path, "w", encoding="utf-8") as f:
    f.write(content)
print("Finished updates 3.")
