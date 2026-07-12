"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, MapPin, Calendar, Tag, Image as ImageIcon, Heart, ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";
import { format } from "date-fns";
import api from "@/lib/api";

export default function MemoryDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const [selectedPhotoIndex, setSelectedPhotoIndex] = useState(0);

  const { data: memory, isLoading, isError } = useQuery({
    queryKey: ["memory", id],
    queryFn: async () => {
      const res = await api.get(`/memories/${id}`);
      return res.data.data;
    },
    enabled: !!id,
  });

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh]">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
        <p className="mt-4 text-sm text-muted-foreground font-medium animate-pulse">Loading memory...</p>
      </div>
    );
  }

  if (isError || !memory) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] text-center space-y-4">
        <span className="text-5xl">💔</span>
        <h2 className="text-xl font-bold">Memory Not Found</h2>
        <p className="text-muted-foreground">{"The memory you are looking for might have been removed or doesn't exist."}</p>
        <button
          onClick={() => router.push("/scrapbook")}
          className="px-6 py-2 bg-primary text-primary-foreground rounded-xl shadow-md hover:bg-primary/90 transition-all font-semibold"
        >
          Back to Scrapbook
        </button>
      </div>
    );
  }

  const formattedDate = format(new Date(memory.date), "MMMM d, yyyy");

  const nextPhoto = () => {
    if (memory.photos && memory.photos.length > 0) {
      setSelectedPhotoIndex((prev) => (prev + 1) % memory.photos.length);
    }
  };

  const prevPhoto = () => {
    if (memory.photos && memory.photos.length > 0) {
      setSelectedPhotoIndex((prev) => (prev - 1 + memory.photos.length) % memory.photos.length);
    }
  };

  return (
    <div className="flex flex-col min-h-screen pt-4 pb-24 md:pb-8 px-4 sm:px-6 lg:px-8 max-w-4xl mx-auto space-y-6">
      {/* Header Navigation */}
      <div className="flex items-center gap-4">
        <Link
          href="/scrapbook"
          className="p-2.5 rounded-xl bg-card border border-border text-muted-foreground hover:text-foreground transition-all"
        >
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <p className="text-sm text-muted-foreground">Scrapbook</p>
          <h1 className="text-2xl font-bold tracking-tight text-foreground truncate max-w-sm sm:max-w-xl">
            {memory.title}
          </h1>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="glass rounded-3xl overflow-hidden border border-border/50 shadow-lg">
        {/* Photo Gallery (First photo large, others smaller if any) */}
        {memory.photos && memory.photos.length > 0 ? (
          <div className="w-full relative bg-black/5 dark:bg-white/5">
            <div className="aspect-[16/9] w-full relative group">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={memory.photos[selectedPhotoIndex]}
                alt={memory.title}
                className="w-full h-full object-contain bg-black/90"
              />
              {memory.favorite && (
                <div className="absolute top-4 right-4 bg-rose-500/90 text-white p-2 rounded-full shadow-lg backdrop-blur-md z-10">
                  <Heart className="w-5 h-5 fill-white" />
                </div>
              )}

              {/* Navigation Arrows */}
              {memory.photos.length > 1 && (
                <>
                  <button
                    onClick={prevPhoto}
                    className="absolute left-4 top-1/2 -translate-y-1/2 p-2 rounded-full bg-black/50 text-white opacity-0 group-hover:opacity-100 transition-opacity hover:bg-black/70 z-10"
                  >
                    <ChevronLeft className="w-6 h-6" />
                  </button>
                  <button
                    onClick={nextPhoto}
                    className="absolute right-4 top-1/2 -translate-y-1/2 p-2 rounded-full bg-black/50 text-white opacity-0 group-hover:opacity-100 transition-opacity hover:bg-black/70 z-10"
                  >
                    <ChevronRight className="w-6 h-6" />
                  </button>
                  {/* Indicator */}
                  <div className="absolute bottom-4 left-1/2 -translate-x-1/2 px-3 py-1 bg-black/50 backdrop-blur-sm rounded-full text-white text-xs font-medium z-10">
                    {selectedPhotoIndex + 1} / {memory.photos.length}
                  </div>
                </>
              )}
            </div>

            {memory.photos.length > 1 && (
              <div className="flex overflow-x-auto gap-3 p-4 hide-scrollbar bg-black/80">
                {memory.photos.map((photo: string, index: number) => (
                  <button
                    key={index}
                    onClick={() => setSelectedPhotoIndex(index)}
                    className={`w-20 h-20 shrink-0 rounded-xl overflow-hidden transition-all duration-200 ${
                      selectedPhotoIndex === index
                        ? "ring-2 ring-primary ring-offset-2 ring-offset-black scale-105"
                        : "opacity-50 hover:opacity-100 hover:scale-105"
                    }`}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={photo} alt={`${memory.title} thumbnail`} className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className="w-full aspect-[21/9] bg-primary/5 flex flex-col items-center justify-center text-primary/40">
            <ImageIcon className="w-12 h-12 mb-2" />
            <p className="text-sm font-medium">No photos for this memory</p>
          </div>
        )}

        {/* Memory Details */}
        <div className="p-6 sm:p-8 space-y-8">
          
          {/* Metadata Row */}
          <div className="flex flex-wrap gap-4 text-sm">
            <div className="flex items-center gap-1.5 text-muted-foreground bg-secondary/50 px-3 py-1.5 rounded-lg border border-border/50">
              <Calendar className="w-4 h-4 text-primary" />
              <span className="font-medium">{formattedDate}</span>
            </div>
            
            {memory.location && (
              <div className="flex items-center gap-1.5 text-muted-foreground bg-secondary/50 px-3 py-1.5 rounded-lg border border-border/50">
                <MapPin className="w-4 h-4 text-primary" />
                <span className="font-medium">{memory.location}</span>
              </div>
            )}
            
            {memory.mood && (
              <div className="flex items-center gap-1.5 text-muted-foreground bg-secondary/50 px-3 py-1.5 rounded-lg border border-border/50 capitalize">
                <span className="font-medium flex items-center gap-1">
                  Mood: <span className="text-foreground">{memory.mood}</span>
                </span>
              </div>
            )}
          </div>

          {/* Story Text */}
          {memory.story ? (
            <div className="prose dark:prose-invert max-w-none">
              <p className="text-base sm:text-lg leading-relaxed text-foreground/90 whitespace-pre-wrap handwritten text-2xl">
                {memory.story}
              </p>
            </div>
          ) : (
            <div className="text-muted-foreground italic">
              No story was written for this memory.
            </div>
          )}

          {/* Tags */}
          {memory.tags && memory.tags.length > 0 && (
            <div className="pt-6 border-t border-border/50 flex flex-wrap gap-2">
              <div className="flex items-center gap-1.5 text-muted-foreground mr-2">
                <Tag className="w-4 h-4" />
                <span className="text-xs font-medium uppercase tracking-wider">Tags</span>
              </div>
              {memory.tags.map((tag: string, i: number) => (
                <span key={i} className="px-2.5 py-1 text-xs font-medium bg-primary/10 text-primary rounded-full border border-primary/20">
                  #{tag}
                </span>
              ))}
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
