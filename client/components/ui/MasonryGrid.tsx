import React from "react";
import { cn } from "@/lib/utils";

interface MasonryGridProps {
  children: React.ReactNode;
  className?: string;
}

export function MasonryGrid({ children, className }: MasonryGridProps) {
  return (
    <div
      className={cn(
        "columns-1 sm:columns-2 md:columns-3 gap-4 [column-fill:_balance] w-full",
        className
      )}
    >
      {React.Children.map(children, (child) => {
        if (!child) return null;
        return (
          <div className="break-inside-avoid mb-4 inline-block w-full">
            {child}
          </div>
        );
      })}
    </div>
  );
}
