"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Bell } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";
import { useSoundEffects } from "@/hooks/useSoundEffects";
import {
  useUnreadCount,
  useNotifications,
  useMarkAllRead,
  useMarkOneRead,
} from "@/hooks/useNotifications";
import { useCelebration } from "@/stores/useCelebrationStore";
import { FloatingReaction } from "@/components/animations/FloatingReaction";
import type { AppNotification } from "@/types";

/** Map entity types to their deep-link pages. */
const ENTITY_HREF: Record<string, string> = {
  Letter: "/letters",
  Memory: "/scrapbook",
  VoiceNote: "/scrapbook",
  MemoryJarNote: "/comfort",
  Relationship: "/comfort",
  Countdown: "/dreams",
  Milestone: "/dreams",
  Gratitude: "/comfort",
  Song: "/lounge",
  MapPin: "/profile",
  User: "/profile",
};

export function NotificationBell({ className }: { className?: string }) {
  const [open, setOpen] = useState(false);
  const [reactionActive, setReactionActive] = useState(false);
  const [clickPos, setClickPos] = useState({ x: 0, y: 0 });
  const panelRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const { playSound } = useSoundEffects();
  const celebrate = useCelebration();

  const { data: count = 0 } = useUnreadCount();
  const { data: notifications = [], refetch } = useNotifications(30);
  const markAllRead = useMarkAllRead();

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (
        panelRef.current &&
        !panelRef.current.contains(e.target as Node) &&
        buttonRef.current &&
        !buttonRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const handleToggle = useCallback(
    (e: React.MouseEvent) => {
      const rect = (e.target as HTMLElement).getBoundingClientRect();
      setClickPos({ x: rect.left + rect.width / 2, y: rect.top });

      if (!open) {
        playSound("pop");
        setReactionActive(true);
        setTimeout(() => setReactionActive(false), 1200);
        refetch();
      }
      setOpen((prev) => !prev);
    },
    [open, playSound, refetch]
  );

  const handleMarkAllRead = () => {
    markAllRead.mutate();
    celebrate("small", "🧹");
    playSound("tap");
  };

  const getHref = (notif: AppNotification) => {
    if (notif.entityType && ENTITY_HREF[notif.entityType]) {
      const base = ENTITY_HREF[notif.entityType];
      if (notif.entityId) return `${base}?notif_id=${notif.entityId}`;
      return base;
    }
    return "#";
  };

  return (
    <>
      <FloatingReaction
        active={reactionActive}
        origin={clickPos}
        emoji={["✨", "💖", "🔔"]}
        count={4}
      />

      {/* Bell button */}
      <button
        ref={buttonRef}
        onClick={handleToggle}
        className={cn(
          "relative p-2 rounded-lg bg-muted/60 dark:bg-muted/40 hover:bg-muted dark:hover:bg-muted/60 transition-all cursor-pointer active:scale-90 border border-border/50 text-foreground",
          className
        )}
        aria-label={`Notifications${count > 0 ? ` (${count} unread)` : ""}`}
      >
        <Bell className={cn("w-4 h-4 text-primary", count > 0 && "animate-pulse-soft")} />

        {/* Unread badge */}
        <AnimatePresence>
          {count > 0 && (
            <motion.span
              key={count}
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0 }}
              className={cn(
                "absolute -top-1.5 -right-1.5 flex items-center justify-center",
                "min-w-[18px] h-[18px] px-1 rounded-full",
                "bg-primary text-primary-foreground text-[10px] font-black leading-none",
                "border-2 border-background shadow-sm"
              )}
            >
              {count > 99 ? "99+" : count}
            </motion.span>
          )}
        </AnimatePresence>
      </button>

      {/* Dropdown panel */}
      <AnimatePresence>
        {open && (
          <motion.div
            ref={panelRef}
            initial={{ opacity: 0, y: -8, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.95 }}
            transition={{ type: "spring", stiffness: 350, damping: 25 }}
            className={cn(
              "absolute top-full right-0 mt-2 w-80 sm:w-96 max-h-[70vh]",
              "bg-card/95 backdrop-blur-xl border border-border rounded-2xl shadow-xl z-[100]",
              "flex flex-col overflow-hidden"
            )}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-muted/30">
              <div className="flex items-center gap-2">
                <span className="text-base">🔔</span>
                <h3 className="text-sm font-extrabold text-foreground">
                  Notifications
                </h3>
                {count > 0 && (
                  <span className="text-[10px] font-black text-primary bg-primary/10 px-1.5 py-0.5 rounded-full">
                    {count} new
                  </span>
                )}
              </div>
              {count > 0 && (
                <button
                  onClick={handleMarkAllRead}
                  disabled={markAllRead.isPending}
                  className="text-[10px] font-bold text-primary hover:underline cursor-pointer disabled:opacity-50"
                >
                  Mark all read
                </button>
              )}
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto">
              {notifications.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
                  <motion.span
                    className="text-4xl mb-3"
                    animate={{ rotate: [0, 10, -10, 0] }}
                    transition={{ duration: 2, repeat: Infinity }}
                  >
                    🔕
                  </motion.span>
                  <p className="text-sm font-semibold text-foreground">
                    All caught up!
                  </p>
                  <p className="text-[10px] text-muted-foreground mt-1">
                    When your partner does something sweet, it&apos;ll show up here.
                  </p>
                </div>
              ) : (
                <AnimatePresence initial={false}>
                  {notifications.map((notif, i) => (
                    <NotificationItem
                      key={notif._id}
                      notif={notif}
                      index={i}
                      href={getHref(notif)}
                      onClose={() => setOpen(false)}
                    />
                  ))}
                </AnimatePresence>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

// ── Single notification item ──────────────────────────────

function NotificationItem({
  notif,
  index,
  href,
  onClose,
}: {
  notif: AppNotification;
  index: number;
  href: string;
  onClose: () => void;
}) {
  const markOneRead = useMarkOneRead();

  const actor =
    typeof notif.actorUserId === "object" ? notif.actorUserId : null;

  const timeAgo = formatDistanceToNow(new Date(notif.createdAt), {
    addSuffix: true,
  });

  return (
    <motion.a
      href={href}
      onClick={() => {
        if (!notif.isRead) markOneRead.mutate(notif._id);
        onClose();
      }}
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.03, type: "spring", stiffness: 300, damping: 25 }}
      className={cn(
        "flex items-start gap-3 px-4 py-3 border-b border-border/30 last:border-b-0",
        "hover:bg-muted/40 transition-colors cursor-pointer group",
        !notif.isRead && "bg-primary/[0.03]"
      )}
    >
      {/* Actor avatar */}
      <div className="relative w-9 h-9 rounded-lg overflow-hidden bg-primary/10 flex items-center justify-center shrink-0 border border-primary/10">
        {actor?.avatar ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={actor.avatar} alt={actor.name} className="w-full h-full object-cover" />
        ) : (
          <span className="text-xs font-bold text-primary uppercase">
            {actor?.name?.slice(0, 2) || "☕"}
          </span>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start gap-1.5">
          <span className="text-sm shrink-0">{notif.emoji}</span>
          <p className="text-sm font-medium text-foreground leading-snug truncate">
            {notif.title}
          </p>
        </div>
        <p className="text-[10px] text-muted-foreground mt-0.5 ml-6">
          {timeAgo}
        </p>
      </div>

      {/* Unread dot */}
      {!notif.isRead && (
        <div className="mt-2 w-2 h-2 rounded-full bg-primary shrink-0 shadow-sm animate-pulse-soft" />
      )}
    </motion.a>
  );
}
