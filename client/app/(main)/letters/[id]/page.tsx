"use client";

import { useState, use, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  Trash2,
  Calendar,
  Gift,
  Music,
  Mic,
  Image as ImageIcon,
  Sparkles,
  Loader2,
  MailOpen,
  X,
} from "lucide-react";
import { format } from "date-fns";
import { PageTransition } from "@/components/animations/PageTransition";
import { AudioPlayer } from "@/components/voice/AudioPlayer";
import api from "@/lib/api";
import { useToastStore } from "@/stores/useToastStore";
import { useSoundEffects } from "@/hooks/useSoundEffects";
import { cn } from "@/lib/utils";

interface LetterDetailPageProps {
  params: Promise<{ id: string }>;
}

export default function LetterDetailPage({ params }: LetterDetailPageProps) {
  const { id } = use(params);
  const router = useRouter();
  const queryClient = useQueryClient();
  const showToast = useToastStore((s) => s.showToast);
  const { playSound } = useSoundEffects();

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isAnimatingOpen, setIsAnimatingOpen] = useState(false);
  const [showFullyOpen, setShowFullyOpen] = useState(false);

  // Fetch letter details
  const { data: letter, isLoading, error } = useQuery({
    queryKey: ["letter", id],
    queryFn: async () => {
      const res = await api.get(`/letters/${id}`);
      return res.data.data;
    },
  });

  // Unlock mutation (manual)
  const unlockMutation = useMutation({
    mutationFn: async () => {
      const res = await api.post(`/letters/${id}/unlock`);
      return res.data.data;
    },
    onSuccess: (updatedLetter) => {
      queryClient.setQueryData(["letter", id], updatedLetter);
      queryClient.invalidateQueries({ queryKey: ["letters"] });
      
      // Play envelope open animation
      setIsAnimatingOpen(true);
      playSound("chime");
      
      // Transition to open letter view after animation completes
      setTimeout(() => {
        setShowFullyOpen(true);
        setIsAnimatingOpen(false);
      }, 1600);
    },
    onError: () => {
      showToast("Failed to unlock letter. Please try again.", "error");
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async () => {
      await api.delete(`/letters/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["letters"] });
      showToast("Letter deleted successfully.", "success");
      router.push("/letters");
    },
    onError: () => {
      showToast("Failed to delete letter.", "error");
    },
  });

  // Automatically show open letter if it's already unlocked
  useEffect(() => {
    if (letter?.isUnlocked) {
      setShowFullyOpen(true);
    }
  }, [letter]);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-muted-foreground gap-3">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
        <p className="text-sm font-medium">Unsealing envelope...</p>
      </div>
    );
  }

  if (error || !letter) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center space-y-4">
        <span className="text-5xl">⚠️</span>
        <h2 className="text-lg font-bold">Letter not found</h2>
        <button
          onClick={() => router.push("/letters")}
          className="px-4 py-2 bg-primary text-primary-foreground font-semibold text-xs rounded-xl"
        >
          Back to Letters
        </button>
      </div>
    );
  }

  const handleManualUnlock = () => {
    playSound("tap");
    unlockMutation.mutate();
  };

  return (
    <PageTransition>
      <div className="max-w-2xl mx-auto space-y-6 pb-12 px-4 sm:px-0">
        
        {/* Header navigation bar */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.back()}
              className="p-2 rounded-xl bg-card border border-border text-muted-foreground hover:text-foreground transition-all cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <h1 className="text-xl font-bold tracking-tight text-foreground truncate max-w-[240px]">
              {letter.title}
            </h1>
          </div>

          <button
            onClick={() => {
              playSound("tap");
              setShowDeleteConfirm(true);
            }}
            className="p-2 rounded-xl border border-border bg-card text-muted-foreground hover:text-destructive hover:border-destructive/30 transition-all cursor-pointer"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>

        {/* Outer Perspective Box for 3D Envelope Fold */}
        {!showFullyOpen ? (
          <div className="flex flex-col items-center justify-center py-12 text-center space-y-8">
            
            {/* The 3D Animated Envelope Container */}
            <div 
              style={{ perspective: "1200px" }}
              className="w-full max-w-md aspect-[1.58] relative flex items-center justify-center overflow-visible"
            >
              {/* Backside flap & base pocket */}
              <div className="absolute inset-0 bg-[#E0D9D0] dark:bg-[#2B2635] rounded-2xl shadow-xl border border-[#D5CDC3] dark:border-[#383144] overflow-visible" />
              
              {/* Triangular Front Pocket Cover (Z-index 25) */}
              <div 
                className="absolute inset-0 z-25 bg-[#D2CAC0] dark:bg-[#241F2D] rounded-2xl border-t border-white/5"
                style={{
                  clipPath: "polygon(0% 100%, 100% 100%, 100% 30%, 50% 65%, 0% 30%)",
                }}
              />

              {/* Top Flap (Z-index 30, Rotates on X-axis) */}
              <motion.div
                initial={{ rotateX: 0 }}
                animate={{ rotateX: isAnimatingOpen ? 180 : 0 }}
                transition={{ duration: 0.8, ease: [0.4, 0, 0.2, 1] }}
                style={{ 
                  transformOrigin: "top",
                  clipPath: "polygon(0% 0%, 100% 0%, 50% 65%)",
                }}
                className="absolute inset-0 bg-[#E8E1D9] dark:bg-[#342D3E] rounded-t-2xl z-30 shadow-sm border-b border-black/5"
              />

              {/* The Letter Paper inside (Z-index 10, slides out to Z-index 40) */}
              <motion.div
                initial={{ y: 8, scale: 0.94, zIndex: 10, opacity: 0.95 }}
                animate={
                  isAnimatingOpen 
                    ? { y: -160, scale: 1.02, zIndex: 40, opacity: 1 } 
                    : { y: 8, scale: 0.94, zIndex: 10, opacity: 0.95 }
                }
                transition={{ delay: 0.4, duration: 0.7, ease: "easeOut" }}
                className="absolute w-[92%] h-[85%] bg-[#FAF9F6] dark:bg-zinc-800 text-zinc-800 dark:text-zinc-100 p-5 rounded-xl shadow-md border border-[#F0EFEA] dark:border-zinc-700/40 flex flex-col justify-between"
              >
                <div className="space-y-1.5 text-left">
                  <div className="h-2 w-12 bg-primary/20 rounded-full" />
                  <div className="h-4 w-3/4 bg-foreground/10 rounded-md" />
                  <div className="space-y-1 pt-1">
                    <div className="h-3 w-full bg-muted/60 rounded-md" />
                    <div className="h-3 w-5/6 bg-muted/60 rounded-md" />
                  </div>
                </div>
                <div className="flex justify-between items-center text-[10px] uppercase tracking-wider font-extrabold opacity-40">
                  <span>To: My Love</span>
                  <span>From: {letter.userId?.name}</span>
                </div>
              </motion.div>

              {/* Center Lock Badge overlay (Z-index 35) */}
              <AnimatePresence>
                {!isAnimatingOpen && (
                  <motion.div 
                    exit={{ scale: 0, opacity: 0 }}
                    transition={{ duration: 0.3 }}
                    className="absolute z-35 bg-card/90 backdrop-blur-xs border border-border shadow-md px-4 py-2.5 rounded-full flex items-center gap-2"
                  >
                    <span className="text-lg">🔒</span>
                    <span className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">
                      Locked Letter
                    </span>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Lock Details Info */}
            <div className="space-y-4 max-w-sm w-full">
              {letter.unlockType === "date" && letter.unlockDate && (
                <div className="p-4 bg-rose-50/50 dark:bg-rose-950/10 border border-rose-100 dark:border-rose-950/30 rounded-2xl">
                  <p className="text-xs text-rose-500 font-semibold flex items-center justify-center gap-1.5">
                    <Calendar className="w-4 h-4" />
                    Locked until {format(new Date(letter.unlockDate), "MMMM d, yyyy")}
                  </p>
                </div>
              )}

              {letter.unlockType === "event" && letter.unlockEvent && (
                <div className="p-4 bg-rose-50/50 dark:bg-rose-950/10 border border-rose-100 dark:border-rose-950/30 rounded-2xl">
                  <p className="text-xs text-rose-500 font-semibold flex items-center justify-center gap-1.5">
                    <Gift className="w-4 h-4" />
                    Unlock condition: {letter.unlockEvent}
                  </p>
                </div>
              )}

              {letter.unlockType === "manual" && !isAnimatingOpen && (
                <div className="space-y-3">
                  <p className="text-xs text-muted-foreground italic handwritten text-sm">
                    This letter requires manual unlock. Ready to break the seal?
                  </p>
                  <button
                    onClick={handleManualUnlock}
                    disabled={unlockMutation.isPending}
                    className="px-6 py-3 bg-gradient-to-r from-primary to-accent text-primary-foreground font-extrabold text-xs rounded-xl shadow-md hover:shadow-lg transition-all inline-flex items-center gap-1.5 cursor-pointer hover:scale-[1.02]"
                  >
                    {unlockMutation.isPending ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <>
                        <Sparkles className="w-3.5 h-3.5" />
                        Unlock & Read
                      </>
                    )}
                  </button>
                </div>
              )}
            </div>
          </div>
        ) : (
          /* Opened Handwritten Letter View (If Unlocked) */
          <motion.div 
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ type: "spring", stiffness: 260, damping: 25 }}
            className="space-y-6"
          >
            <div className="bg-[#FAF9F6] dark:bg-zinc-800 text-zinc-800 dark:text-zinc-50 border border-[#F0EFEA] dark:border-zinc-700/50 shadow-lg rounded-2xl p-8 sm:p-12 relative overflow-hidden">
              {/* Paper margin line decoration */}
              <div className="absolute left-0 top-0 bottom-0 w-[1px] bg-red-200/50 dark:bg-red-900/30 ml-8 sm:ml-12" />

              {/* Letter Header */}
              <div className="relative pl-6 sm:pl-10 space-y-2 mb-6 border-b border-zinc-200/50 dark:border-zinc-700/50 pb-4">
                <span className="text-[10px] text-muted-foreground uppercase tracking-widest font-semibold flex items-center gap-1">
                  <MailOpen className="w-3.5 h-3.5" />
                  Sealed {format(new Date(letter.createdAt), "MMMM d, yyyy")}
                </span>
                <h2 className="text-xl sm:text-2xl font-black tracking-tight leading-snug">{letter.title}</h2>
                <span className="text-xs text-muted-foreground handwritten text-base block mt-2">
                  Dear Partner,
                </span>
              </div>

              {/* Letter Content */}
              <div className="relative pl-6 sm:pl-10 leading-relaxed text-lg sm:text-xl font-normal text-zinc-900 dark:text-zinc-100 whitespace-pre-wrap handwritten min-h-[25vh]">
                {letter.content}
              </div>

              {/* Letter Footer */}
              <div className="relative pl-6 sm:pl-10 mt-8 pt-4 border-t border-zinc-200/50 dark:border-zinc-700/50 text-right">
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-extrabold">Written with love by</p>
                <p className="font-black text-sm text-foreground">{letter.userId?.name}</p>
              </div>
            </div>

            {/* Media attachments */}
            {((letter.photos && letter.photos.length > 0) || letter.voiceNote || letter.songLink) && (
              <div className="glass rounded-2xl p-6 space-y-5 border border-border/40">
                <h3 className="text-xs font-black uppercase tracking-wider text-muted-foreground flex items-center gap-1 border-b border-border/40 pb-2">
                  📎 Letter Attachments
                </h3>

                {/* Attached photos */}
                {letter.photos && letter.photos.length > 0 && (
                  <div className="space-y-2">
                    <span className="text-[10px] font-black text-muted-foreground uppercase flex items-center gap-1">
                      <ImageIcon className="w-3.5 h-3.5" />
                      Photos
                    </span>
                    <div className="grid grid-cols-2 gap-4">
                      {letter.photos.map((url: string, idx: number) => (
                        <div
                          key={url}
                          className="aspect-video rounded-xl overflow-hidden border border-border/50 relative shadow-sm group"
                        >
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={url}
                            alt={`Attachment ${idx}`}
                            className="w-full h-full object-cover group-hover:scale-[1.02] transition-transform duration-300"
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Attached voice note */}
                {letter.voiceNote && (
                  <div className="space-y-2">
                    <span className="text-[10px] font-black text-muted-foreground uppercase flex items-center gap-1">
                      <Mic className="w-3.5 h-3.5 animate-pulse" />
                      Voice Note
                    </span>
                    <AudioPlayer url={letter.voiceNote} sender={letter.userId?.name} />
                  </div>
                )}

                {/* Attached Song link */}
                {letter.songLink && (
                  <div className="space-y-2">
                    <span className="text-[10px] font-black text-muted-foreground uppercase flex items-center gap-1">
                      <Music className="w-3.5 h-3.5" />
                      Soundtrack
                    </span>
                    <a
                      href={letter.songLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 p-3.5 bg-muted/40 border border-border rounded-xl hover:bg-muted text-xs font-semibold text-foreground transition-all"
                    >
                      <Music className="w-4 h-4 text-primary fill-primary animate-pulse-soft" />
                      <span className="truncate flex-1 font-bold">{letter.songLink}</span>
                      <span className="text-[10px] text-primary uppercase font-black tracking-wider">
                        Listen
                      </span>
                    </a>
                  </div>
                )}
              </div>
            )}
          </motion.div>
        )}

        {/* Cozy Delete Confirm Dialog */}
        {showDeleteConfirm && (
          <div className="fixed inset-0 bg-black/45 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in-up">
            <div className="bg-card w-full max-w-sm rounded-2xl border border-border p-6 shadow-xl space-y-4">
              <h3 className="font-extrabold text-foreground text-base">Delete this letter?</h3>
              <p className="text-xs text-muted-foreground">
                This action is permanent and cannot be undone. This letter will be lost forever.
              </p>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  onClick={() => {
                    playSound("tap");
                    setShowDeleteConfirm(false);
                  }}
                  className="px-4 py-2 text-xs font-semibold border border-border rounded-xl hover:bg-muted cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    playSound("tap");
                    setShowDeleteConfirm(false);
                    deleteMutation.mutate();
                  }}
                  disabled={deleteMutation.isPending}
                  className="px-4 py-2 text-xs font-semibold bg-destructive text-destructive-foreground rounded-xl hover:bg-destructive/90 flex items-center gap-1 cursor-pointer"
                >
                  {deleteMutation.isPending ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    "Delete"
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </PageTransition>
  );
}
