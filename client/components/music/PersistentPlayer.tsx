"use client";

import { useEffect, useRef, useState } from "react";
import { useAudioPlayerStore, YTPlayer } from "@/stores/useAudioPlayerStore";
import { motion, AnimatePresence } from "framer-motion";
import { Play, Pause, Square, Volume2, VolumeX, Music, X, Minimize2, Eye, EyeOff } from "lucide-react";
import { cn } from "@/lib/utils";
import { useSoundEffects } from "@/hooks/useSoundEffects";

export default function PersistentPlayer() {
  const {
    currentSong,
    isPlaying,
    currentTime,
    duration,
    volume,
    setPlayerInstance,
    setCurrentTime,
    setDuration,
    setIsPlaying,
    seek,
    setVolume,
    stopSong,
    pauseSong,
    resumeSong,
  } = useAudioPlayerStore();

  const [isMinimized, setIsMinimized] = useState(false);
  const [showVideo, setShowVideo] = useState(true);
  const [muted, setMuted] = useState(false);
  const [prevVolume, setPrevVolume] = useState(volume);
  const [apiLoaded, setApiLoaded] = useState(false);
  const playerRef = useRef<YTPlayer | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const containerId = "global-youtube-player-container";
  const { playSound } = useSoundEffects();

  // Load YouTube Iframe API
  useEffect(() => {
    if ((window as any).YT) { // eslint-disable-line @typescript-eslint/no-explicit-any
      Promise.resolve().then(() => setApiLoaded(true));
      return;
    }

    // Define callback
    (window as any).onYouTubeIframeAPIReady = () => { // eslint-disable-line @typescript-eslint/no-explicit-any
      setApiLoaded(true);
    };

    // Load Script
    const tag = document.createElement("script");
    tag.src = "https://www.youtube.com/iframe_api";
    const firstScriptTag = document.getElementsByTagName("script")[0];
    firstScriptTag.parentNode?.insertBefore(tag, firstScriptTag);
  }, []);

  // Initialize YT Player once API is loaded
  useEffect(() => {
    if (!apiLoaded || playerRef.current) return;

    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      playerRef.current = new (window as any).YT.Player(containerId, {
        events: {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          onReady: (event: any) => {
            setPlayerInstance(event.target);
            event.target.setVolume(volume);
          },
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          onStateChange: (event: any) => {
            const state = event.data;
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const YTState = (window as any).YT.PlayerState;
            if (state === YTState.PLAYING) {
              setIsPlaying(true);
              if (event.target.getDuration) {
                setDuration(event.target.getDuration() || 0);
              }
            } else if (state === YTState.PAUSED) {
              setIsPlaying(false);
            } else if (state === YTState.ENDED) {
              setIsPlaying(false);
              stopSong();
            }
          },
        },
      });
    } catch (e) {
      console.error("Failed to initialize YouTube player API:", e);
    }
  }, [apiLoaded]); // eslint-disable-line react-hooks/exhaustive-deps

  // Synchronize playing timer
  useEffect(() => {
    if (isPlaying && playerRef.current && playerRef.current.getCurrentTime) {
      intervalRef.current = setInterval(() => {
        const time = playerRef.current?.getCurrentTime();
        const dur = playerRef.current?.getDuration();
        setCurrentTime(time || 0);
        if (dur) setDuration(dur);
      }, 350);
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isPlaying]); // eslint-disable-line react-hooks/exhaustive-deps

  // Expand automatically when a new song starts playing
  useEffect(() => {
    if (currentSong) {
      Promise.resolve().then(() => setIsMinimized(false));
    }
  }, [currentSong?._id]); // eslint-disable-line react-hooks/exhaustive-deps

  const handlePlayPause = () => {
    playSound("tap");
    if (isPlaying) {
      pauseSong();
    } else {
      resumeSong();
    }
  };

  const handleMuteToggle = () => {
    playSound("tap");
    if (muted) {
      setVolume(prevVolume);
      setMuted(false);
    } else {
      setPrevVolume(volume);
      setVolume(0);
      setMuted(true);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs < 10 ? "0" : ""}${secs}`;
  };

  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const targetTime = parseFloat(e.target.value);
    seek(targetTime);
  };

  return (
    <>
      {/* Global YouTube Player Iframe (always mounted to prevent instance destruction) */}
      <div 
        className={cn(
          "transition-all duration-300 overflow-hidden bg-black rounded-2xl border border-border/40 shadow-2xl z-50",
          currentSong && !isMinimized && showVideo
            ? "fixed bottom-[236px] left-4 right-4 sm:left-auto sm:bottom-[210px] sm:right-6 sm:w-80 aspect-video block"
            : "w-[1px] h-[1px] opacity-0 pointer-events-none fixed -left-[9999px] -top-[9999px]"
        )}
      >
        <iframe
          id={containerId}
          src={`https://www.youtube.com/embed/?enablejsapi=1&origin=${encodeURIComponent(
            typeof window !== "undefined" ? window.location.origin : ""
          )}`}
          allow="autoplay; encrypted-media; fullscreen"
          className="w-full h-full border-0"
        />
      </div>

      {/* Floating Player Panel */}
      <AnimatePresence mode="wait">
        {currentSong && (
          isMinimized ? (
            /* Minimized State: Tiny Floating Disc in bottom right */
            <motion.button
              key="minimized"
              initial={{ opacity: 0, scale: 0.8, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.8, y: 20 }}
              onClick={() => {
                playSound("chime");
                setIsMinimized(false);
              }}
              className={cn(
                "fixed z-40 w-12 h-12 rounded-full bg-gradient-to-tr from-primary to-accent border border-primary/20 flex items-center justify-center text-white shadow-2xl cursor-pointer active:scale-95",
                "bottom-24 right-4 sm:bottom-6 sm:right-6" // position adjustments
              )}
              whileHover={{ scale: 1.05 }}
              title={`Playing: ${currentSong.title}. Click to expand.`}
            >
              <motion.div
                animate={isPlaying ? { rotate: 360 } : {}}
                transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
              >
                <Music className="w-5 h-5" />
              </motion.div>
              
              {/* Bouncing notification dot if playing */}
              {isPlaying && (
                <span className="absolute -top-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-emerald-400 border-2 border-background animate-pulse" />
              )}
            </motion.button>
          ) : (
            /* Expanded Full Player Panel */
            <motion.div
              key="expanded"
              initial={{ opacity: 0, y: 50, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 50, scale: 0.95 }}
              transition={{ type: "spring", stiffness: 220, damping: 22 }}
              className={cn(
                "fixed z-40 border border-border/60 shadow-2xl backdrop-blur-md bg-card/85 dark:bg-[#0B0615]/85 rounded-2xl p-4 flex flex-col gap-3",
                "bottom-24 left-4 right-4 sm:left-auto sm:w-80 sm:bottom-6 sm:right-6" // Bottom right on desktop
              )}
            >
              {/* Ambient Background Glow */}
              <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-primary/5 via-accent/5 to-transparent pointer-events-none" />

              {/* Header info */}
              <div className="flex items-center justify-between gap-3 relative z-10">
                <div className="flex items-center gap-3 min-w-0">
                  {/* Vinyl disc / Music Note icon (clickable to minimize) */}
                  <button
                    onClick={() => {
                      playSound("tap");
                      setIsMinimized(true);
                    }}
                    className="relative w-10 h-10 rounded-full bg-gradient-to-tr from-primary to-accent border border-primary/20 flex items-center justify-center text-white shrink-0 shadow-md cursor-pointer active:scale-95 hover:brightness-105 group"
                    title="Click to minimize player"
                  >
                    <motion.div
                      animate={isPlaying ? { rotate: 360 } : {}}
                      transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
                    >
                      <Music className="w-5 h-5 group-hover:scale-90 transition-transform" />
                    </motion.div>
                    
                    {/* Small hover minimize indicator */}
                    <div className="absolute inset-0 rounded-full bg-black/25 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                      <Minimize2 className="w-3.5 h-3.5 text-white" />
                    </div>
                  </button>
                  
                  <div className="min-w-0">
                    <h4 className="text-xs font-black text-foreground truncate leading-tight">
                      {currentSong.title}
                    </h4>
                    <p className="text-[10px] text-muted-foreground truncate font-semibold">
                      {currentSong.artist}
                    </p>
                  </div>
                </div>

                {/* Bouncing audio waveforms & Stop */}
                <div className="flex items-center gap-2">
                  {/* Animated Waveform bars */}
                  <div className="flex items-end gap-0.5 h-4 px-1.5">
                    {[1, 2, 3, 4].map((bar) => (
                      <motion.div
                        key={bar}
                        animate={
                          isPlaying
                            ? {
                                height: [4, bar * 4, 4],
                              }
                            : { height: 4 }
                        }
                        transition={{
                          duration: 0.8,
                          repeat: Infinity,
                          delay: bar * 0.15,
                          ease: "easeInOut",
                        }}
                        className="w-0.5 bg-primary rounded-full"
                      />
                    ))}
                  </div>
                  
                  <button
                    onClick={() => {
                      playSound("tap");
                      setShowVideo(!showVideo);
                    }}
                    className={cn(
                      "p-1 rounded-lg transition-all cursor-pointer",
                      showVideo 
                        ? "text-primary hover:bg-primary/10" 
                        : "text-muted-foreground hover:text-foreground hover:bg-black/5 dark:hover:bg-white/5"
                    )}
                    title={showVideo ? "Hide Video Preview" : "Show Video Preview"}
                  >
                    {showVideo ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                  </button>

                  <button
                    onClick={() => {
                      playSound("tap");
                      setIsMinimized(true);
                    }}
                    className="p-1 rounded-lg text-muted-foreground hover:text-foreground hover:bg-black/5 dark:hover:bg-white/5 transition-all cursor-pointer"
                    title="Minimize"
                  >
                    <Minimize2 className="w-3.5 h-3.5" />
                  </button>

                  <button
                    onClick={() => {
                      playSound("tap");
                      stopSong();
                    }}
                    className="p-1 rounded-lg text-muted-foreground hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/20 transition-all cursor-pointer"
                    title="Close Player"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Progress Duration Slider */}
              <div className="space-y-1 relative z-10">
                <input
                  type="range"
                  min={0}
                  max={duration || 100}
                  value={currentTime}
                  onChange={handleSliderChange}
                  className="w-full h-1.5 rounded-lg bg-border accent-primary cursor-pointer appearance-none outline-none focus:outline-none transition-all"
                />
                <div className="flex justify-between items-center text-[9px] text-muted-foreground font-semibold">
                  <span>{formatTime(currentTime)}</span>
                  <span>{formatTime(duration)}</span>
                </div>
              </div>

              {/* Audio Controls */}
              <div className="flex items-center justify-between gap-4 mt-1 relative z-10">
                {/* Play Pause */}
                <div className="flex items-center gap-2">
                  <button
                    onClick={handlePlayPause}
                    className="w-8 h-8 rounded-lg bg-primary hover:bg-primary-hover text-white flex items-center justify-center shadow-md active:scale-95 transition-all cursor-pointer"
                  >
                    {isPlaying ? <Pause className="w-4 h-4 fill-white" /> : <Play className="w-4 h-4 fill-white ml-0.5" />}
                  </button>
                  <button
                    onClick={() => {
                      playSound("tap");
                      stopSong();
                    }}
                    className="w-8 h-8 rounded-lg bg-muted hover:bg-muted-hover text-muted-foreground hover:text-foreground flex items-center justify-center active:scale-95 transition-all cursor-pointer"
                    title="Stop"
                  >
                    <Square className="w-3.5 h-3.5 fill-muted-foreground/35" />
                  </button>
                </div>

                {/* Volume Slider */}
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={handleMuteToggle}
                    className="text-muted-foreground hover:text-primary transition-all p-1 cursor-pointer"
                  >
                    {muted || volume === 0 ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
                  </button>
                  <input
                    type="range"
                    min={0}
                    max={100}
                    value={muted ? 0 : volume}
                    onChange={(e) => {
                      const v = parseInt(e.target.value);
                      setVolume(v);
                      if (v > 0) setMuted(false);
                    }}
                    className="w-16 h-1 rounded bg-border accent-primary cursor-pointer appearance-none outline-none"
                  />
                </div>
              </div>
            </motion.div>
          )
        )}
      </AnimatePresence>
    </>
  );
}
