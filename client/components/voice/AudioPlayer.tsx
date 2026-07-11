"use client";

import { useState, useRef, useEffect } from "react";
import { Play, Pause, Volume2, VolumeX, RotateCcw } from "lucide-react";
import { cn } from "@/lib/utils";

interface AudioPlayerProps {
  url: string;
  duration?: number; // duration in seconds
  title?: string;
  sender?: string;
  className?: string;
}

export function AudioPlayer({
  url,
  duration,
  title,
  sender,
  className,
}: AudioPlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [playerDuration, setPlayerDuration] = useState(duration || 0);
  const [isMuted, setIsMuted] = useState(false);
  const [volume, setVolume] = useState(1);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const progressRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = isMuted ? 0 : volume;
    }
  }, [isMuted, volume]);

  const togglePlay = () => {
    if (!audioRef.current) return;

    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play();
      setIsPlaying(true);
    }
  };

  const handleTimeUpdate = () => {
    if (!audioRef.current) return;
    setCurrentTime(audioRef.current.currentTime);
  };

  const handleLoadedMetadata = () => {
    if (!audioRef.current) return;
    setPlayerDuration(audioRef.current.duration);
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!audioRef.current) return;
    const time = parseFloat(e.target.value);
    audioRef.current.currentTime = time;
    setCurrentTime(time);
  };

  const handleRestart = () => {
    if (!audioRef.current) return;
    audioRef.current.currentTime = 0;
    setCurrentTime(0);
    if (!isPlaying) {
      audioRef.current.play();
      setIsPlaying(true);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  return (
    <div className={cn("bg-card border border-border p-4 rounded-2xl flex items-center gap-4 w-full shadow-sm hover:shadow-md transition-shadow", className)}>
      <audio
        ref={audioRef}
        src={url}
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
        onEnded={() => setIsPlaying(false)}
        className="hidden"
      />

      {/* Play/Pause Button */}
      <button
        onClick={togglePlay}
        className="w-10 h-10 rounded-xl bg-primary text-primary-foreground flex items-center justify-center flex-shrink-0 hover:bg-primary-hover transition-colors shadow-sm"
      >
        {isPlaying ? <Pause className="w-4 h-4 fill-white" /> : <Play className="w-4 h-4 fill-white ml-0.5" />}
      </button>

      {/* Info & Controls */}
      <div className="flex-1 min-w-0 flex flex-col gap-1">
        <div className="flex justify-between items-center gap-2">
          {title ? (
            <div className="truncate">
              <span className="font-semibold text-xs text-foreground block truncate">{title}</span>
              {sender && <span className="text-[10px] text-muted-foreground block truncate">by {sender}</span>}
            </div>
          ) : (
            <span className="text-xs text-muted-foreground">Voice Note</span>
          )}
          
          <div className="flex items-center gap-1.5 flex-shrink-0">
            <span className="text-[10px] text-muted-foreground tabular-nums">
              {formatTime(currentTime)} / {formatTime(playerDuration)}
            </span>
            <button
              onClick={handleRestart}
              className="p-1 rounded text-muted-foreground hover:text-foreground transition-colors"
              title="Restart"
            >
              <RotateCcw className="w-3 h-3" />
            </button>
          </div>
        </div>

        {/* Progress bar */}
        <input
          ref={progressRef}
          type="range"
          min="0"
          max={playerDuration || 100}
          value={currentTime}
          onChange={handleSeek}
          className="w-full h-1 bg-muted rounded-lg appearance-none cursor-pointer accent-primary border-none outline-none"
        />
      </div>

      {/* Volume controls */}
      <div className="hidden sm:flex items-center gap-2">
        <button
          onClick={() => setIsMuted(!isMuted)}
          className="p-1 rounded text-muted-foreground hover:text-foreground transition-colors"
        >
          {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
        </button>
        <input
          type="range"
          min="0"
          max="1"
          step="0.01"
          value={isMuted ? 0 : volume}
          onChange={(e) => {
            setVolume(parseFloat(e.target.value));
            setIsMuted(false);
          }}
          className="w-16 h-1 bg-muted rounded-lg appearance-none cursor-pointer accent-primary border-none outline-none"
        />
      </div>
    </div>
  );
}
