"use client";

import { formatKgCO2e } from "@/lib/format";

export interface BarRow {
  label: string;
  value: number;
  color: string;
}

export interface BarProps {
  rows: BarRow[];
}

/**
 * 가로 막대 (단계별 배출량 등).
 * - 0 행도 항상 노출 (5단계 일관성).
 * - 의도적으로 Recharts 사용 안 함 — 단순 div bar로 SSR/번들 부담 줄임.
 *   Donut 만 Recharts 에 의존.
 */
export function Bar({ rows }: BarProps) {
  const max = Math.max(...rows.map((r) => r.value), 1);
  return (
    <div className="space-y-3">
      {rows.map((r) => {
        const pct = (r.value / max) * 100;
        return (
          <div
            key={r.label}
            className="grid grid-cols-[80px_1fr_140px] items-center gap-3 sm:grid-cols-[96px_1fr_160px]"
          >
            <div className="flex min-w-0 items-center gap-2 text-sm text-slate-700">
              <span
                className="h-2.5 w-2.5 shrink-0 rounded-sm"
                style={{ background: r.color }}
                aria-hidden
              />
              <span className="truncate">{r.label}</span>
            </div>
            <div className="h-3 rounded-full bg-slate-100">
              <div
                className="h-3 rounded-full"
                style={{
                  width: `${Math.max(pct, r.value === 0 ? 0 : 2)}%`,
                  background: r.color,
                  opacity: r.value === 0 ? 0.2 : 1,
                }}
              />
            </div>
            <div className="text-right font-mono text-sm text-slate-700">
              {formatKgCO2e(r.value)}
            </div>
          </div>
        );
      })}
    </div>
  );
}
