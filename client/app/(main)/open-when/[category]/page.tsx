"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  Loader2,
  Calendar,
  Sparkles,
  User,
  Music,
  Trash2,
  MailOpen,
  X,
  Mic,
} from "lucide-react";
import { format } from "date-fns";
import api from "@/lib/api";
import { useToastStore } from "@/stores/useToastStore";
import { PageTransition } from "@/components/animations/PageTransition";
import { AudioPlayer } from "@/components/voice/AudioPlayer";
import { cn } from "@/lib/utils";
import type { OpenWhenLetter } from "@/types";

// Re-map categories to get their emoji/details
const categories = [
  { name: "Miss Me", emoji: "❤️", desc: "Open when you want to feel close.", color: "bg-rose-50 border-rose-200 text-rose-600 dark:bg-rose-950/20 dark:border-rose-900" },
  { name: "Sad", emoji: "🌧", desc: "Open when you need a gentle hug.", color: "bg-blue-50 border-blue-200 text-blue-600 dark:bg-blue-950/20 dark:border-blue-900" },
  { name: "Can't Sleep", emoji: "😴", desc: "Open when your thoughts won't quiet.", color: "bg-indigo-50 border-indigo-200 text-indigo-600 dark:bg-indigo-950/20 dark:border-indigo-900" },
  { name: "Crying", emoji: "😭", desc: "Open when the tears start falling.", color: "bg-sky-50 border-sky-200 text-sky-600 dark:bg-sky-950/20 dark:border-sky-900" },
  { name: "Overwhelmed", emoji: "😞", desc: "Open when everything feels too heavy.", color: "bg-purple-50 border-purple-200 text-purple-600 dark:bg-purple-950/20 dark:border-purple-900" },
  { name: "Need Motivation", emoji: "💪", desc: "Open when you need some strength.", color: "bg-amber-50 border-amber-200 text-amber-600 dark:bg-amber-950/20 dark:border-amber-900" },
  { name: "Happy", emoji: "🎉", desc: "Open when you want to celebrate.", color: "bg-emerald-50 border-emerald-200 text-emerald-600 dark:bg-emerald-950/20 dark:border-emerald-900" },
  { name: "Need Reassurance", emoji: "🥹", desc: "Open when you doubt yourself.", color: "bg-violet-50 border-violet-200 text-violet-600 dark:bg-violet-950/20 dark:border-violet-900" },
  { name: "Angry", emoji: "😡", desc: "Open when you need to let it out.", color: "bg-orange-50 border-orange-200 text-orange-600 dark:bg-orange-950/20 dark:border-orange-900" },
  { name: "Lonely", emoji: "🤍", desc: "Open when the space feels too empty.", color: "bg-slate-50 border-slate-200 text-slate-600 dark:bg-slate-950/20 dark:border-slate-900" },
  { name: "Burnt Out", emoji: "🌸", desc: "Open when your energy is gone.", color: "bg-fuchsia-50 border-fuchsia-200 text-fuchsia-600 dark:bg-fuchsia-950/20 dark:border-fuchsia-900" },
  { name: "Need Hope", emoji: "✨", desc: "Open when you need a little magic.", color: "bg-yellow-50 border-yellow-200 text-yellow-600 dark:bg-yellow-950/20 dark:border-yellow-900" },
  { name: "Just Because", emoji: "💖", desc: "Open for no reason at all.", color: "bg-pink-50 border-pink-200 text-pink-600 dark:bg-pink-950/20 dark:border-pink-900" },
];

const paperStyles: Record<string, string> = {
  peach: "bg-amber-50/90 dark:bg-amber-950/20 text-amber-900 dark:text-amber-100 border-amber-200/50 dark:border-amber-900/30",
  pink: "bg-rose-50/90 dark:bg-rose-950/20 text-rose-900 dark:text-rose-100 border-rose-200/50 dark:border-rose-900/30",
  lavender: "bg-purple-50/90 dark:bg-purple-950/20 text-purple-900 dark:text-purple-100 border-purple-200/50 dark:border-purple-900/30",
  sage: "bg-emerald-50/90 dark:bg-emerald-950/20 text-emerald-900 dark:text-emerald-100 border-emerald-200/50 dark:border-emerald-900/30",
};

interface PopulatedOpenWhenLetter extends Omit<OpenWhenLetter, "userId"> {
  userId: {
    _id: string;
    name: string;
    avatar?: string;
  };
}

