"use client";

import { Loader2 } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

export type LoadingVariant = "skeleton-table" | "skeleton-card" | "spinner";

export interface LoadingStateProps {
  variant?: LoadingVariant;
  rows?: number;
  label?: string;
}

export function LoadingState({
  variant = "spinner",
  rows = 4,
  label = "불러오는 중…",
}: LoadingStateProps) {
  if (variant === "skeleton-table") {
    return (
      <div
        role="status"
        aria-label={label}
        className="space-y-2 rounded-lg border border-slate-200 bg-white p-4"
      >
        <Skeleton className="h-6 w-1/3" />
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="flex gap-4 py-2">
            <Skeleton className="h-5 w-1/5" />
            <Skeleton className="h-5 w-1/6" />
            <Skeleton className="h-5 w-1/6" />
            <Skeleton className="h-5 w-1/6" />
            <Skeleton className="h-5 w-1/6" />
            <Skeleton className="h-5 w-1/6" />
          </div>
        ))}
      </div>
    );
  }

  if (variant === "skeleton-card") {
    return (
      <div
        role="status"
        aria-label={label}
        className="space-y-3 rounded-lg border border-slate-200 bg-white p-6"
      >
        <Skeleton className="h-7 w-1/2" />
        <Skeleton className="h-12 w-2/3" />
        <Skeleton className="h-5 w-1/3" />
      </div>
    );
  }

  return (
    <div
      role="status"
      aria-label={label}
      className="flex items-center justify-center gap-2 py-12 text-sm text-slate-500"
    >
      <Loader2 className="h-5 w-5 animate-spin text-emerald-700" aria-hidden />
      <span>{label}</span>
    </div>
  );
}
