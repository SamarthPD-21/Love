"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/stores/useAuthStore";
import { AppShell } from "@/components/layout/AppShell";
import { Loader2, Heart } from "lucide-react";

export default function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const { isAuthenticated, isLoading } = useAuthStore();

  useEffect(() => {
    // If auth state initialization is done and user is not authenticated, redirect to login
    if (!isLoading && !isAuthenticated) {
      router.replace("/login");
    }
  }, [isLoading, isAuthenticated, router]);

  // Show a beautiful, cozy loading screen while checking auth status
  if (isLoading) {
    return (
      <div className="min-h-dvh w-full flex flex-col items-center justify-center bg-gradient-to-br from-[#FDF6F0] via-[#F2D4D8] to-[#E8D4EC] dark:from-[#0F0A1A] dark:via-[#1A1030] dark:to-[#12101E]">
        <div className="relative flex flex-col items-center gap-4">
          <div className="relative">
            <div className="absolute inset-0 bg-primary/20 rounded-full blur-xl animate-pulse" />
            <Heart className="w-12 h-12 text-primary fill-primary animate-heartbeat relative z-10" />
          </div>
          <p className="handwritten text-xl font-medium text-muted-foreground animate-pulse-soft">
            Opening our home...
          </p>
        </div>
      </div>
    );
  }

  // If not authenticated, render nothing while redirecting
  if (!isAuthenticated) {
    return null;
  }

  // If authenticated, render app shell
  return <AppShell>{children}</AppShell>;
}
