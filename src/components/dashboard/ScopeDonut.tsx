"use client";

import { Donut } from "@/components/charts/Donut";
import { formatKgCO2e, formatShare } from "@/lib/format";
import { SCOPE_COLOR } from "@/lib/ui/palette";
import { scopeLabel } from "@/lib/adapters/dashboard";
import type { ScopeSummary } from "@/domain/pcf/types";

export interface ScopeDonutProps {
  data: ScopeSummary[];
}

/**
 * 3 Scope 도넛 + 범례.
 * - StagePieChart 와 props enum 이 달라 별도 컴포넌트로 분리.
 * - 0 Scope 도 자리 유지 (전력열 vs 공급망 비교 시 누락 판단).
 */
export function ScopeDonut({ data }: ScopeDonutProps) {
  const total = data.reduce((s, d) => s + d.kgCO2e, 0);
  const slices = data.map((d) => ({
    name: scopeLabel(d.scope),
    value: d.kgCO2e,
    color: SCOPE_COLOR[d.scope],
  }));

  return (
    <div className="flex h-full flex-col rounded-lg border border-slate-200 bg-white p-5">
      <p className="text-sm text-slate-700">GHG Scope별 비중</p>
      <Donut
        data={slices}
        centerText={formatKgCO2e(total).replace(" kgCO2e", "")}
        centerSub="kgCO2e"
        title="Scope별 PCF 도넛 차트"
      />
      <ul className="mt-2 space-y-1">
        {data.map((d) => (
          <li
            key={d.scope}
            className="flex items-center justify-between gap-2 text-xs"
          >
            <span className="flex min-w-0 items-center gap-2 text-slate-700">
              <span
                className="h-2.5 w-2.5 shrink-0 rounded-sm"
                style={{ background: SCOPE_COLOR[d.scope] }}
                aria-hidden
              />
              <span className="truncate">{scopeLabel(d.scope)}</span>
            </span>
            <span className="shrink-0 font-mono text-slate-600">
              {formatKgCO2e(d.kgCO2e)} · {formatShare(d.share)}
            </span>
          </li>
        ))}
      </ul>
      <p className="mt-3 border-t border-slate-100 pt-3 text-xs text-slate-500">
        <span className="text-slate-700">왜 이 차트인가 · </span>
        전력 사용(Scope 2)과 공급망 배출(Scope 3)의 영향을 구분합니다.
      </p>
    </div>
  );
}
