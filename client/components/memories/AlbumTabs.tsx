"use client";

import { useState } from "react";
import { Folder, FolderPlus, Plus, Loader2 } from "lucide-react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import api from "@/lib/api";

interface Album {
  _id: string;
  name: string;
  memoryCount?: number;
}

interface AlbumTabsProps {
  albums: Album[];
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  onAlbumCreated?: () => void;
}

export function AlbumTabs({
  albums = [],
  selectedId,
  onSelect,
  onAlbumCreated,
}: AlbumTabsProps) {
  const [showModal, setShowModal] = useState(false);
  const [newAlbumName, setNewAlbumName] = useState("");
  const [newAlbumDesc, setNewAlbumDesc] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAlbumName.trim()) return;

    setIsSubmitting(true);
    try {
      await api.post("/albums", {
        name: newAlbumName,
        description: newAlbumDesc,
      });
      setNewAlbumName("");
      setNewAlbumDesc("");
      setShowModal(false);
      if (onAlbumCreated) onAlbumCreated();
    } catch (error) {
      console.error("Create album error:", error);
      alert("Failed to create album. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="w-full space-y-4">
      {/* Scrollable Tabs Wrapper */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none -mx-4 px-4 sm:mx-0 sm:px-0">
        {/* All Tab */}
        <button
          onClick={() => onSelect(null)}
          className={cn(
            "relative flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-semibold whitespace-nowrap transition-all",
            selectedId === null
              ? "bg-primary text-primary-foreground shadow-sm"
              : "bg-card text-muted-foreground hover:text-foreground border border-border"
          )}
        >
          <span>All Memories</span>
        </button>

        {/* Individual Album Tabs */}
        {albums.map((album) => {
          const isActive = selectedId === album._id;
          return (
            <button
              key={album._id}
              onClick={() => onSelect(album._id)}
              className={cn(
                "relative flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-semibold whitespace-nowrap transition-all",
                isActive
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "bg-card text-muted-foreground hover:text-foreground border border-border"
              )}
            >
              <Folder className="w-3.5 h-3.5" />
              <span>{album.name}</span>
              {album.memoryCount !== undefined && (
                <span
                  className={cn(
                    "text-[10px] px-1.5 py-0.5 rounded-full",
                    isActive ? "bg-white/20 text-white" : "bg-muted text-muted-foreground"
                  )}
                >
                  {album.memoryCount}
                </span>
              )}
            </button>
          );
        })}

        {/* Add Album Trigger */}
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-1 px-3 py-2 rounded-full text-xs font-semibold whitespace-nowrap bg-muted hover:bg-primary/10 hover:text-primary transition-all border border-dashed border-border"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>New Album</span>
        </button>
      </div>

      {/* Create Album Dialog (Modal) */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in-up">
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-card w-full max-w-md rounded-2xl border border-border p-6 shadow-xl space-y-4"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                <FolderPlus className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-foreground text-lg">Create New Album</h3>
                <p className="text-xs text-muted-foreground">Organize your memories into albums</p>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground">Album Name</label>
                <input
                  type="text"
                  placeholder="e.g. Summer Trip, Food, Anniversaries"
                  value={newAlbumName}
                  onChange={(e) => setNewAlbumName(e.target.value)}
                  required
                  className="w-full px-4 py-2.5 bg-background rounded-xl border border-border focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground">Description</label>
                <textarea
                  placeholder="Tell the story of this album..."
                  value={newAlbumDesc}
                  onChange={(e) => setNewAlbumDesc(e.target.value)}
                  rows={3}
                  className="w-full px-4 py-2.5 bg-background rounded-xl border border-border focus:outline-none focus:ring-2 focus:ring-ring resize-none"
                />
              </div>

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
                  disabled={isSubmitting || !newAlbumName.trim()}
                  className="px-4 py-2 text-xs font-semibold bg-primary text-primary-foreground rounded-xl hover:bg-primary-hover disabled:opacity-50 flex items-center gap-1.5"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    "Create Album"
                  )}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </div>
  );
}
