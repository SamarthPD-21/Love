"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { ArrowLeft, Loader2, Calendar, MapPin, Tag, Smile } from "lucide-react";
import { PageTransition } from "@/components/animations/PageTransition";
import { ImageUpload } from "@/components/ui/ImageUpload";
import api from "@/lib/api";

const moods = [
  { label: "Cozy ☕", value: "Cozy" },
  { label: "Happy ✨", value: "Happy" },
  { label: "Romantic 💖", value: "Romantic" },
  { label: "Excited 🎉", value: "Excited" },
  { label: "Funny 😂", value: "Funny" },
  { label: "Dreamy 🌙", value: "Dreamy" },
];

const memorySchema = z.object({
  title: z.string().min(1, "Title is required"),
  date: z.string().min(1, "Date is required"),
  location: z.string().optional(),
  story: z.string().optional(),
  mood: z.string().optional(),
  tagsInput: z.string().optional(),
  albumId: z.string().optional(),
});

type MemoryFormValues = z.infer<typeof memorySchema>;

export default function NewMemoryPage() {
  const router = useRouter();
  const [photos, setPhotos] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fetch albums for dropdown selection
  const { data: albums = [] } = useQuery({
    queryKey: ["albums"],
    queryFn: async () => {
      const res = await api.get("/albums");
      return res.data.data;
    },
  });

  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
  } = useForm<MemoryFormValues>({
    resolver: zodResolver(memorySchema),
    defaultValues: {
      date: new Date().toISOString().split("T")[0], // default to today
      mood: "",
      albumId: "",
    },
  });

  const onSubmit = async (values: MemoryFormValues) => {
    setIsSubmitting(true);
    try {
      // Process tags from comma separated string
      const tags = values.tagsInput
        ? values.tagsInput
            .split(",")
            .map((t) => t.trim())
            .filter((t) => t.length > 0)
        : [];

      // Check if we have photos/videos or if they are required. In this case, memories usually have photos, but text is fine too.
      // Let's split files into photos and videos
      const images: string[] = [];
      const videos: string[] = [];

      photos.forEach((url) => {
        const ext = url.split(".").pop()?.toLowerCase();
        if (["mp4", "webm", "ogg", "mov"].includes(ext || "")) {
          videos.push(url);
        } else {
          images.push(url);
        }
      });

      await api.post("/memories", {
        title: values.title,
        date: values.date,
        location: values.location,
        story: values.story,
        mood: values.mood,
        tags,
        albumId: values.albumId || undefined,
        photos: images,
        videos: videos,
      });

      router.push("/memories");
    } catch (error) {
      console.error("Create memory error:", error);
      alert("Failed to save memory. Please check your inputs and try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <PageTransition>
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Back navigation header */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.back()}
            className="p-2 rounded-xl bg-card border border-border text-muted-foreground hover:text-foreground hover:shadow-xs transition-all"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">Write a New Memory</h1>
            <p className="text-xs text-muted-foreground">Capture this moment in your scrapbook forever.</p>
          </div>
        </div>

        {/* Create Memory Form */}
        <form onSubmit={handleSubmit(onSubmit)} className="glass rounded-2xl p-6 sm:p-8 space-y-6">
          {/* Photos/Videos Upload Section */}
          <div className="space-y-2">
            <label className="text-sm font-semibold text-foreground">Photos & Videos</label>
            <ImageUpload value={photos} onChange={setPhotos} maxFiles={10} />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Title */}
            <div className="space-y-1.5 sm:col-span-2">
              <label className="text-sm font-semibold text-foreground">Title</label>
              <input
                type="text"
                placeholder="What should we call this memory?"
                {...register("title")}
                className="w-full px-4 py-2.5 bg-background rounded-xl border border-border focus:outline-none focus:ring-2 focus:ring-ring text-sm"
              />
              {errors.title && (
                <p className="text-xs text-destructive">{errors.title.message}</p>
              )}
            </div>

            {/* Date */}
            <div className="space-y-1.5">
              <label className="text-sm font-semibold text-foreground flex items-center gap-1.5">
                <Calendar className="w-4 h-4 text-muted-foreground" />
                Date
              </label>
              <input
                type="date"
                {...register("date")}
                className="w-full px-4 py-2.5 bg-background rounded-xl border border-border focus:outline-none focus:ring-2 focus:ring-ring text-sm"
              />
              {errors.date && (
                <p className="text-xs text-destructive">{errors.date.message}</p>
              )}
            </div>

            {/* Location */}
            <div className="space-y-1.5">
              <label className="text-sm font-semibold text-foreground flex items-center gap-1.5">
                <MapPin className="w-4 h-4 text-muted-foreground" />
                Location
              </label>
              <input
                type="text"
                placeholder="Where did this happen?"
                {...register("location")}
                className="w-full px-4 py-2.5 bg-background rounded-xl border border-border focus:outline-none focus:ring-2 focus:ring-ring text-sm"
              />
            </div>

            {/* Mood Dropdown */}
            <div className="space-y-1.5">
              <label className="text-sm font-semibold text-foreground flex items-center gap-1.5">
                <Smile className="w-4 h-4 text-muted-foreground" />
                Mood
              </label>
              <select
                {...register("mood")}
                className="w-full px-4 py-2.5 bg-background rounded-xl border border-border focus:outline-none focus:ring-2 focus:ring-ring text-sm appearance-none"
              >
                <option value="">Select mood...</option>
                {moods.map((m) => (
                  <option key={m.value} value={m.value}>
                    {m.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Album Dropdown */}
            <div className="space-y-1.5">
              <label className="text-sm font-semibold text-foreground">Album</label>
              <select
                {...register("albumId")}
                className="w-full px-4 py-2.5 bg-background rounded-xl border border-border focus:outline-none focus:ring-2 focus:ring-ring text-sm appearance-none"
              >
                <option value="">No album (General)</option>
                {albums.map((album: any) => (
                  <option key={album._id} value={album._id}>
                    {album.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Tags */}
            <div className="space-y-1.5 sm:col-span-2">
              <label className="text-sm font-semibold text-foreground flex items-center gap-1.5">
                <Tag className="w-4 h-4 text-muted-foreground" />
                Tags (comma separated)
              </label>
              <input
                type="text"
                placeholder="e.g. food, trip, birthday, funny"
                {...register("tagsInput")}
                className="w-full px-4 py-2.5 bg-background rounded-xl border border-border focus:outline-none focus:ring-2 focus:ring-ring text-sm"
              />
            </div>

            {/* Story */}
            <div className="space-y-1.5 sm:col-span-2">
              <label className="text-sm font-semibold text-foreground">The Story</label>
              <textarea
                placeholder="Tell the story of what happened... Write down the little details you want to remember."
                {...register("story")}
                rows={5}
                className="w-full px-4 py-2.5 bg-background rounded-xl border border-border focus:outline-none focus:ring-2 focus:ring-ring text-sm resize-none"
              />
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
                  Saving...
                </>
              ) : (
                "Save Memory"
              )}
            </button>
          </div>
        </form>
      </div>
    </PageTransition>
  );
}
