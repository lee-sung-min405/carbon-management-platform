"use client";

import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { formatKgCO2e, formatShare } from "@/lib/format";

export interface DonutSlice {
  name: string;
  value: number;
  color: string;
}

export interface DonutProps {
  data: DonutSlice[];
  centerText: string;
  centerSub?: string;
  /** 접근성 표/제목 등에 노출할 차트 제목. */
  title?: string;
}

/**
 * 5단계/3 Scope 도넛의 공통 래퍼.
 * - 0인 슬라이스도 미세 wedge + 낮은 opacity 로 자리를 유지(누락 여부 시각화).
 * - Recharts import 는 본 파일과 `Bar.tsx` 두 곳으로만 한정.
 */
export function Donut({ data, centerText, centerSub, title }: DonutProps) {
  const total = data.reduce((s, d) => s + d.value, 0);
  const safeData = data.map((d) => ({
    ...d,
    value: d.value || 0.0001,
    originalValue: d.value,
  }));

  return (
    <div className="relative h-52" role="img" aria-label={title}>
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={safeData}
            dataKey="value"
            nameKey="name"
            innerRadius={56}
            outerRadius={82}
            paddingAngle={2}
            stroke="#fff"
            strokeWidth={2}
            isAnimationActive={false}
          >
            {safeData.map((d, i) => (
              <Cell
                key={i}
                fill={d.color}
                opacity={d.originalValue === 0 ? 0.15 : 1}
              />
            ))}
          </Pie>
          <Tooltip
            contentStyle={{
              fontSize: 12,
              borderRadius: 8,
              border: "1px solid #e2e8f0",
            }}
            formatter={(_v, name, p) => {
              const original =
                (p as { payload?: { originalValue?: number } }).payload
                  ?.originalValue ?? 0;
              const share = total > 0 ? original / total : 0;
              return [
                `${formatKgCO2e(original)} (${formatShare(share)})`,
                name,
              ];
            }}
          />
        </PieChart>
      </ResponsiveContainer>
      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
        <p className="font-mono text-sm text-slate-900">{centerText}</p>
        {centerSub && <p className="text-xs text-slate-500">{centerSub}</p>}
      </div>
    </div>
  );
}
