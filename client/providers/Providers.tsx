"use client";

import { QueryClientProvider } from "@tanstack/react-query";
import { ThemeProvider } from "next-themes";
import { useEffect } from "react";
import { queryClient } from "@/lib/queryClient";
import { useAuthStore } from "@/stores/useAuthStore";

if (typeof window !== "undefined" && process.env.NODE_ENV === "development") {
  const originalError = console.error;
  console.error = (...args: any[]) => {
    if (typeof args[0] === "string" && args[0].includes("Encountered a script tag")) return;
    originalError.apply(console, args);
  };
}

function AuthInitializer({ children }: { children: React.ReactNode }) {
  const initialize = useAuthStore((s) => s.initialize);

  useEffect(() => {
    initialize();
  }, [initialize]);

  return <>{children}</>;
}

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider
      attribute="data-theme"
      defaultTheme="light"
      enableSystem={false}
      disableTransitionOnChange={false}
    >
      <QueryClientProvider client={queryClient}>
        <AuthInitializer>
          {children}
        </AuthInitializer>
      </QueryClientProvider>
    </ThemeProvider>
  );
}
