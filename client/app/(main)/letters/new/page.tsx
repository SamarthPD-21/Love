"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { ArrowLeft, Loader2, Calendar, Gift, Mic, Music, Trash2 } from "lucide-react";
import { PageTransition } from "@/components/animations/PageTransition";
import { ImageUpload } from "@/components/ui/ImageUpload";
import { AudioRecorder } from "@/components/voice/AudioRecorder";
import { AudioPlayer } from "@/components/voice/AudioPlayer";
import api from "@/lib/api";

const letterSchema = z.object({
  title: z.string().min(1, "Title is required"),
  content: z.string().min(1, "Letter content is required"),
  unlockType: z.enum(["date", "event", "manual"]),
  unlockDate: z.string().optional(),
  unlockEvent: z.string().optional(),
  songLink: z.string().optional(),
}).refine((data) => {
  if (data.unlockType === "date" && !data.unlockDate) {
    return false;
  }
  return true;
}, {
  message: "Unlock date is required for date-based letters",
  path: ["unlockDate"],
}).refine((data) => {
  if (data.unlockType === "event" && !data.unlockEvent) {
    return false;
  }
  return true;
}, {
  message: "Event description is required for event-based letters",
  path: ["unlockEvent"],
});

type LetterFormValues = z.infer<typeof letterSchema>;

