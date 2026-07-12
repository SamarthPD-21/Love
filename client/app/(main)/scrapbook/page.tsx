"use client";

import { useState, useEffect } from "react";
import { Camera, Archive, Globe } from "lucide-react";
import { RoomHeader } from "@/components/ui/RoomHeader";
import { SegmentedControl } from "@/components/ui/SegmentedControl";

import MemoriesView from "../_views/MemoriesView";
import MemoryJarView from "../_views/MemoryJarView";
import TimelineView from "../_views/TimelineView";

export default function ScrapbookPage() {
  const [activeTab, setActiveTab] = useState("photos");

  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const tab = params.get("tab");
      if (tab && ["photos", "jar", "milestones"].includes(tab)) {
        Promise.resolve().then(() => setActiveTab(tab));
      }
    }
  }, []);

  const segments = [
    { id: "photos", label: "Photos", icon: Camera },
    { id: "jar", label: "Memory Jar", icon: Archive },
    { id: "milestones", label: "Milestones", icon: Globe },
  ];

  return (
    <div className="flex flex-col min-h-screen pt-4 pb-24 md:pb-8 px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto space-y-6">
      <RoomHeader
        title="Scrapbook"
        subtitle="Relive our favorite moments together."
        emoji="📸"
        gradientClass="bg-pink-500/5 dark:bg-pink-500/10 border-pink-500/20"
      />

      <div className="flex justify-center mb-6">
        <SegmentedControl
          items={segments}
          activeId={activeTab}
          onChange={setActiveTab}
        />
      </div>

      <div className="flex-1 w-full relative">
        {activeTab === "photos" && <MemoriesView />}
        {activeTab === "jar" && <MemoryJarView />}
        {activeTab === "milestones" && <TimelineView />}
      </div>
    </div>
  );
}
