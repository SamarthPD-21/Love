"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { Plus, Search, Heart, Loader2 } from "lucide-react";
import { PageTransition } from "@/components/animations/PageTransition";
import { AlbumTabs } from "@/components/memories/AlbumTabs";
import { MemoryCard } from "@/components/memories/MemoryCard";
import { MasonryGrid } from "@/components/ui/MasonryGrid";
import api from "@/lib/api";
import type { Memory } from "@/types";

export default function MemoriesPage() {
  const queryClient = useQueryClient();
  const [selectedAlbumId, setSelectedAlbumId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [showOnlyFavorites, setShowOnlyFavorites] = useState(false);

  // Fetch Albums
  const { data: albumsResponse, refetch: refetchAlbums } = useQuery({
    queryKey: ["albums"],
    queryFn: async () => {
      const res = await api.get("/albums");
      return res.data.data;
    },
  });

  // Fetch Memories with query parameters
  const { data: memoriesResponse, isLoading } = useQuery({
    queryKey: ["memories", selectedAlbumId, searchQuery, showOnlyFavorites],
    queryFn: async () => {
      const params: Record<string, string> = {};
      if (selectedAlbumId) params.albumId = selectedAlbumId;
      if (searchQuery) params.query = searchQuery;
      if (showOnlyFavorites) params.favorite = "true";

      const res = await api.get("/memories", { params });
      return res.data.data;
    },
  });

  // Favorite toggle mutation
  const favoriteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await api.post(`/memories/${id}/favorite`);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["memories"] });
    },
  });

  const handleFavoriteToggle = (id: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    favoriteMutation.mutate(id);
  };

  const albums = albumsResponse || [];
  const memories = memoriesResponse || [];

  return (
    <PageTransition>
      <div className="space-y-6">
        {/* Header section */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-foreground flex items-center gap-2">
              📸 Memories
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Your stories, self-made scrapbooks, and little moments.
            </p>
          </div>
          
          <Link
            href="/scrapbook/new-memory"
            className="flex items-center justify-center gap-1.5 px-4 py-2.5 bg-primary text-primary-foreground font-semibold rounded-xl hover:bg-primary-hover shadow-sm hover:shadow-md transition-all text-sm w-full sm:w-auto"
          >
            <Plus className="w-4 h-4" />
            <span>Add Memory</span>
          </Link>
        </div>

        {/* Filters and Search */}
        <div className="flex flex-col md:flex-row gap-3">
          {/* Search bar */}
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search memories by title, story or tags..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-card border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-ring text-sm"
            />
          </div>

          {/* Favorites filter toggle */}
          <button
            onClick={() => setShowOnlyFavorites(!showOnlyFavorites)}
            className={`flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl border text-sm font-semibold transition-all whitespace-nowrap ${
              showOnlyFavorites
                ? "bg-rose-50 border-rose-200 text-rose-500 dark:bg-rose-950/20 dark:border-rose-900"
                : "bg-card border-border text-muted-foreground hover:text-foreground"
            }`}
          >
            <Heart className={`w-4 h-4 ${showOnlyFavorites ? "fill-rose-500 text-rose-500" : ""}`} />
            <span>Favorites</span>
          </button>
        </div>

        {/* Album horizontal tabs */}
        <AlbumTabs
          albums={albums}
          selectedId={selectedAlbumId}
          onSelect={setSelectedAlbumId}
          onAlbumCreated={refetchAlbums}
        />

        {/* Gallery grid */}
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-20 text-muted-foreground gap-3">
            <Loader2 className="w-8 h-8 text-primary animate-spin" />
            <p className="text-sm font-medium">Opening scrapbooks...</p>
          </div>
        ) : memories.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center glass rounded-2xl border border-border/40 p-8 space-y-3">
            <span className="text-5xl">📷</span>
            <h3 className="text-lg font-bold text-foreground">No memories found</h3>
            <p className="text-xs text-muted-foreground max-w-sm handwritten text-base">
              {searchQuery || selectedAlbumId || showOnlyFavorites
                ? "Try adjusting your filters or search terms."
                : "A scrapbook starts with a single snapshot. Capture a memory to begin."}
            </p>
            {!searchQuery && !selectedAlbumId && !showOnlyFavorites && (
              <Link
                href="/scrapbook/new-memory"
                className="inline-flex px-4 py-2 bg-primary text-primary-foreground font-semibold text-xs rounded-xl hover:bg-primary-hover shadow-sm"
              >
                Add Your First Memory
              </Link>
            )}
          </div>
        ) : (
          <MasonryGrid>
            {memories.map((memory: Memory) => (
              <MemoryCard
                key={memory._id}
                memory={memory}
                onFavoriteToggle={handleFavoriteToggle}
              />
            ))}
          </MasonryGrid>
        )}
      </div>
    </PageTransition>
  );
}
