"use client";

import { useState, use } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Trash2, Calendar, Music, Sparkles, Loader2, Heart } from "lucide-react";
import { format } from "date-fns";
import { PageTransition } from "@/components/animations/PageTransition";
import api from "@/lib/api";
import { cn } from "@/lib/utils";

interface CategoryPageProps {
  params: Promise<{ category: string }>;
}

export default function CategoryPage({ params }: CategoryPageProps) {
  const { category: rawCategory } = use(params);
  const category = decodeURIComponent(rawCategory);
  const router = useRouter();
  const queryClient = useQueryClient();

  const [activeLetterId, setActiveLetterId] = useState<string | null>(null);

  // Fetch Open When letters for this category
  const { data: letters = [], isLoading } = useQuery({
    queryKey: ["open-when-category", category],
    queryFn: async () => {
      const res = await api.get(`/open-when/category/${encodeURIComponent(category)}`);
      return res.data.data;
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/open-when/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["open-when-category", category] });
      queryClient.invalidateQueries({ queryKey: ["open-when"] });
      setActiveLetterId(null);
    },
  });

  const activeLetter = letters.find((l: any) => l._id === activeLetterId);

  const getPaperBgStyle = (bgValue: string) => {
    switch (bgValue) {
      case "pink":
        return "bg-rose-50/95 dark:bg-rose-950/20 text-rose-900 dark:text-rose-100 border-rose-200/50 dark:border-rose-900/40";
      case "lavender":
        return "bg-purple-50/95 dark:bg-purple-950/20 text-purple-900 dark:text-purple-100 border-purple-200/50 dark:border-purple-900/40";
      case "sage":
        return "bg-emerald-50/95 dark:bg-emerald-950/20 text-emerald-900 dark:text-emerald-100 border-emerald-200/50 dark:border-emerald-900/40";
      case "peach":
      default:
        return "bg-orange-50/95 dark:bg-orange-950/20 text-orange-900 dark:text-orange-100 border-orange-200/50 dark:border-orange-900/40";
    }
  };

  const handleDelete = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm("Are you sure you want to delete this open when letter? This action cannot be undone.")) {
      deleteMutation.mutate(id);
    }
  };

  return (
    <PageTransition>
      <div className="space-y-6">
        {/* Navigation header */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.back()}
            className="p-2 rounded-xl bg-card border border-border text-muted-foreground hover:text-foreground transition-all"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">Open When: {category}</h1>
            <p className="text-xs text-muted-foreground">Letters written to comfort and cheer you up.</p>
          </div>
        </div>

        {/* Letters list */}
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-20 text-muted-foreground gap-3">
            <Loader2 className="w-8 h-8 text-primary animate-spin" />
            <p className="text-sm font-medium">Opening chest...</p>
          </div>
        ) : letters.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center glass rounded-2xl border border-border/40 p-8 space-y-2">
            <span className="text-5xl">💊</span>
            <h3 className="text-lg font-bold text-foreground">Cabinet empty</h3>
            <p className="text-sm text-muted-foreground max-w-sm">
              No letters written for this feeling yet. Write one to add to this cabinet!
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Letters sidebar (Column 1) */}
            <div className="md:col-span-1 space-y-3">
              {letters.map((l: any) => {
                const isActive = l._id === activeLetterId;
                const formattedDate = format(new Date(l.createdAt), "MMM d, yyyy");
                
                return (
                  <div
                    key={l._id}
                    onClick={() => setActiveLetterId(l._id)}
                    className={cn(
                      "p-4 rounded-xl border cursor-pointer transition-all flex flex-col justify-between hover:shadow-xs",
                      isActive
                        ? "bg-primary border-primary text-primary-foreground"
                        : "bg-card border-border hover:border-primary/50 text-foreground"
                    )}
                  >
                    <div className="space-y-1">
                      <h4 className="font-bold text-sm line-clamp-1">{l.title}</h4>
                      <p className={cn("text-[10px]", isActive ? "text-white/80" : "text-muted-foreground")}>
                        Written by {l.userId?.name}
                      </p>
                    </div>
                    <div className="flex justify-between items-center mt-3 pt-2 border-t border-black/5 text-[9px] opacity-80">
                      <span>{formattedDate}</span>
                      <button
                        onClick={(e) => handleDelete(l._id, e)}
                        className={cn("p-1 rounded hover:bg-black/10 transition-colors", isActive ? "text-white" : "text-muted-foreground hover:text-destructive")}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Reading Board (Column 2 & 3) */}
            <div className="md:col-span-2">
              {activeLetter ? (
                <div
                  className={cn(
                    "border rounded-2xl p-6 sm:p-10 shadow-lg min-h-[50vh] relative overflow-hidden transition-all duration-300",
                    getPaperBgStyle(activeLetter.customBackground)
                  )}
                >
                  {/* Paper line decoration */}
                  <div className="absolute left-0 top-0 bottom-0 w-[1px] bg-red-200/50 dark:bg-red-900/30 ml-8 sm:ml-10" />

                  {/* Letter Header */}
                  <div className="relative pl-6 sm:pl-8 space-y-1 mb-6 border-b border-black/5 pb-4">
                    <span className="text-[9px] uppercase tracking-widest font-semibold opacity-75">
                      Sealed {format(new Date(activeLetter.createdAt), "MMMM d, yyyy")}
                    </span>
                    <h2 className="text-xl font-bold tracking-tight">{activeLetter.title}</h2>
                    <span className="text-sm italic handwritten block mt-2">
                      Dear Partner,
                    </span>
                  </div>

                  {/* Letter Content */}
                  <div className="relative pl-6 sm:pl-8 leading-relaxed text-base sm:text-lg font-medium whitespace-pre-wrap handwritten min-h-[20vh]">
                    {activeLetter.content}
                  </div>

                  {/* Letter Attachments */}
                  {((activeLetter.photos && activeLetter.photos.length > 0) || activeLetter.songLink) && (
                    <div className="relative pl-6 sm:pl-8 mt-6 pt-6 border-t border-black/5 space-y-4">
                      {/* Attached Photos */}
                      {activeLetter.photos && activeLetter.photos.length > 0 && (
                        <div className="space-y-1.5">
                          <span className="text-[10px] font-bold uppercase tracking-wider opacity-75">Attached Photos</span>
                          <div className="grid grid-cols-2 gap-3 max-w-md">
                            {activeLetter.photos.map((url: string, idx: number) => (
                              <div key={url} className="aspect-square rounded-xl overflow-hidden border border-black/5">
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img src={url} alt={`Attachment ${idx}`} className="w-full h-full object-cover" />
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Song link */}
                      {activeLetter.songLink && (
                        <div className="space-y-1.5">
                          <span className="text-[10px] font-bold uppercase tracking-wider opacity-75">Soundtrack</span>
                          <a
                            href={activeLetter.songLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-2 px-4 py-2 bg-white/40 dark:bg-black/20 border border-black/5 rounded-xl hover:bg-white/60 text-xs font-semibold transition-all max-w-sm w-full"
                          >
                            <Music className="w-4 h-4 text-primary fill-primary" />
                            <span className="truncate flex-1">{activeLetter.songLink}</span>
                          </a>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Letter Footer */}
                  <div className="relative pl-6 sm:pl-8 mt-8 pt-4 border-t border-black/5 text-right">
                    <p className="text-[10px] opacity-75">Always here for you,</p>
                    <p className="font-bold text-xs">{activeLetter.userId?.name}</p>
                  </div>
                </div>
              ) : (
                <div className="glass border border-border/40 rounded-2xl flex flex-col items-center justify-center p-8 text-center min-h-[50vh] text-muted-foreground space-y-2">
                  <span className="text-4xl animate-pulse-soft">💌</span>
                  <h4 className="font-semibold text-foreground text-sm">No letter selected</h4>
                  <p className="text-sm max-w-xs text-muted-foreground">
                    Select a letter from the cabinet on the left to read words of comfort.
                  </p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </PageTransition>
  );
}
