"use client";

import { useState, use } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Trash2, Calendar, Gift, Music, Mic, Image as ImageIcon, Sparkles, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { PageTransition } from "@/components/animations/PageTransition";
import { AudioPlayer } from "@/components/voice/AudioPlayer";
import api from "@/lib/api";
import { cn } from "@/lib/utils";

interface LetterDetailPageProps {
  params: Promise<{ id: string }>;
}

export default function LetterDetailPage({ params }: LetterDetailPageProps) {
  const { id } = use(params);
  const router = useRouter();
  const queryClient = useQueryClient();
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

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
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async () => {
      await api.delete(`/letters/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["letters"] });
      router.push("/letters");
    },
  });

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
    if (confirm("Are you ready to unlock and open this letter? ❤️")) {
      unlockMutation.mutate();
    }
  };

  return (
    <PageTransition>
      <div className="max-w-2xl mx-auto space-y-6 pb-12">
        {/* Header navigation bar */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.back()}
              className="p-2 rounded-xl bg-card border border-border text-muted-foreground hover:text-foreground transition-all"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <h1 className="text-xl font-bold tracking-tight text-foreground truncate max-w-[240px]">
              {letter.title}
            </h1>
          </div>

          <button
            onClick={() => setShowDeleteConfirm(true)}
            className="p-2 rounded-xl border border-border bg-card text-muted-foreground hover:text-destructive hover:border-destructive/30 transition-all"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>

        {/* Closed Envelope view (If Locked) */}
        {!letter.isUnlocked ? (
          <div className="flex flex-col items-center justify-center py-16 text-center space-y-6">
            <div className="w-full max-w-sm aspect-[1.6] bg-[#E3DCD5] dark:bg-[#2C2736] rounded-xl shadow-md border border-[#D5CEC7] dark:border-[#383245] relative flex items-center justify-center">
              {/* Flap fold design */}
              <div className="absolute left-0 right-0 top-0 h-1/2 bg-[#DDD6CE] dark:bg-[#342E3F] [clip-path:polygon(0_0,_50%_100%,_100%_0)] rounded-t-xl z-20 border-b border-black/5" />
              <div className="z-30 text-center px-4 space-y-2">
                <span className="text-4xl block animate-bounce-slow">🔒</span>
                <span className="text-xs font-bold text-muted-foreground block">
                  Written by {letter.userId?.name || "Partner"}
                </span>
              </div>
            </div>

            {/* Lock Details Info */}
            <div className="space-y-4 max-w-sm">
              {letter.unlockType === "date" && letter.unlockDate && (
                <div className="p-4 bg-rose-50/50 dark:bg-rose-950/10 border border-rose-100 dark:border-rose-950/30 rounded-2xl">
                  <p className="text-xs text-rose-500 font-semibold flex items-center justify-center gap-1">
                    <Calendar className="w-4 h-4" />
                    Locked until {format(new Date(letter.unlockDate), "MMMM d, yyyy")}
                  </p>
                </div>
              )}

              {letter.unlockType === "event" && letter.unlockEvent && (
                <div className="p-4 bg-rose-50/50 dark:bg-rose-950/10 border border-rose-100 dark:border-rose-950/30 rounded-2xl">
                  <p className="text-xs text-rose-500 font-semibold flex items-center justify-center gap-1">
                    <Gift className="w-4 h-4" />
                    Unlock condition: {letter.unlockEvent}
                  </p>
                </div>
              )}

              {letter.unlockType === "manual" && (
                <div className="space-y-3">
                  <p className="text-xs text-muted-foreground italic handwritten text-sm">
                    This letter requires manual unlock. Ready to break the seal?
                  </p>
                  <button
                    onClick={handleManualUnlock}
                    disabled={unlockMutation.isPending}
                    className="px-6 py-2.5 bg-primary text-primary-foreground font-semibold text-xs rounded-xl hover:bg-primary-hover shadow-sm hover:shadow-md transition-all inline-flex items-center gap-1.5"
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
          <div className="space-y-6">
            <div className="bg-[#FAF9F6] dark:bg-zinc-800 text-zinc-800 dark:text-zinc-50 border border-[#F0EFEA] dark:border-zinc-700/50 shadow-lg rounded-2xl p-8 sm:p-12 relative overflow-hidden">
              {/* Paper line decorations */}
              <div className="absolute left-0 top-0 bottom-0 w-[1px] bg-red-200/50 dark:bg-red-900/30 ml-8 sm:ml-12" />

              {/* Letter Header */}
              <div className="relative pl-6 sm:pl-10 space-y-2 mb-6 border-b border-zinc-200/50 dark:border-zinc-700/50 pb-4">
                <span className="text-[10px] text-muted-foreground uppercase tracking-widest font-semibold">
                  Sealed {format(new Date(letter.createdAt), "MMMM d, yyyy")}
                </span>
                <h2 className="text-xl font-bold tracking-tight">{letter.title}</h2>
                <span className="text-xs text-muted-foreground handwritten text-base block">
                  Dear Partner,
                </span>
              </div>

              {/* Letter Content */}
              <div className="relative pl-6 sm:pl-10 leading-relaxed text-lg sm:text-xl font-medium text-zinc-900 dark:text-zinc-100 whitespace-pre-wrap handwritten min-h-[25vh]">
                {letter.content}
              </div>

              {/* Letter Footer */}
              <div className="relative pl-6 sm:pl-10 mt-8 pt-4 border-t border-zinc-200/50 dark:border-zinc-700/50 text-right">
                <p className="text-xs text-muted-foreground">Written with love by</p>
                <p className="font-bold text-sm text-foreground">{letter.userId?.name}</p>
              </div>
            </div>

            {/* Media attachments */}
            {((letter.photos && letter.photos.length > 0) || letter.voiceNote || letter.songLink) && (
              <div className="glass rounded-2xl p-6 space-y-5">
                <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Letter Attachments
                </h3>

                {/* Attached photos */}
                {letter.photos && letter.photos.length > 0 && (
                  <div className="space-y-1.5">
                    <span className="text-[10px] font-semibold text-muted-foreground uppercase flex items-center gap-1">
                      <ImageIcon className="w-3.5 h-3.5" />
                      Photos
                    </span>
                    <div className="grid grid-cols-2 gap-3">
                      {letter.photos.map((url: string, idx: number) => (
                        <div
                          key={url}
                          className="aspect-square rounded-xl overflow-hidden border border-border"
                        >
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={url}
                            alt={`Attachment ${idx}`}
                            className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Attached voice note */}
                {letter.voiceNote && (
                  <div className="space-y-1.5">
                    <span className="text-[10px] font-semibold text-muted-foreground uppercase flex items-center gap-1">
                      <Mic className="w-3.5 h-3.5" />
                      Voice Note
                    </span>
                    <AudioPlayer url={letter.voiceNote} sender={letter.userId?.name} />
                  </div>
                )}

                {/* Attached Song link */}
                {letter.songLink && (
                  <div className="space-y-1.5">
                    <span className="text-[10px] font-semibold text-muted-foreground uppercase flex items-center gap-1">
                      <Music className="w-3.5 h-3.5" />
                      Spotify / YouTube Song
                    </span>
                    <a
                      href={letter.songLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 p-3 bg-muted/50 border border-border rounded-xl hover:bg-muted text-xs font-semibold text-foreground transition-all"
                    >
                      <Music className="w-4 h-4 text-primary fill-primary animate-pulse-soft" />
                      <span className="truncate flex-1">{letter.songLink}</span>
                      <span className="text-[10px] text-primary uppercase font-bold tracking-wider">
                        Listen
                      </span>
                    </a>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Delete Confirm Dialog */}
        {showDeleteConfirm && (
          <div className="fixed inset-0 bg-black/45 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in-up">
            <div className="bg-card w-full max-w-sm rounded-2xl border border-border p-6 shadow-xl space-y-4">
              <h3 className="font-bold text-foreground text-base">Delete this letter?</h3>
              <p className="text-xs text-muted-foreground">
                This action is permanent and cannot be undone. This letter will be lost forever.
              </p>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  className="px-4 py-2 text-xs font-semibold border border-border rounded-xl hover:bg-muted"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    setShowDeleteConfirm(false);
                    deleteMutation.mutate();
                  }}
                  disabled={deleteMutation.isPending}
                  className="px-4 py-2 text-xs font-semibold bg-destructive text-destructive-foreground rounded-xl hover:bg-destructive/90 flex items-center gap-1"
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
