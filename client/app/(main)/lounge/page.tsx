"use client";

import { useState } from "react";
import { Music, Film, Gamepad2 } from "lucide-react";
import { RoomHeader } from "@/components/ui/RoomHeader";
import { SegmentedControl } from "@/components/ui/SegmentedControl";

import SongsView from "../_views/SongsView";
import MoviesView from "../_views/MoviesView";
import GamesView from "../_views/GamesView";

export default function LoungePage() {
  const [activeTab, setActiveTab] = useState("playlist");

  const segments = [
    { id: "playlist", label: "Playlist", icon: Music },
    { id: "watchlist", label: "Watchlist", icon: Film },
    { id: "games", label: "Games", icon: Gamepad2 },
  ];

  return (
    <div className="flex flex-col min-h-screen pt-4 pb-24 md:pb-8 px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto space-y-6">
      <RoomHeader
        title="Lounge"
        subtitle="Our shared entertainment and fun zone."
        emoji="🎵"
        gradientClass="bg-orange-500/5 dark:bg-orange-500/10 border-orange-500/20"
      />

      <div className="flex justify-center mb-6">
        <SegmentedControl
          items={segments}
          activeId={activeTab}
          onChange={setActiveTab}
        />
      </div>

      <div className="flex-1 w-full relative">
        {activeTab === "playlist" && <SongsView />}
        {activeTab === "watchlist" && <MoviesView />}
        {activeTab === "games" && <GamesView />}
      </div>
    </div>
  );
}
