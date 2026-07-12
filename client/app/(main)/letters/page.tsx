"use client";

import { useState, useEffect } from "react";
import { ScrollText, Mail, Mic } from "lucide-react";
import { RoomHeader } from "@/components/ui/RoomHeader";
import { SegmentedControl } from "@/components/ui/SegmentedControl";

import LettersView from "../_views/LettersView";
import OpenWhenView from "../_views/OpenWhenView";
import VoiceNotesView from "../_views/VoiceNotesView";

export default function LettersPage() {
  const [activeTab, setActiveTab] = useState("letters");

  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const tab = params.get("tab");
      if (tab && ["letters", "open-when", "voice-notes"].includes(tab)) {
        setActiveTab(tab);
      }
    }
  }, []);

  const segments = [
    { id: "letters", label: "Letters", icon: ScrollText },
    { id: "open-when", label: "Open When", icon: Mail },
    { id: "voice-notes", label: "Voice Notes", icon: Mic },
  ];

  return (
    <div className="flex flex-col min-h-screen pt-4 pb-24 md:pb-8 px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto space-y-6">
      <RoomHeader
        title="Letters"
        subtitle="Things I want to tell you, written down and recorded."
        emoji="💌"
        gradientClass="bg-purple-500/5 dark:bg-purple-500/10 border-purple-500/20"
      />

      <div className="flex justify-center mb-6">
        <SegmentedControl
          items={segments}
          activeId={activeTab}
          onChange={setActiveTab}
        />
      </div>

      <div className="flex-1 w-full relative">
        {activeTab === "letters" && <LettersView />}
        {activeTab === "open-when" && <OpenWhenView />}
        {activeTab === "voice-notes" && <VoiceNotesView />}
      </div>
    </div>
  );
}