export default function NewLetterPage() {
  const router = useRouter();
  const [photos, setPhotos] = useState<string[]>([]);
  const [voiceUrl, setVoiceUrl] = useState<string>("");
  const [voiceDuration, setVoiceDuration] = useState<number>(0);
  const [showRecorder, setShowRecorder] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<LetterFormValues>({
    resolver: zodResolver(letterSchema),
    defaultValues: {
      unlockType: "manual",
      unlockDate: "",
      unlockEvent: "",
      songLink: "",
    },
  });

  const unlockType = watch("unlockType");

  const onSubmit = async (values: LetterFormValues) => {
    setIsSubmitting(true);
    try {
      await api.post("/letters", {
        title: values.title,
        content: values.content,
        unlockType: values.unlockType,
        unlockDate: values.unlockType === "date" ? values.unlockDate : undefined,
        unlockEvent: values.unlockType === "event" ? values.unlockEvent : undefined,
        songLink: values.songLink || undefined,
        photos,
        voiceNote: voiceUrl || undefined,
      });

      router.push("/letters");
    } catch (error) {
      console.error("Create letter error:", error);
      alert("Failed to write letter. Please check your inputs.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleVoiceUploadComplete = (url: string, duration: number) => {
    setVoiceUrl(url);
    setVoiceDuration(duration);
    setShowRecorder(false);
  };

  return (
    <PageTransition>
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Back header */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.back()}
            className="p-2 rounded-xl bg-card border border-border text-muted-foreground hover:text-foreground transition-all"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">Write a Future Letter</h1>
            <p className="text-xs text-muted-foreground">Seal your thoughts to be opened in the future.</p>
          </div>
        </div>

        {/* Compose Form */}
        <form onSubmit={handleSubmit(onSubmit)} className="glass rounded-2xl p-6 sm:p-8 space-y-6">
          {/* Title */}
          <div className="space-y-1.5">
            <label className="text-sm font-semibold text-foreground">Letter Title</label>
            <input
              type="text"
              placeholder="e.g. Open on your graduation, Read when you miss me"
              {...register("title")}
              className="w-full px-4 py-2.5 bg-background rounded-xl border border-border focus:outline-none focus:ring-2 focus:ring-ring text-sm"
            />
            {errors.title && (
              <p className="text-xs text-destructive">{errors.title.message}</p>
            )}
          </div>

          {/* Unlock Mechanism */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-sm font-semibold text-foreground flex items-center gap-1.5">
                <Gift className="w-4 h-4 text-muted-foreground" />
                Unlock Method
              </label>
              <select
                {...register("unlockType")}
                className="w-full px-4 py-2.5 bg-background rounded-xl border border-border focus:outline-none focus:ring-2 focus:ring-ring text-sm appearance-none"
              >
                <option value="manual">Manual unlock (Open when wanted)</option>
                <option value="date">Unlocks on a specific date 📅</option>
                <option value="event">Unlocks after a specific event 🎓</option>
              </select>
            </div>

            {/* Conditionally show fields */}
            {unlockType === "date" && (
              <div className="space-y-1.5">
                <label className="text-sm font-semibold text-foreground flex items-center gap-1.5">
                  <Calendar className="w-4 h-4 text-muted-foreground" />
                  Unlock Date
                </label>
                <input
                  type="date"
                  {...register("unlockDate")}
                  className="w-full px-4 py-2.5 bg-background rounded-xl border border-border focus:outline-none focus:ring-2 focus:ring-ring text-sm"
                />
                {errors.unlockDate && (
                  <p className="text-xs text-destructive">{errors.unlockDate.message}</p>
                )}
              </div>
            )}

            {unlockType === "event" && (
              <div className="space-y-1.5">
                <label className="text-sm font-semibold text-foreground">Unlock Event</label>
                <input
                  type="text"
                  placeholder="e.g. After exams, Birthday morning"
                  {...register("unlockEvent")}
                  className="w-full px-4 py-2.5 bg-background rounded-xl border border-border focus:outline-none focus:ring-2 focus:ring-ring text-sm"
                />
                {errors.unlockEvent && (
                  <p className="text-xs text-destructive">{errors.unlockEvent.message}</p>
                )}
              </div>
            )}
          </div>

          {/* Letter Body (Content) */}
          <div className="space-y-1.5">
            <label className="text-sm font-semibold text-foreground">The Content</label>
            <textarea
              placeholder="Start writing your thoughts here... Take your time. 🤍"
              {...register("content")}
              rows={8}
              className="w-full px-4 py-2.5 bg-background rounded-xl border border-border focus:outline-none focus:ring-2 focus:ring-ring text-sm resize-none handwritten text-lg"
            />
            {errors.content && (
              <p className="text-xs text-destructive">{errors.content.message}</p>
            )}
          </div>

          {/* Attachments Collapsible / sections */}
          <div className="space-y-4 pt-4 border-t border-border/50">
            <h3 className="text-sm font-bold text-foreground">Attachments (Optional)</h3>

            {/* Photos */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground">Attach Photos</label>
              <ImageUpload value={photos} onChange={setPhotos} maxFiles={4} />
            </div>

            {/* Song link */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground flex items-center gap-1">
                <Music className="w-3.5 h-3.5" />
                Song Link (Spotify / YouTube)
              </label>
              <input
                type="text"
                placeholder="https://open.spotify.com/track/..."
                {...register("songLink")}
                className="w-full px-4 py-2.5 bg-background rounded-xl border border-border focus:outline-none focus:ring-2 focus:ring-ring text-sm"
              />
            </div>

            {/* Voice note */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-muted-foreground flex items-center gap-1">
                <Mic className="w-3.5 h-3.5" />
                Voice Note
              </label>

              {voiceUrl ? (
                <div className="flex items-center gap-2">
                  <AudioPlayer url={voiceUrl} duration={voiceDuration} className="flex-1" />
                  <button
                    type="button"
                    onClick={() => {
                      setVoiceUrl("");
                      setVoiceDuration(0);
                    }}
                    className="p-3 bg-muted hover:bg-destructive/15 hover:text-destructive text-muted-foreground rounded-xl transition-all"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ) : showRecorder ? (
                <div className="space-y-2">
                  <AudioRecorder onUploadComplete={handleVoiceUploadComplete} />
                  <button
                    type="button"
                    onClick={() => setShowRecorder(false)}
                    className="w-full text-center text-xs font-semibold text-muted-foreground hover:text-foreground"
                  >
                    Cancel Recording
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setShowRecorder(true)}
                  className="w-full py-3 rounded-xl border border-dashed border-border hover:border-primary/50 text-xs font-semibold text-muted-foreground hover:text-primary transition-all flex items-center justify-center gap-1.5"
                >
                  <Mic className="w-4 h-4" />
                  <span>Record a voice note</span>
                </button>
              )}
            </div>
          </div>

          {/* Form Actions */}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={() => router.back()}
              className="flex-1 py-3 rounded-xl border border-border hover:bg-muted text-sm font-semibold transition-all"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 py-3 rounded-xl bg-primary text-primary-foreground hover:bg-primary-hover active:scale-[0.98] text-sm font-semibold transition-all shadow-md flex items-center justify-center gap-1.5"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Sealing...
                </>
              ) : (
                "Seal Letter 📜"
              )}
            </button>
          </div>
        </form>
      </div>
    </PageTransition>
  );
}
