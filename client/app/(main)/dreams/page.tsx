"use client";

import { useState } from "react";
import { Target, Timer, Map as MapIcon } from "lucide-react";
import { RoomHeader } from "@/components/ui/RoomHeader";
import { SegmentedControl } from "@/components/ui/SegmentedControl";

import DreamsView from "../_views/DreamsView";
import CountdownsView from "../_views/CountdownsView";
import MapView from "../_views/MapView";

export default function DreamsPage() {
  const [activeTab, setActiveTab] = useState("dreams");

  const segments = [
    { id: "dreams", label: "Bucket List", icon: Target },
    { id: "countdowns", label: "Countdowns", icon: Timer },
    { id: "map", label: "Travel Map", icon: MapIcon },
  ];

  return (
    <div className="flex flex-col min-h-screen pt-4 pb-24 md:pb-8 px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto space-y-6">
      <RoomHeader
        title="Dreams"
        subtitle="Looking forward to our future together."
        emoji="🌙"
        gradientClass="bg-indigo-500/5 dark:bg-indigo-500/10 border-indigo-500/20"
      />

      <div className="flex justify-center mb-6">
        <SegmentedControl
          items={segments}
          activeId={activeTab}
          onChange={setActiveTab}
        />
      </div>

      <div className="flex-1 w-full relative">
        {activeTab === "dreams" && <DreamsView />}
        {activeTab === "countdowns" && <CountdownsView />}
        {activeTab === "map" && <MapView />}
      </div>
    </div>
  );
}
