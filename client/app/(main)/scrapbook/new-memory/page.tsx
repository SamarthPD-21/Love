"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Save, Loader2, Heart, Calendar, MapPin, Tag } from "lucide-react";
import Link from "next/link";
import { ImageUpload } from "@/components/ui/ImageUpload";
import api from "@/lib/api";
import type { Album } from "@/types";

export default function NewMemoryPage() {
  const router = useRouter();
  const queryClient = useQueryClient();

  const [title, setTitle] = useState("");
  const [story, setStory] = useState("");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [location, setLocation] = useState("");
  const [mood, setMood] = useState("");
  const [tags, setTags] = useState("");
  const [albumId, setAlbumId] = useState("");
  const [photos, setPhotos] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fetch albums for dropdown
  const { data: albums } = useQuery<Album[]>({
    queryKey: ["albums"],
    queryFn: async () => {
      const res = await api.get("/albums");
      return res.data.data;
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: {
      title: string;
      story?: string;
      date: string;
      location?: string;
      mood?: string;
      albumId?: string;
      tags: string[];
      photos: string[];
    }) => {
      const res = await api.post("/memories", data);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["memories"] });
      queryClient.invalidateQueries({ queryKey: ["albums"] });
      router.push("/scrapbook");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    const memoryData = {
      title,
      story,
      date,
      location,
      mood,
      albumId: albumId || undefined,
      tags: tags.split(",").map(t => t.trim()).filter(Boolean),
      photos,
    };

    createMutation.mutate(memoryData, {
      onSettled: () => setIsSubmitting(false),
    });
  };

  return (
    <div className="flex flex-col min-h-screen pt-4 pb-24 md:pb-8 px-4 sm:px-6 lg:px-8 max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link
            href="/scrapbook"
            className="p-2.5 rounded-xl bg-card border border-border text-muted-foreground hover:text-foreground transition-all"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              New Memory
            </h1>
            <p className="text-sm text-muted-foreground">
              Capture a special moment for the scrapbook.
            </p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Photos Section */}
        <div className="space-y-4">
          <label className="block text-sm font-medium text-foreground">
            Photos
          </label>
          <ImageUpload
            value={photos}
            onChange={(urls) => setPhotos(urls)}
            maxFiles={10}
            folder="memories"
          />
        </div>

        {/* Basic Details */}
        <div className="glass p-6 rounded-2xl border border-border/50 space-y-5">
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground flex items-center gap-2">
              <Heart className="w-4 h-4 text-primary" /> Title
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="A beautiful day..."
              className="w-full px-4 py-3 bg-background/50 border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Story</label>
            <textarea
              value={story}
              onChange={(e) => setStory(e.target.value)}
              placeholder="Tell the story of this moment..."
              rows={4}
              className="w-full px-4 py-3 bg-background/50 border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary resize-none"
            />
          </div>
        </div>

        {/* Metadata */}
        <div className="glass p-6 rounded-2xl border border-border/50 grid grid-cols-1 md:grid-cols-2 gap-5">
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground flex items-center gap-2">
              <Calendar className="w-4 h-4 text-primary" /> Date
            </label>
            <input
              type="date"
              required
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full px-4 py-3 bg-background/50 border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground flex items-center gap-2">
              <MapPin className="w-4 h-4 text-primary" /> Location
            </label>
            <input
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="e.g. Paris, France"
              className="w-full px-4 py-3 bg-background/50 border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground flex items-center gap-2">
              Mood
            </label>
            <select
              value={mood}
              onChange={(e) => setMood(e.target.value)}
              className="w-full px-4 py-3 bg-background/50 border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="">Select mood...</option>
              <option value="happy">Happy 😊</option>
              <option value="romantic">Romantic 🥰</option>
              <option value="nostalgic">Nostalgic 🥺</option>
              <option value="adventurous">Adventurous 🗺️</option>
              <option value="cozy">Cozy ☕</option>
            </select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground flex items-center gap-2">
              Album
            </label>
            <select
              value={albumId}
              onChange={(e) => setAlbumId(e.target.value)}
              className="w-full px-4 py-3 bg-background/50 border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="">No Album (All Memories)</option>
              {albums?.map((album: Album) => (
                <option key={album._id} value={album._id}>
                  {album.name}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2 md:col-span-2">
            <label className="text-sm font-medium text-foreground flex items-center gap-2">
              <Tag className="w-4 h-4 text-primary" /> Tags
            </label>
            <input
              type="text"
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              placeholder="vacation, summer, date (comma separated)"
              className="w-full px-4 py-3 bg-background/50 border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
        </div>

        {/* Submit */}
        <div className="flex justify-end pt-4">
          <button
            type="submit"
            disabled={isSubmitting || !title || !date}
            className="flex items-center gap-2 px-8 py-3 bg-primary text-primary-foreground font-semibold rounded-xl hover:bg-primary-hover shadow-lg hover:shadow-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>Saving...</span>
              </>
            ) : (
              <>
                <Save className="w-5 h-5" />
                <span>Save Memory</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
