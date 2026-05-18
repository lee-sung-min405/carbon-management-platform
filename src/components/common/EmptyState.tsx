"use client";

import { Inbox } from "lucide-react";
import { Button } from "@/components/ui/button";

export interface EmptyStateProps {
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
  icon?: React.ReactNode;
}

export function EmptyState({
  title,
  description,
  actionLabel,
  onAction,
  icon,
}: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-slate-200 bg-white px-6 py-12 text-center">
      <div className="rounded-full bg-slate-100 p-3 text-slate-500" aria-hidden>
        {icon ?? <Inbox className="h-6 w-6" />}
      </div>
      <div className="space-y-1">
        <p className="text-slate-900">{title}</p>
        {description && (
          <p className="text-sm text-slate-500">{description}</p>
        )}
      </div>
      {actionLabel && (
        <Button
          onClick={onAction}
          className="bg-emerald-700 hover:bg-emerald-800"
        >
          {actionLabel}
        </Button>
      )}
    </div>
  );
}
