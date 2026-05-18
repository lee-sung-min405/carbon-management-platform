"use client";

import { useHealth } from "@/lib/api/hooks";

type HealthLevel = "healthy" | "degraded" | "down" | "checking";

const STYLE: Record<HealthLevel, { dot: string; cls: string; text: string }> = {
  healthy: {
    dot: "bg-emerald-500",
    cls: "text-emerald-700 bg-emerald-50 border-emerald-200",
    text: "healthy",
  },
  degraded: {
    dot: "bg-amber-500",
    cls: "text-amber-700 bg-amber-50 border-amber-200",
    text: "degraded",
  },
  down: {
    dot: "bg-red-500",
    cls: "text-red-700 bg-red-50 border-red-200",
    text: "down",
  },
  checking: {
    dot: "bg-slate-400 animate-pulse",
    cls: "text-slate-600 bg-slate-50 border-slate-200",
    text: "checking",
  },
};

/**
 * `useHealth()` 를 직접 호출하는 Container 성격의 작은 위젯.
 * 30초 주기 폴링은 hook 기본값.
 */
export function HealthBadge() {
  const { data, error, isLoading } = useHealth();

  let level: HealthLevel = "checking";
  if (!isLoading) {
    if (error) level = "down";
    else if (data?.status === "ok" && data.db === "ok") level = "healthy";
    else level = "degraded";
  }

  const style = STYLE[level];
  const title =
    level === "healthy" && data
      ? `v${data.version} · uptime ${data.uptimeSec}s`
      : level === "down"
        ? "API 응답 실패"
        : "헬스체크 중";

  return (
    <span
      title={title}
      aria-label={`API ${style.text}`}
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs ${style.cls}`}
    >
      <span className={`h-2 w-2 rounded-full ${style.dot}`} aria-hidden />
      {style.text}
    </span>
  );
}