export default function CategoryCabinetPage() {
  const params = useParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const showToast = useToastStore((s) => s.showToast);

  const rawCategory = params.category as string;
  const categoryName = decodeURIComponent(rawCategory);

  const matchedCategory = categories.find(
    (c) => c.name.toLowerCase() === categoryName.toLowerCase()
  ) || {
    name: categoryName,
    emoji: "💌",
    desc: `Letters to open when feeling ${categoryName}.`,
    color: "bg-muted border-border text-muted-foreground",
  };

  const [selectedLetter, setSelectedLetter] = useState<PopulatedOpenWhenLetter | null>(null);

  // Fetch letters for this specific category
  const { data: letters = [], isLoading } = useQuery<PopulatedOpenWhenLetter[]>({
    queryKey: ["open-when-category", categoryName],
    queryFn: async () => {
      const res = await api.get(`/open-when/category/${encodeURIComponent(categoryName)}`);
      return res.data.data;
    },
  });

  // Delete letter mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/open-when/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["open-when-category", categoryName] });
      queryClient.invalidateQueries({ queryKey: ["open-when"] }); // also refresh counts
      setSelectedLetter(null);
      showToast("Cabinet letter deleted successfully.", "success");
    },
  });

  const handleDelete = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm("Are you sure you want to delete this sentiment pill?")) {
      deleteMutation.mutate(id);
    }
  };

  return (
    <PageTransition>
      <div className="max-w-5xl mx-auto space-y-6 pb-12 px-4 sm:px-6">
        
        {/* Back header */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push("/letters?tab=open-when")}
            className="p-2 rounded-xl bg-card border border-border text-muted-foreground hover:text-foreground transition-all cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
              <span>{matchedCategory.emoji}</span>
              <span>Open When: {matchedCategory.name}</span>
            </h1>
            <p className="text-xs text-muted-foreground">{matchedCategory.desc}</p>
          </div>
        </div>

        {/* Letters list */}
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-20 text-muted-foreground gap-3">
            <Loader2 className="w-8 h-8 text-primary animate-spin" />
            <p className="text-sm font-medium">Opening cabinet drawer...</p>
          </div>
        ) : letters.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center glass rounded-2xl border border-border/40 p-8 space-y-2">
            <span className="text-5xl">📭</span>
            <h3 className="text-lg font-bold text-foreground">Cabinet is empty</h3>
            <p className="text-xs text-muted-foreground max-w-sm handwritten text-base">
              No letters written in this category yet. Compose one to leave sweet words for when your partner feels this way!
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
            {letters.map((letter: PopulatedOpenWhenLetter) => {
              const paperColor = paperStyles[letter.customBackground || "peach"];
              return (
                <motion.div
                  key={letter._id}
                  layoutId={letter._id}
                  onClick={() => setSelectedLetter(letter)}
                  whileHover={{ y: -4 }}
                  className={cn(
                    "border p-6 rounded-2xl flex flex-col justify-between h-56 cursor-pointer shadow-sm hover:shadow-md transition-all relative overflow-hidden group",
                    paperColor
                  )}
                >
                  <div className="absolute top-0 right-0 w-24 h-24 bg-white/5 dark:bg-black/5 rounded-bl-full pointer-events-none" />
                  
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-extrabold uppercase tracking-widest opacity-60">
                        {format(new Date(letter.createdAt), "MMM d, yyyy")}
                      </span>
                      <button
                        onClick={(e) => handleDelete(letter._id, e)}
                        className="p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 sm:opacity-0 sm:group-hover:opacity-100 transition-all"
                        aria-label="Delete letter"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <h3 className="text-lg font-extrabold tracking-tight leading-snug line-clamp-2">
                      {letter.title}
                    </h3>
                    
                    <p className="text-sm line-clamp-3 opacity-80 handwritten font-normal leading-relaxed">
                      {letter.content}
                    </p>
                  </div>

                  <div className="flex items-center justify-between pt-3 border-t border-black/5 dark:border-white/5 text-[11px] font-bold opacity-80">
                    <div className="flex items-center gap-1.5">
                      <User className="w-3 h-3" />
                      <span>by {letter.userId?.name}</span>
                    </div>
                    <span className="flex items-center gap-1">
                      Open <MailOpen className="w-3 h-3 animate-pulse" />
                    </span>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}

        {/* Selected Letter Lightbox (Modal) */}
        <AnimatePresence>
          {selectedLetter && (
            <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
              <motion.div
                layoutId={selectedLetter._id}
                className={cn(
                  "w-full max-w-2xl rounded-2xl border p-6 sm:p-8 shadow-2xl relative max-h-[85vh] overflow-y-auto space-y-6 flex flex-col justify-between",
                  paperStyles[selectedLetter.customBackground || "peach"]
                )}
              >
                {/* Close Button */}
                <button
                  onClick={() => setSelectedLetter(null)}
                  className="absolute top-4 right-4 p-2 rounded-full bg-white/10 dark:bg-black/10 hover:bg-white/20 hover:scale-105 active:scale-95 transition-all text-foreground cursor-pointer"
                  aria-label="Close Letter"
                >
                  <X className="w-4 h-4" />
                </button>

                {/* Content Container */}
                <div className="space-y-6">
                  {/* Header info */}
                  <div className="border-b border-black/5 dark:border-white/5 pb-4">
                    <span className="text-xs font-black uppercase tracking-widest opacity-60">
                      Open When Category: {selectedLetter.category}
                    </span>
                    <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight mt-1 leading-snug">
                      {selectedLetter.title}
                    </h2>
                    
                    <div className="flex items-center gap-2 mt-3 text-xs opacity-75 font-semibold">
                      <div className="w-6 h-6 rounded-full overflow-hidden bg-primary/10 border border-border">
                        {selectedLetter.userId?.avatar ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={selectedLetter.userId.avatar} alt={selectedLetter.userId.name} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center font-bold text-xs bg-primary/5">
                            {selectedLetter.userId?.name?.slice(0,1).toUpperCase()}
                          </div>
                        )}
                      </div>
                      <span>Written by {selectedLetter.userId?.name}</span>
                      <span>•</span>
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5" />
                        {format(new Date(selectedLetter.createdAt), "MMMM d, yyyy")}
                      </span>
                    </div>
                  </div>

                  {/* Body text content */}
                  <p className="text-lg sm:text-xl leading-relaxed whitespace-pre-wrap handwritten font-normal italic">
                    {selectedLetter.content}
                  </p>

                  {/* Attachment — Photos */}
                  {selectedLetter.photos && selectedLetter.photos.length > 0 && (
                    <div className="space-y-2 pt-4 border-t border-black/5 dark:border-white/5">
                      <span className="text-xs font-black uppercase tracking-wider opacity-60 block">Attached Photos</span>
                      <div className="grid grid-cols-2 gap-4">
                        {selectedLetter.photos.map((url: string, index: number) => (
                          <div key={index} className="relative rounded-xl overflow-hidden border border-black/5 shadow-xs aspect-video group">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={url} alt="Letter attachment" className="w-full h-full object-cover" />
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Attachment — Audio Voice Note */}
                  {selectedLetter.voiceNote && (
                    <div className="space-y-2 pt-4 border-t border-black/5 dark:border-white/5">
                      <span className="text-xs font-black uppercase tracking-wider opacity-60 flex items-center gap-1">
                        <Mic className="w-3 h-3" /> Voice Note Attachment
                      </span>
                      <AudioPlayer url={selectedLetter.voiceNote} className="bg-white/10 dark:bg-black/15 border-none" />
                    </div>
                  )}

                  {/* Attachment — Song Link */}
                  {selectedLetter.songLink && (
                    <div className="space-y-2 pt-4 border-t border-black/5 dark:border-white/5">
                      <span className="text-xs font-black uppercase tracking-wider opacity-60 flex items-center gap-1">
                        <Music className="w-3 h-3" /> Soundtrack for this mood
                      </span>
                      <a
                        href={selectedLetter.songLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/10 dark:bg-black/15 hover:bg-white/20 transition-all text-xs font-extrabold"
                      >
                        <Music className="w-3.5 h-3.5 text-primary" />
                        <span>Listen on Streaming Platform</span>
                      </a>
                    </div>
                  )}
                </div>

                {/* Footer close option */}
                <div className="pt-6 border-t border-black/5 dark:border-white/5 flex justify-end">
                  <button
                    onClick={() => setSelectedLetter(null)}
                    className="px-6 py-2 rounded-xl bg-black/10 hover:bg-black/20 text-xs font-bold transition-all cursor-pointer text-foreground"
                  >
                    Close Letter
                  </button>
                </div>

              </motion.div>
            </div>
          )}
        </AnimatePresence>

      </div>
    </PageTransition>
  );
}
