"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Plus, Mail, Loader2, ArrowRight } from "lucide-react";
import { PageTransition } from "@/components/animations/PageTransition";
import { Envelope } from "@/components/letters/Envelope";
import { format } from "date-fns";
import api from "@/lib/api";

export default function LettersPage() {
  const router = useRouter();
  const [filter, setFilter] = useState<"all" | "unlocked" | "locked">("all");

  const { data: letters = [], isLoading } = useQuery({
    queryKey: ["letters"],
    queryFn: async () => {
      const res = await api.get("/letters");
      return res.data.data;
    },
  });

  const getUnlockInfo = (letter: any) => {
    if (letter.unlockType === "date" && letter.unlockDate) {
      return `Unlocks on ${format(new Date(letter.unlockDate), "MMM d, yyyy")}`;
    }
    if (letter.unlockType === "event" && letter.unlockEvent) {
      return `Unlocks after: ${letter.unlockEvent}`;
    }
    return "Locked until opened";
  };

  const filteredLetters = letters.filter((l: any) => {
    if (filter === "unlocked") return l.isUnlocked;
    if (filter === "locked") return !l.isUnlocked;
    return true;
  });

  return (
    <PageTransition>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-foreground flex items-center gap-2">
              📜 Future Letters
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Letters written to be unlocked on special dates, milestones, or manually.
            </p>
          </div>

          <Link
            href="/letters/new"
            className="flex items-center justify-center gap-1.5 px-4 py-2.5 bg-primary text-primary-foreground font-semibold rounded-xl hover:bg-primary-hover shadow-sm hover:shadow-md transition-all text-sm w-full sm:w-auto"
          >
            <Plus className="w-4 h-4" />
            <span>Write Letter</span>
          </Link>
        </div>

        {/* Tab Filters */}
        <div className="flex gap-2 border-b border-border pb-px">
          {(["all", "unlocked", "locked"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setFilter(t)}
              className={`px-4 py-2 text-xs font-semibold uppercase tracking-wider border-b-2 transition-all ${
                filter === t
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              {t} ({letters.filter((l: any) => t === "all" ? true : t === "unlocked" ? l.isUnlocked : !l.isUnlocked).length})
            </button>
          ))}
        </div>

        {/* Letters Grid */}
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-20 text-muted-foreground gap-3">
            <Loader2 className="w-8 h-8 text-primary animate-spin" />
            <p className="text-sm font-medium">Shuffling letters...</p>
          </div>
        ) : filteredLetters.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center glass rounded-2xl border border-border/40 p-8 space-y-3">
            <span className="text-5xl">✉️</span>
            <h3 className="text-lg font-bold text-foreground">No letters found</h3>
            <p className="text-xs text-muted-foreground max-w-sm handwritten text-base">
              {filter !== "all"
                ? "No letters match this filter."
                : "No letters written yet. Leave a sweet surprise for later."}
            </p>
            {filter === "all" && (
              <Link
                href="/letters/new"
                className="inline-flex px-4 py-2 bg-primary text-primary-foreground font-semibold text-xs rounded-xl hover:bg-primary-hover shadow-sm"
              >
                Write Your First Letter
              </Link>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-12 pt-4 pb-8 justify-items-center">
            {filteredLetters.map((letter: any) => (
              <Envelope
                key={letter._id}
                title={letter.title}
                sender={letter.userId?.name || "Partner"}
                date={format(new Date(letter.createdAt), "MMMM d, yyyy")}
                isLocked={!letter.isUnlocked}
                unlockInfo={getUnlockInfo(letter)}
                onClick={() => router.push(`/letters/${letter._id}`)}
              />
            ))}
          </div>
        )}
      </div>
    </PageTransition>
  );
}
