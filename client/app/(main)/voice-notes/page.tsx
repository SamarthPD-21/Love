"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Mic, ArrowRight, Loader2, Trash2, Calendar, Radio } from "lucide-react";
import { format } from "date-fns";
import { PageTransition } from "@/components/animations/PageTransition";
import { AudioRecorder } from "@/components/voice/AudioRecorder";
import { AudioPlayer } from "@/components/voice/AudioPlayer";
import api from "@/lib/api";
import { cn } from "@/lib/utils";

const voiceCategories = [
  { name: "Love 💖", value: "Love" },
  { name: "Morning ☀️", value: "Morning" },
  { name: "Night 🌙", value: "Night" },
  { name: "Comfort 🫂", value: "Comfort" },
  { name: "Funny 😂", value: "Funny" },
  { name: "Sleep 😴", value: "Sleep" },
];

export default function VoiceNotesPage() {
  const queryClient = useQueryClient();
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [showRecorder, setShowRecorder] = useState(false);
  const [noteCategory, setNoteCategory] = useState("Love");
  const [noteTitle, setNoteTitle] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fetch voice notes
  const { data: voiceNotes = [], isLoading } = useQuery({
    queryKey: ["voice-notes", selectedCategory],
    queryFn: async () => {
      const params: any = {};
      if (selectedCategory) params.category = selectedCategory;
      const res = await api.get("/voice-notes", { params });
      return res.data.data;
    },
  });

  // Delete voice note mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/voice-notes/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["voice-notes"] });
    },
  });

  const handleUploadComplete = async (url: string, duration: number) => {
    setIsSubmitting(true);
    try {
      await api.post("/voice-notes", {
        title: noteTitle.trim() || undefined,
        audioUrl: url,
        duration,
        category: noteCategory,
      });

      setNoteTitle("");
      setShowRecorder(false);
      queryClient.invalidateQueries({ queryKey: ["voice-notes"] });
    } catch (error) {
      console.error("Save voice note error:", error);
      alert("Failed to save voice note metadata. Audio was uploaded.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = (id: string) => {
    if (confirm("Are you sure you want to delete this voice note?")) {
      deleteMutation.mutate(id);
    }
  };

  return (
    <PageTransition>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-foreground flex items-center gap-2">
              🎤 Voice Notes
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Record spoken messages, laughs, sleep whispers, or reminders that you love her.
            </p>
          </div>

          <button
            onClick={() => setShowRecorder(!showRecorder)}
            className="flex items-center justify-center gap-1.5 px-4 py-2.5 bg-primary text-primary-foreground font-semibold rounded-xl hover:bg-primary-hover shadow-sm hover:shadow-md transition-all text-sm w-full sm:w-auto"
          >
            <Mic className="w-4 h-4" />
            <span>{showRecorder ? "Hide Recorder" : "Record Note"}</span>
          </button>
        </div>

        {/* Collapsible Recorder Panel */}
        {showRecorder && (
          <div className="glass rounded-2xl p-6 border border-border/40 space-y-4 animate-fade-in-up">
            <h3 className="text-sm font-bold text-foreground">Record New Voice Note</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground">Title (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g. Good Morning Love, Listen before sleep"
                  value={noteTitle}
                  onChange={(e) => setNoteTitle(e.target.value)}
                  className="w-full px-4 py-2.5 bg-background rounded-xl border border-border focus:outline-none focus:ring-2 focus:ring-ring text-xs"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground">Category</label>
                <select
                  value={noteCategory}
                  onChange={(e) => setNoteCategory(e.target.value)}
                  className="w-full px-4 py-2.5 bg-background rounded-xl border border-border focus:outline-none focus:ring-2 focus:ring-ring text-xs appearance-none"
                >
                  {voiceCategories.map((c) => (
                    <option key={c.value} value={c.value}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <AudioRecorder onUploadComplete={handleUploadComplete} className="bg-background/40" />
            {isSubmitting && (
              <div className="text-center text-xs text-muted-foreground flex items-center justify-center gap-1.5">
                <Loader2 className="w-3.5 h-3.5 animate-spin text-primary" />
                Saving voice note metadata...
              </div>
            )}
          </div>
        )}

        {/* Categories filters */}
        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-none -mx-4 px-4 sm:mx-0 sm:px-0">
          <button
            onClick={() => setSelectedCategory(null)}
            className={cn(
              "px-4 py-2 rounded-full text-xs font-semibold whitespace-nowrap transition-all border",
              selectedCategory === null
                ? "bg-primary border-primary text-primary-foreground shadow-sm"
                : "bg-card border-border text-muted-foreground hover:text-foreground"
            )}
          >
            All Notes
          </button>
          {voiceCategories.map((cat) => (
            <button
              key={cat.value}
              onClick={() => setSelectedCategory(cat.value)}
              className={cn(
                "px-4 py-2 rounded-full text-xs font-semibold whitespace-nowrap transition-all border",
                selectedCategory === cat.value
                  ? "bg-primary border-primary text-primary-foreground shadow-sm"
                  : "bg-card border-border text-muted-foreground hover:text-foreground"
              )}
            >
              {cat.name}
            </button>
          ))}
        </div>

        {/* Audio list */}
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-20 text-muted-foreground gap-3">
            <Loader2 className="w-8 h-8 text-primary animate-spin" />
            <p className="text-sm font-medium">Tuning audio frequencies...</p>
          </div>
        ) : voiceNotes.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center glass rounded-2xl border border-border/40 p-8 space-y-2">
            <span className="text-5xl">🎙️</span>
            <h3 className="text-lg font-bold text-foreground">No voice notes</h3>
            <p className="text-xs text-muted-foreground max-w-sm handwritten text-base">
              {selectedCategory
                ? "No notes found in this category."
                : "Your partner hasn't recorded a whisper yet. Tap 'Record Note' to send a sweet note."}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {voiceNotes.map((note: any) => {
              const formattedDate = format(new Date(note.createdAt), "MMMM d, yyyy");
              return (
                <div key={note._id} className="flex flex-col sm:flex-row sm:items-center gap-2 group">
                  <AudioPlayer
                    url={note.audioUrl}
                    duration={note.duration}
                    title={note.title || `${note.category} Voice Note`}
                    sender={note.userId?.name}
                    className="flex-1"
                  />
                  <div className="flex items-center justify-between sm:justify-end gap-3 px-3 sm:px-0">
                    <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5" />
                      {formattedDate}
                    </span>
                    <button
                      onClick={() => handleDelete(note._id)}
                      className="p-2 bg-muted hover:bg-destructive/10 hover:text-destructive text-muted-foreground rounded-xl transition-all sm:opacity-0 sm:group-hover:opacity-100"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </PageTransition>
  );
}
