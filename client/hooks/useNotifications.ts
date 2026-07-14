"use client";

import { useEffect, useRef } from "react";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import api from "@/lib/api";
import { onNotification } from "@/lib/socket";
import { useSoundEffects } from "@/hooks/useSoundEffects";
import { useToastStore } from "@/stores/useToastStore";
import { useCelebrationStore } from "@/stores/useCelebrationStore";
import type { AppNotification } from "@/types";

// ── Queries & Mutations ────────────────────────────────────

export function useUnreadCount() {
  return useQuery({
    queryKey: ["notifications", "unread"],
    queryFn: async () => {
      const res = await api.get("/notifications/unread-count");
      return (res.data as { success: boolean; count: number }).count;
    },
    staleTime: 30_000,
    refetchInterval: 30_000,
    refetchOnWindowFocus: true,
  });
}

export function useNotifications(limit = 30) {
  return useQuery({
    queryKey: ["notifications", limit],
    queryFn: async () => {
      const res = await api.get(`/notifications?limit=${limit}`);
      return (res.data as { success: boolean; data: AppNotification[] }).data;
    },
    staleTime: 30_000,
    refetchOnWindowFocus: true,
  });
}

export function useMarkAllRead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      await api.patch("/notifications/read");
    },
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: ["notifications"] });
      const previousQueries = queryClient.getQueriesData({ queryKey: ["notifications"] });

      queryClient.setQueryData(["notifications", "unread"], 0);
      queryClient.setQueriesData({ queryKey: ["notifications"] }, (old: any, query: any) => {
        const key = query.queryKey;
        if (key.length === 2 && typeof key[1] === "number") {
          return old?.map((n: any) => ({ ...n, isRead: true })) || [];
        }
        return old;
      });

      return { previousQueries };
    },
    onError: (err, variables, context) => {
      if (context?.previousQueries) {
        context.previousQueries.forEach(([queryKey, queryData]) => {
          queryClient.setQueryData(queryKey, queryData);
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
  });
}

export function useMarkOneRead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await api.patch(`/notifications/${id}/read`);
    },
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: ["notifications"] });
      const previousQueries = queryClient.getQueriesData({ queryKey: ["notifications"] });

      queryClient.setQueryData(["notifications", "unread"], (old: number | undefined) => {
        if (old === undefined) return 0;
        return Math.max(0, old - 1);
      });
      queryClient.setQueriesData({ queryKey: ["notifications"] }, (old: any, query: any) => {
        const key = query.queryKey;
        if (key.length === 2 && typeof key[1] === "number") {
          const ids = id.split(",");
          return old?.map((n: any) => ids.includes(n._id) ? { ...n, isRead: true } : n) || [];
        }
        return old;
      });

      return { previousQueries };
    },
    onError: (err, variables, context) => {
      if (context?.previousQueries) {
        context.previousQueries.forEach(([queryKey, queryData]) => {
          queryClient.setQueryData(queryKey, queryData);
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
  });
}

export function useDismissNotification() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/notifications/${id}`);
    },
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: ["notifications"] });
      const previousQueries = queryClient.getQueriesData({ queryKey: ["notifications"] });

      // Determine if dismissed notification was unread so we can update count
      let wasUnread = false;

      queryClient.setQueriesData({ queryKey: ["notifications"] }, (old: any, query: any) => {
        const key = query.queryKey;
        if (key.length === 2 && typeof key[1] === "number") {
          const found = old?.find((n: any) => n._id === id);
          if (found && !found.isRead) {
            wasUnread = true;
          }
          return old?.filter((n: any) => n._id !== id) || [];
        }
        return old;
      });

      if (wasUnread) {
        queryClient.setQueryData(["notifications", "unread"], (old: number | undefined) => {
          if (old === undefined) return 0;
          return Math.max(0, old - 1);
        });
      }

      return { previousQueries };
    },
    onError: (err, variables, context) => {
      if (context?.previousQueries) {
        context.previousQueries.forEach(([queryKey, queryData]) => {
          queryClient.setQueryData(queryKey, queryData);
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
  });
}

// ── Live Socket Listener ────────────────────────────────────

/**
 * Hook that subscribes to real-time notification pushes via socket.io.
 * Mount this ONCE at the AppShell level so it lives for the whole session.
 *
 * On each incoming notification it:
 *  1. Invalidates unread-count + list queries.
 *  2. Plays the "notification" sound effect.
 *  3. Shows a celebratory toast with the notification title & emoji.
 *  4. Triggers confetti for "big" notification types (hug, milestone, etc).
 */
export function useLiveNotifications() {
  const queryClient = useQueryClient();
  const { playSound } = useSoundEffects();
  const showToast = useToastStore((s) => s.showToast);
  const celebrate = useCelebrationStore((s) => s.celebrate);
  const lastCountRef = useRef<number | null>(null);

  // Watch unread count and trigger a celebratory burst when it increases.
  const { data: count } = useUnreadCount();
  useEffect(() => {
    if (count === undefined) return;
    if (lastCountRef.current !== null && count > lastCountRef.current) {
      // Count went up — a new unread notification arrived.
      playSound("notification");
    }
    lastCountRef.current = count;
  }, [count, playSound]);

  // Subscribe to socket pushes.
  useEffect(() => {
    const unsubscribe = onNotification((payload: unknown) => {
      const notif = payload as AppNotification & { isCelebration?: boolean };

      // Refresh queries
      queryClient.invalidateQueries({ queryKey: ["notifications"] });

      // Sound
      playSound("notification");

      // Toast
      showToast(notif.title, "celebration", notif.emoji);

      // Confetti for big events
      if (notif.isCelebration) {
        celebrate("big", notif.emoji);
      }
    });

    return () => {
      unsubscribe();
    };
  }, [queryClient, playSound, showToast, celebrate]);
}
