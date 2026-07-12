"use client";

import { useState, useRef } from "react";
import { UploadCloud, X, Film, Image as ImageIcon, Loader2 } from "lucide-react";
import api from "@/lib/api";
import { useToastStore } from "@/stores/useToastStore";
import { cn } from "@/lib/utils";

interface ImageUploadProps {
  value: string[];
  onChange: (urls: string[]) => void;
  maxFiles?: number;
  className?: string;
}

export function ImageUpload({
  value = [],
  onChange,
  maxFiles = 10,
  className,
}: ImageUploadProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [progress, setProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const showToast = useToastStore((s) => s.showToast);

  const handleFiles = async (files: FileList) => {
    if (files.length === 0) return;
    
    // Check if we exceed max files
    if (value.length + files.length > maxFiles) {
      showToast(`You can only upload up to ${maxFiles} files`, "error");
      return;
    }

    setIsUploading(true);
    setProgress(10);
    const formData = new FormData();
    for (let i = 0; i < files.length; i++) {
      formData.append("files", files[i]);
    }

    try {
      const response = await api.post("/upload", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
        onUploadProgress: (progressEvent) => {
          if (progressEvent.total) {
            const percentage = Math.round((progressEvent.loaded * 90) / progressEvent.total) + 10;
            setProgress(percentage);
          }
        },
      });

      if (response.data?.urls) {
        onChange([...value, ...response.data.urls]);
      }
    } catch (error) {
      console.error("Upload error:", error);
      showToast("Failed to upload files. Please try again.", "error");
    } finally {
      setIsUploading(false);
      setProgress(0);
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFiles(e.dataTransfer.files);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault();
    if (e.target.files && e.target.files[0]) {
      handleFiles(e.target.files);
    }
  };

  const removeFile = (indexToRemove: number) => {
    const updated = value.filter((_, idx) => idx !== indexToRemove);
    onChange(updated);
  };

  const isVideo = (url: string) => {
    const extension = url.split(".").pop()?.toLowerCase();
    return ["mp4", "webm", "ogg", "mov"].includes(extension || "");
  };

  return (
    <div className={cn("space-y-4", className)}>
      {/* Upload Zone */}
      {value.length < maxFiles && (
        <div
          onDragEnter={handleDrag}
          onDragOver={handleDrag}
          onDragLeave={handleDrag}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={cn(
            "border-2 border-dashed rounded-2xl p-8 flex flex-col items-center justify-center cursor-pointer transition-all duration-200",
            dragActive
              ? "border-primary bg-primary/5"
              : "border-border hover:border-primary/50 hover:bg-muted/30",
            isUploading && "pointer-events-none opacity-50"
          )}
        >
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="image/*,video/*"
            onChange={handleChange}
            className="hidden"
          />
          {isUploading ? (
            <div className="flex flex-col items-center gap-3">
              <Loader2 className="w-10 h-10 text-primary animate-spin" />
              <p className="text-sm font-medium text-muted-foreground">
                Uploading files ({progress}%)
              </p>
              <div className="w-48 bg-muted rounded-full h-1.5 overflow-hidden">
                <div
                  className="bg-primary h-1.5 transition-all duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-2 text-center">
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary mb-2">
                <UploadCloud className="w-6 h-6" />
              </div>
              <p className="text-sm font-semibold text-foreground">
                Drag & drop photos & videos here
              </p>
              <p className="text-xs text-muted-foreground">
                or click to browse from your device (Max {maxFiles - value.length} more)
              </p>
            </div>
          )}
        </div>
      )}

      {/* Uploaded File Previews */}
      {value.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          {value.map((url, idx) => (
            <div
              key={url}
              className="relative aspect-square rounded-xl overflow-hidden border border-border group"
            >
              {isVideo(url) ? (
                <div className="w-full h-full bg-slate-900 flex items-center justify-center relative">
                  <video src={url} className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
                    <Film className="w-6 h-6 text-white" />
                  </div>
                </div>
              ) : (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={url} alt={`Upload preview ${idx}`} className="w-full h-full object-cover" />
              )}
              {/* Delete Button */}
              <button
                type="button"
                onClick={() => removeFile(idx)}
                className="absolute top-2 right-2 p-1.5 rounded-full bg-black/60 text-white hover:bg-black/80 opacity-0 group-hover:opacity-100 transition-opacity duration-200"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
