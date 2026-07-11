"use client";

import { useState, useRef, useEffect } from "react";
import { Mic, Square, Play, Trash2, Check, Loader2, Pause } from "lucide-react";
import api from "@/lib/api";
import { cn } from "@/lib/utils";

interface AudioRecorderProps {
  onUploadComplete: (url: string, duration: number) => void;
  className?: string;
}

export function AudioRecorder({ onUploadComplete, className }: AudioRecorderProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [recordTime, setRecordTime] = useState(0);
  const [isPlayingPreview, setIsPlayingPreview] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const audioPreviewRef = useRef<HTMLAudioElement | null>(null);

  // Clean up audio URL and timers
  useEffect(() => {
    return () => {
      if (audioUrl) URL.revokeObjectURL(audioUrl);
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [audioUrl]);

  const startRecording = async () => {
    audioChunksRef.current = [];
    setRecordedBlob(null);
    setAudioUrl(null);
    setRecordTime(0);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: "audio/webm" });
        const url = URL.createObjectURL(audioBlob);
        setRecordedBlob(audioBlob);
        setAudioUrl(url);
        
        // Stop all audio tracks to release microphone
        stream.getTracks().forEach((track) => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);

      timerRef.current = setInterval(() => {
        setRecordTime((prev) => prev + 1);
      }, 1000);
    } catch (error) {
      console.error("Error accessing microphone:", error);
      alert("Microphone access denied or not supported on this browser.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }
  };

  const deleteRecording = () => {
    setRecordedBlob(null);
    setAudioUrl(null);
    setRecordTime(0);
    setIsPlayingPreview(false);
  };

  const togglePreview = () => {
    if (!audioPreviewRef.current) return;

    if (isPlayingPreview) {
      audioPreviewRef.current.pause();
      setIsPlayingPreview(false);
    } else {
      audioPreviewRef.current.play();
      setIsPlayingPreview(true);
    }
  };

  const handlePreviewEnded = () => {
    setIsPlayingPreview(false);
  };

  const handleUpload = async () => {
    if (!recordedBlob) return;

    setIsUploading(true);
    const formData = new FormData();
    // Convert blob to file name
    const file = new File([recordedBlob], "voicenote.webm", { type: "audio/webm" });
    formData.append("files", file);

    try {
      const response = await api.post("/upload", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });

      if (response.data?.urls?.[0]) {
        onUploadComplete(response.data.urls[0], recordTime);
        deleteRecording();
      }
    } catch (error) {
      console.error("Upload voice note error:", error);
      alert("Failed to upload audio file. Please try again.");
    } finally {
      setIsUploading(false);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  return (
    <div className={cn("glass rounded-2xl p-6 flex flex-col items-center justify-center space-y-4 border border-border/40", className)}>
      {audioUrl && (
        <audio
          ref={audioPreviewRef}
          src={audioUrl}
          onEnded={handlePreviewEnded}
          className="hidden"
        />
      )}

      {/* Timer / Info */}
      <div className="text-center">
        {isRecording ? (
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-ping" />
            <p className="text-sm font-semibold text-rose-500 tabular-nums">
              Recording {formatTime(recordTime)}
            </p>
          </div>
        ) : audioUrl ? (
          <p className="text-sm font-semibold text-foreground">
            Voice Note Preview ({formatTime(recordTime)})
          </p>
        ) : (
          <p className="text-sm font-semibold text-muted-foreground">
            Tap the mic to record a note
          </p>
        )}
      </div>

      {/* Main Buttons Row */}
      <div className="flex items-center justify-center gap-4">
        {/* Delete Preview button */}
        {audioUrl && !isUploading && (
          <button
            type="button"
            onClick={deleteRecording}
            className="p-3 bg-muted hover:bg-muted/80 text-muted-foreground rounded-full transition-colors"
            title="Delete recording"
          >
            <Trash2 className="w-5 h-5" />
          </button>
        )}

        {/* Record Trigger */}
        {!audioUrl ? (
          <button
            type="button"
            onClick={isRecording ? stopRecording : startRecording}
            className={cn(
              "w-16 h-16 rounded-full flex items-center justify-center shadow-lg hover:scale-105 active:scale-95 transition-all duration-200",
              isRecording
                ? "bg-rose-500 text-white animate-pulse"
                : "bg-primary text-primary-foreground"
            )}
          >
            {isRecording ? <Square className="w-6 h-6 fill-white" /> : <Mic className="w-7 h-7" />}
          </button>
        ) : (
          /* Play Preview Toggle */
          <button
            type="button"
            onClick={togglePreview}
            className="w-16 h-16 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-lg hover:scale-105 active:scale-95 transition-all duration-200"
          >
            {isPlayingPreview ? <Pause className="w-6 h-6 fill-white" /> : <Play className="w-6 h-6 fill-white ml-0.5" />}
          </button>
        )}

        {/* Confirm Upload button */}
        {audioUrl && (
          <button
            type="button"
            onClick={handleUpload}
            disabled={isUploading}
            className="p-3 bg-success text-success-foreground hover:bg-success-foreground hover:text-success rounded-full shadow-md transition-colors disabled:opacity-50"
            title="Upload recording"
          >
            {isUploading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <Check className="w-5 h-5" />
            )}
          </button>
        )}
      </div>
    </div>
  );
}
