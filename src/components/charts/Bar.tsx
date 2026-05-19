"use client";

import { formatKgCO2e, formatShare } from "@/lib/format";

export interface BarRow {
  label: string;
  value: number;
  color: string;
}

export interface BarProps {
  rows: BarRow[];
  /** 스크린리더 전용 동등 표의 caption. */
  title?: string;
}

/**
 * 가로 막대 (단계별 배출량 등).
 * - 0 행도 항상 노출 (5단계 일관성).
 * - 의도적으로 Recharts 사용 안 함 — 단순 div bar로 SSR/번들 부담 줄임.
 *   Donut 만 Recharts 에 의존.
 */
export function Bar({ rows, title }: BarProps) {
  const max = Math.max(...rows.map((r) => r.value), 1);
  const total = rows.reduce((s, r) => s + r.value, 0);
  return (
    <div className="space-y-3">
      {/* 스크린리더 전용 동등 표 — 시각 div bar 와 동일 데이터. */}
      <table className="sr-only">
        <caption>{title ?? "단계별 배출량"}</caption>
        <thead>
          <tr>
            <th scope="col">항목</th>
            <th scope="col">배출량</th>
            <th scope="col">비중</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.label}>
              <th scope="row">{r.label}</th>
              <td>{formatKgCO2e(r.value)}</td>
              <td>{formatShare(total > 0 ? r.value / total : 0)}</td>
            </tr>
          ))}
        </tbody>
      </table>
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
