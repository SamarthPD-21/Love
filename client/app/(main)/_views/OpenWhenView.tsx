"use client";

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { Plus, Loader2, PenLine, X } from "lucide-react";
import { motion } from "framer-motion";
import { PageTransition } from "@/components/animations/PageTransition";
import { ImageUpload } from "@/components/ui/ImageUpload";
import { useToastStore } from "@/stores/useToastStore";
import api from "@/lib/api";
import type { OpenWhenLetter } from "@/types";

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

const bgOptions = [
  { label: "Creamy Peach 🍑", value: "peach" },
  { label: "Soft Pink 🌸", value: "pink" },
  { label: "Soft Lavender 🪻", value: "lavender" },
  { label: "Sage Green 🌿", value: "sage" },
];

export default function OpenWhenPage() {
  const queryClient = useQueryClient();
  const [showModal, setShowModal] = useState(false);
  const [photos, setPhotos] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const showToast = useToastStore((s) => s.showToast);

  // Form states
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [category, setCategory] = useState("Miss Me");
  const [songLink, setSongLink] = useState("");
  const [customBg, setCustomBg] = useState("peach");

  // Fetch letters to aggregate counts
  const { data: letters = [], isLoading } = useQuery<OpenWhenLetter[]>({
    queryKey: ["open-when"],
    queryFn: async () => {
      const res = await api.get("/open-when");
      return res.data.data;
    },
  });

  const getLetterCountForCategory = (catName: string) => {
    return letters.filter((l: OpenWhenLetter) => l.category === catName).length;
  };

  const handleComposeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !content.trim()) return;

    setIsSubmitting(true);
    try {
      await api.post("/open-when", {
        title,
        content,
        category,
        songLink: songLink || undefined,
        customBackground: customBg,
        photos,
      });

      setTitle("");
      setContent("");
      setSongLink("");
      setPhotos([]);
      setShowModal(false);
      queryClient.invalidateQueries({ queryKey: ["open-when"] });
      showToast("Letter sealed and saved successfully! 💌", "success");
    } catch (error) {
      console.error("Compose open when letter error:", error);
      showToast("Failed to write letter. Please check inputs.", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <PageTransition>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-foreground flex items-center gap-2">
              💌 Open When...
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Letters to be opened only when she feels a certain way. Prescriptions for her heart.
            </p>
          </div>

          <button
            onClick={() => setShowModal(true)}
            className="flex items-center justify-center gap-1.5 px-4 py-2.5 bg-primary text-primary-foreground font-semibold rounded-xl hover:bg-primary-hover shadow-sm hover:shadow-md transition-all text-sm w-full sm:w-auto"
          >
            <Plus className="w-4 h-4" />
            <span>Compose Letter</span>
          </button>
        </div>

        {/* Categories Grid */}
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-20 text-muted-foreground gap-3">
            <Loader2 className="w-8 h-8 text-primary animate-spin" />
            <p className="text-sm font-medium">Sorting medicine cabinets...</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {categories.map((cat) => {
              const count = getLetterCountForCategory(cat.name);
              return (
                <Link
                  key={cat.name}
                  href={`/open-when/${encodeURIComponent(cat.name)}`}
                  className={`border rounded-2xl p-5 hover:scale-[1.02] active:scale-[0.98] transition-all flex flex-col justify-between h-44 shadow-xs hover:shadow-sm ${cat.color}`}
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-3xl">{cat.emoji}</span>
                      {count > 0 && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-card shadow-xs border border-border/20">
                          {count} {count === 1 ? "Letter" : "Letters"}
                        </span>
                      )}
                    </div>
                    <div>
                      <h3 className="font-bold text-foreground text-base">Open When: {cat.name}</h3>
                      <p className="text-[11px] opacity-80 mt-1">{cat.desc}</p>
                    </div>
                  </div>
                  <div className="text-[10px] font-semibold flex items-center gap-1 mt-2 opacity-80">
                    <span>Open Cabinet</span>
                    <span>→</span>
                  </div>
                </Link>
              );
            })}
          </div>
        )}

        {/* Compose Modal */}
        {showModal && (
          <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in-up">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="bg-card w-full max-w-xl rounded-2xl border border-border p-6 shadow-xl max-h-[90vh] overflow-y-auto space-y-4"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                    <PenLine className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-foreground text-lg">Compose Open When...</h3>
                    <p className="text-xs text-muted-foreground">Add a sentiment pill to her private chest</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleComposeSubmit} className="space-y-4">
                {/* Select Category */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-muted-foreground">Category (Trigger)</label>
                    <select
                      value={category}
                      onChange={(e) => setCategory(e.target.value)}
                      className="w-full px-4 py-2.5 bg-background rounded-xl border border-border focus:outline-none focus:ring-2 focus:ring-ring text-sm appearance-none"
                    >
                      {categories.map((c) => (
                        <option key={c.name} value={c.name}>
                          {c.emoji} {c.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Custom Background Color */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-muted-foreground">Paper Styling</label>
                    <select
                      value={customBg}
                      onChange={(e) => setCustomBg(e.target.value)}
                      className="w-full px-4 py-2.5 bg-background rounded-xl border border-border focus:outline-none focus:ring-2 focus:ring-ring text-sm appearance-none"
                    >
                      {bgOptions.map((b) => (
                        <option key={b.value} value={b.value}>
                          {b.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Letter Title */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-muted-foreground">Letter Title</label>
                  <input
                    type="text"
                    placeholder="e.g. Read when you're having a long day"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    required
                    className="w-full px-4 py-2.5 bg-background rounded-xl border border-border focus:outline-none focus:ring-2 focus:ring-ring text-sm"
                  />
                </div>

                {/* Letter Body */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-muted-foreground">The Content</label>
                  <textarea
                    placeholder="Write down words of comfort, reassurances, or funny stories... 🤍"
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    required
                    rows={6}
                    className="w-full px-4 py-2.5 bg-background rounded-xl border border-border focus:outline-none focus:ring-2 focus:ring-ring resize-none handwritten text-lg"
                  />
                </div>

                {/* Image Upload */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-muted-foreground">Attach Photos</label>
                  <ImageUpload value={photos} onChange={setPhotos} maxFiles={4} />
                </div>

                {/* Song Link */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-muted-foreground">Song Link (Optional)</label>
                  <input
                    type="text"
                    placeholder="Spotify track url or YouTube video"
                    value={songLink}
                    onChange={(e) => setSongLink(e.target.value)}
                    className="w-full px-4 py-2.5 bg-background rounded-xl border border-border focus:outline-none focus:ring-2 focus:ring-ring text-sm"
                  />
                </div>

                {/* Actions */}
                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    className="px-4 py-2 text-xs font-semibold border border-border rounded-xl hover:bg-muted"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting || !title.trim() || !content.trim()}
                    className="px-4 py-2 text-xs font-semibold bg-primary text-primary-foreground rounded-xl hover:bg-primary-hover disabled:opacity-50 flex items-center gap-1.5"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        Sealing...
                      </>
                    ) : (
                      "Seal Letter 💌"
                    )}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </div>
    </PageTransition>
  );
}
