"use client";

import { Bar } from "@/components/charts/Bar";
import { STAGE_COLOR } from "@/lib/ui/palette";
import { stageLabel } from "@/lib/adapters/dashboard";
import type { StageSummary } from "@/domain/pcf/types";

export interface StageBarChartProps {
  data: StageSummary[];
}

/**
 * 단계별 배출량 가로 막대.
 * - 5단계 모두 표시 (0도 노출).
 * - 단계 색은 `STAGE_COLOR` 와 1:1 고정.
 */
export function StageBarChart({ data }: StageBarChartProps) {
  const rows = data.map((d) => ({
    label: stageLabel(d.stageCode),
    value: d.kgCO2e,
    color: STAGE_COLOR[d.stageCode],
  }));

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-5">
      <div className="mb-4 flex items-center justify-between gap-3">
        <p className="text-sm text-slate-700">단계별 배출량</p>
        <p className="text-xs text-slate-500">단위: kgCO2e</p>
      </div>
      <Bar rows={rows} title="단계별 배출량 막대 그래프" />
      <p className="mt-4 text-xs text-slate-500">
        5단계를 모두 노출해 배출이 없는 단계도 확인할 수 있습니다.
      </p>
    </div>
  );
}
