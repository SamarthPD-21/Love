"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Heart, MapPin, Film } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

interface MemoryCardProps {
  memory: {
    _id: string;
    title: string;
    photos: string[];
    videos: string[];
    location?: string;
    date: string | Date;
    favorite: boolean;
  };
  onFavoriteToggle?: (id: string, e: React.MouseEvent) => void;
}

export function MemoryCard({ memory, onFavoriteToggle }: MemoryCardProps) {
  const [randomRotation, setRandomRotation] = useState(0);

  useEffect(() => {
    // Generate a random slight rotation between -2 and +2 degrees
    const rot = Math.random() * 4 - 2;
    setRandomRotation(rot);
  }, []);

  const formattedDate = format(new Date(memory.date), "MMMM d, yyyy");
  
  // Use first image, or a placeholder if no image exists. If it's a video, we show a video thumbnail.
  const hasPhotos = memory.photos && memory.photos.length > 0;
  const hasVideos = memory.videos && memory.videos.length > 0;
  const mediaUrl = hasPhotos ? memory.photos[0] : hasVideos ? memory.videos[0] : "";
  const isVideo = hasVideos && !hasPhotos;

  const isFavorite = memory.favorite;

  return (
    <motion.div
      style={{ rotate: randomRotation }}
      whileHover={{
        rotate: 0,
        scale: 1.03,
        y: -5,
        boxShadow: "0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)",
      }}
      transition={{ type: "spring", stiffness: 300, damping: 20 }}
      className="bg-white dark:bg-zinc-900 border border-zinc-200/60 dark:border-zinc-800/80 p-4 pb-6 shadow-md rounded-sm flex flex-col w-full relative"
    >
      <Link href={`/memories/${memory._id}`} className="block flex-1">
        {/* Media Window */}
        <div className="relative aspect-[4/3] bg-zinc-100 dark:bg-zinc-950 overflow-hidden border border-zinc-200/30 dark:border-zinc-800/50 mb-4 rounded-xs">
          {mediaUrl ? (
            isVideo ? (
              <div className="w-full h-full relative">
                <video src={mediaUrl} className="w-full h-full object-cover" muted playsInline />
                <div className="absolute inset-0 bg-black/20 flex items-center justify-center">
                  <div className="w-10 h-10 rounded-full bg-white/80 dark:bg-zinc-800/80 flex items-center justify-center shadow-md">
                    <Film className="w-5 h-5 text-zinc-900 dark:text-white" />
                  </div>
                </div>
              </div>
            ) : (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={mediaUrl}
                alt={memory.title}
                className="w-full h-full object-cover transition-transform duration-500 hover:scale-105"
                loading="lazy"
              />
            )
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center text-muted-foreground gap-1">
              <span className="text-3xl">🌸</span>
              <span className="text-[10px]">No Photo</span>
            </div>
          )}

          {/* Location Badge */}
          {memory.location && (
            <div className="absolute bottom-2 left-2 bg-black/60 backdrop-blur-xs text-white text-[10px] px-2 py-0.5 rounded-full flex items-center gap-1">
              <MapPin className="w-2.5 h-2.5" />
              <span className="truncate max-w-[120px]">{memory.location}</span>
            </div>
          )}
        </div>

        {/* Written Area */}
        <div className="space-y-1 px-1">
          <h3 className="font-semibold text-zinc-900 dark:text-zinc-50 tracking-tight text-base truncate">
            {memory.title}
          </h3>
          <p className="text-[11px] text-muted-foreground font-medium">{formattedDate}</p>
        </div>
      </Link>

      {/* Favorite Heart Trigger */}
      {onFavoriteToggle && (
        <button
          onClick={(e) => onFavoriteToggle(memory._id, e)}
          className={cn(
            "absolute top-6 right-6 p-2 rounded-full shadow-sm hover:scale-110 active:scale-95 transition-all z-20",
            isFavorite
              ? "bg-rose-50 dark:bg-rose-950/30 text-rose-500"
              : "bg-white/80 dark:bg-zinc-800/80 text-zinc-400 hover:text-rose-500"
          )}
        >
          <Heart className={cn("w-4 h-4", isFavorite && "fill-rose-500")} />
        </button>
      )}
    </motion.div>
  );
}
