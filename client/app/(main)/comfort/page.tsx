"use client";

import { useState, useEffect } from "react";
import { HandHeart, Flower2, BookOpen } from "lucide-react";
import { RoomHeader } from "@/components/ui/RoomHeader";
import { SegmentedControl } from "@/components/ui/SegmentedControl";

import ComfortView from "../_views/ComfortView";
import GratitudeView from "../_views/GratitudeView";
import JournalView from "../_views/JournalView";

export default function ComfortPage() {
  const [activeTab, setActiveTab] = useState("hugs");

  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const tab = params.get("tab");
      if (tab && ["hugs", "gratitude", "journal"].includes(tab)) {
        setActiveTab(tab);
      }
    }
  }, []);

  const segments = [
    { id: "hugs", label: "Comfort", icon: HandHeart },
    { id: "gratitude", label: "Gratitude", icon: Flower2 },
    { id: "journal", label: "Journal", icon: BookOpen },
  ];

  return (
    <div className="flex flex-col min-h-screen pt-4 pb-24 md:pb-8 px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto space-y-6">
      <RoomHeader
        title="Comfort"
        subtitle="A safe space for feelings, thoughts, and virtual hugs."
        emoji="🫂"
        gradientClass="bg-blue-500/5 dark:bg-blue-500/10 border-blue-500/20"
      />

      <div className="flex justify-center mb-6">
        <SegmentedControl
          items={segments}
          activeId={activeTab}
          onChange={setActiveTab}
        />
      </div>

      <div className="flex-1 w-full relative">
        {activeTab === "hugs" && <ComfortView />}
        {activeTab === "gratitude" && <GratitudeView />}
        {activeTab === "journal" && <JournalView />}
      </div>
    </div>
  );
}
