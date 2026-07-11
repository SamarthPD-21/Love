"use client";

import { useState, use } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  Calendar,
  MapPin,
  Smile,
  Heart,
  Trash2,
  Tag,
  Loader2,
  Send,
  User as UserIcon,
} from "lucide-react";
import { format } from "date-fns";
import { PageTransition } from "@/components/animations/PageTransition";
import api from "@/lib/api";
import { useAuthStore } from "@/stores/useAuthStore";
import { cn } from "@/lib/utils";

interface MemoryDetailPageProps {
  params: Promise<{ id: string }>;
}

export default function MemoryDetailPage({ params }: MemoryDetailPageProps) {
  const { id } = use(params);
  const router = useRouter();
  const queryClient = useQueryClient();
  const currentUser = useAuthStore((s) => s.user);

  const [commentText, setCommentText] = useState("");
  const [activePhotoIdx, setActivePhotoIdx] = useState(0);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Fetch memory details
  const { data: memory, isLoading, error } = useQuery({
    queryKey: ["memory", id],
    queryFn: async () => {
      const res = await api.get(`/memories/${id}`);
      return res.data.data;
    },
  });

  // Toggle favorite mutation
  const favoriteMutation = useMutation({
    mutationFn: async () => {
      const res = await api.post(`/memories/${id}/favorite`);
      return res.data.data;
    },
    onSuccess: (updatedMemory) => {
      queryClient.setQueryData(["memory", id], updatedMemory);
      queryClient.invalidateQueries({ queryKey: ["memories"] });
    },
  });

  // Delete memory mutation
  const deleteMutation = useMutation({
    mutationFn: async () => {
      await api.delete(`/memories/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["memories"] });
      router.push("/memories");
    },
  });

  // Add comment mutation
  const commentMutation = useMutation({
    mutationFn: async (text: string) => {
      const res = await api.post(`/memories/${id}/comments`, { text });
      return res.data.data;
    },
    onSuccess: (updatedComments) => {
      queryClient.setQueryData(["memory", id], (prev: any) => ({
        ...prev,
        comments: updatedComments,
      }));
      setCommentText("");
    },
  });

  // Delete comment mutation
  const deleteCommentMutation = useMutation({
    mutationFn: async (commentId: string) => {
      const res = await api.delete(`/memories/${id}/comments/${commentId}`);
      return res.data.data;
    },
    onSuccess: (updatedComments) => {
      queryClient.setQueryData(["memory", id], (prev: any) => ({
        ...prev,
        comments: updatedComments,
      }));
    },
  });

  const handleSendComment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentText.trim()) return;
    commentMutation.mutate(commentText);
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-muted-foreground gap-3">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
        <p className="text-sm font-medium">Opening your scrapbook...</p>
      </div>
    );
  }

  if (error || !memory) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center space-y-4">
        <span className="text-5xl">⚠️</span>
        <h2 className="text-lg font-bold">Memory not found</h2>
        <button
          onClick={() => router.push("/memories")}
          className="px-4 py-2 bg-primary text-primary-foreground font-semibold text-xs rounded-xl"
        >
          Go Back to Memories
        </button>
      </div>
    );
  }

  // Media URLs combo (photos + videos)
  const allMedia = [...(memory.photos || []), ...(memory.videos || [])];
  const isVideo = (url: string) => {
    const ext = url.split(".").pop()?.toLowerCase();
    return ["mp4", "webm", "ogg", "mov"].includes(ext || "");
  };

  return (
    <PageTransition>
      <div className="max-w-3xl mx-auto space-y-6">
        {/* Header navigation bar */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.back()}
              className="p-2 rounded-xl bg-card border border-border text-muted-foreground hover:text-foreground transition-all"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <h1 className="text-xl font-bold tracking-tight text-foreground truncate max-w-[200px] sm:max-w-md">
              {memory.title}
            </h1>
          </div>

          <div className="flex items-center gap-2">
            {/* Toggle Favorite */}
            <button
              onClick={() => favoriteMutation.mutate()}
              disabled={favoriteMutation.isPending}
              className={cn(
                "p-2 rounded-xl border border-border transition-all",
                memory.favorite
                  ? "bg-rose-50 border-rose-200 text-rose-500 dark:bg-rose-950/20"
                  : "bg-card text-muted-foreground hover:text-rose-500"
              )}
            >
              <Heart className={cn("w-4 h-4", memory.favorite && "fill-rose-500")} />
            </button>

            {/* Delete Memory */}
            <button
              onClick={() => setShowDeleteConfirm(true)}
              className="p-2 rounded-xl border border-border bg-card text-muted-foreground hover:text-destructive hover:border-destructive/30 transition-all"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Media Viewer / Carousel */}
        {allMedia.length > 0 && (
          <div className="space-y-3">
            {/* Main Showcase Window */}
            <div className="aspect-[4/3] sm:aspect-[16/10] bg-zinc-900 rounded-2xl overflow-hidden relative border border-border">
              {isVideo(allMedia[activePhotoIdx]) ? (
                <video
                  src={allMedia[activePhotoIdx]}
                  controls
                  className="w-full h-full object-contain"
                />
              ) : (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={allMedia[activePhotoIdx]}
                  alt={`${memory.title} media`}
                  className="w-full h-full object-contain"
                />
              )}
            </div>

            {/* Thumbnails (if multiple media elements exist) */}
            {allMedia.length > 1 && (
              <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-none">
                {allMedia.map((url, idx) => (
                  <button
                    key={url}
                    onClick={() => setActivePhotoIdx(idx)}
                    className={cn(
                      "relative w-16 h-16 rounded-xl overflow-hidden border-2 flex-shrink-0 transition-all",
                      idx === activePhotoIdx ? "border-primary scale-95" : "border-transparent opacity-60"
                    )}
                  >
                    {isVideo(url) ? (
                      <div className="w-full h-full bg-slate-800 flex items-center justify-center">
                        <video src={url} className="w-full h-full object-cover" muted />
                      </div>
                    ) : (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={url} alt="thumbnail" className="w-full h-full object-cover" />
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Story details layout */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Main Story & Comments (Col Span 2) */}
          <div className="md:col-span-2 space-y-6">
            {/* Memory Story details */}
            <div className="glass rounded-2xl p-6 sm:p-8 space-y-4">
              <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">The Story</h2>
              {memory.story ? (
                <p className="text-base sm:text-lg leading-relaxed text-foreground/90 whitespace-pre-wrap handwritten text-xl">
                  {memory.story}
                </p>
              ) : (
                <p className="text-sm text-muted-foreground italic">No story written for this memory yet.</p>
              )}

              {/* Tags */}
              {memory.tags && memory.tags.length > 0 && (
                <div className="flex flex-wrap gap-1.5 pt-4 border-t border-border/50">
                  {memory.tags.map((tag: string) => (
                    <span
                      key={tag}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-muted text-muted-foreground text-xs font-semibold"
                    >
                      <Tag className="w-3 h-3" />
                      {tag}
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Comments Section */}
            <div className="glass rounded-2xl p-6 space-y-4">
              <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                Comments ({memory.comments?.length || 0})
              </h2>

              {/* Comments list */}
              <div className="space-y-4 max-h-72 overflow-y-auto pr-1">
                {memory.comments?.length === 0 ? (
                  <p className="text-xs text-muted-foreground italic text-center py-4">
                    No comments yet. Leave a sweet note!
                  </p>
                ) : (
                  memory.comments?.map((comment: any) => {
                    const isOwnComment = comment.userId?._id === currentUser?._id;
                    return (
                      <div key={comment._id} className="flex gap-3 text-sm group">
                        {/* Avatar */}
                        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center overflow-hidden flex-shrink-0">
                          {comment.userId?.avatar ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={comment.userId.avatar}
                              alt={comment.userId.name}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <UserIcon className="w-4 h-4 text-primary" />
                          )}
                        </div>

                        {/* Comment box */}
                        <div className="flex-1 bg-muted/40 rounded-xl p-3 relative">
                          <div className="flex items-center justify-between gap-2 mb-1">
                            <span className="font-semibold text-xs text-foreground">
                              {comment.userId?.name}
                            </span>
                            <span className="text-[10px] text-muted-foreground">
                              {format(new Date(comment.createdAt), "MMM d, h:mm a")}
                            </span>
                          </div>
                          <p className="text-xs text-foreground/90 whitespace-pre-wrap">{comment.text}</p>

                          {/* Delete comment */}
                          {isOwnComment && (
                            <button
                              onClick={() => deleteCommentMutation.mutate(comment._id)}
                              className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition-opacity duration-200"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Add Comment input */}
              <form onSubmit={handleSendComment} className="flex gap-2 pt-2 border-t border-border/50">
                <input
                  type="text"
                  placeholder="Write a sweet note..."
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  className="flex-1 px-4 py-2 bg-background rounded-xl border border-border focus:outline-none focus:ring-2 focus:ring-ring text-xs"
                />
                <button
                  type="submit"
                  disabled={commentMutation.isPending || !commentText.trim()}
                  className="p-2 bg-primary text-primary-foreground rounded-xl hover:bg-primary-hover disabled:opacity-50 transition-colors"
                >
                  <Send className="w-4 h-4" />
                </button>
              </form>
            </div>
          </div>

          {/* Sidebar Metadata (Col Span 1) */}
          <div className="space-y-4">
            <div className="glass rounded-2xl p-5 space-y-4">
              <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Memory Info</h3>
              
              {/* Date */}
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                  <Calendar className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-[10px] text-muted-foreground font-semibold uppercase">Date</p>
                  <p className="text-xs font-medium text-foreground">
                    {format(new Date(memory.date), "MMMM d, yyyy")}
                  </p>
                </div>
              </div>

              {/* Location */}
              {memory.location && (
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-accent/15 flex items-center justify-center text-accent-foreground">
                    <MapPin className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-[10px] text-muted-foreground font-semibold uppercase">Location</p>
                    <p className="text-xs font-medium text-foreground">{memory.location}</p>
                  </div>
                </div>
              )}

              {/* Mood */}
              {memory.mood && (
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-warm/15 flex items-center justify-center text-warm-foreground">
                    <Smile className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-[10px] text-muted-foreground font-semibold uppercase">Mood</p>
                    <p className="text-xs font-medium text-foreground">{memory.mood}</p>
                  </div>
                </div>
              )}

              {/* Creator details */}
              <div className="flex items-center gap-3 pt-3 border-t border-border/50">
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center overflow-hidden">
                  {memory.userId?.avatar ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={memory.userId.avatar} alt={memory.userId.name} className="w-full h-full object-cover" />
                  ) : (
                    <UserIcon className="w-4 h-4 text-primary" />
                  )}
                </div>
                <div>
                  <p className="text-[10px] text-muted-foreground">Captured by</p>
                  <p className="text-xs font-semibold text-foreground">{memory.userId?.name}</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Delete Confirmation Modal */}
        {showDeleteConfirm && (
          <div className="fixed inset-0 bg-black/45 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in-up">
            <div className="bg-card w-full max-w-sm rounded-2xl border border-border p-6 shadow-xl space-y-4">
              <h3 className="font-bold text-foreground text-base">Delete this memory?</h3>
              <p className="text-xs text-muted-foreground">
                This action is permanent and cannot be undone. This scrapbook entry will be lost forever.
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
