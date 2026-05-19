"use client";

import { Info } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { formatKgCO2e, formatNumber, formatShare } from "@/lib/format";
import { STAGE_COLOR, SCOPE_COLOR, SCOPE_SHORT } from "@/lib/ui/palette";
import { stageLabel } from "@/lib/adapters/dashboard";
import type { TopEmitterRow } from "@/lib/adapters/dashboard";

export interface TopEmittersTableProps {
  rows: TopEmitterRow[];
}

/**
 * 상위 배출 활동 표.
 * - 행마다 "계산식 보기" tooltip — 활동 유형별 4공식 중 하나를 정확히 노출.
 */
export function TopEmittersTable({ rows }: TopEmittersTableProps) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white">
      <div className="border-b border-slate-200 p-5">
        <p className="text-sm text-slate-700">상위 배출 활동 Top {rows.length}</p>
        <p className="mt-1 text-xs text-slate-500">
          감축 우선순위를 판단하기 위한 활동 정렬
        </p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[640px] text-sm">
          <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-5 py-3 text-left">순위</th>
              <th className="px-5 py-3 text-left">활동명</th>
              <th className="px-5 py-3 text-left">단계</th>
              <th className="px-5 py-3 text-left">Scope</th>
              <th className="px-5 py-3 text-right">계산 배출량</th>
              <th className="px-5 py-3 text-left">전체 대비 비중</th>
              <th className="px-5 py-3 text-right">계산식</th>
            </tr>
          </thead>
          <tbody>
            <TooltipProvider delayDuration={150}>
              {rows.map((r) => (
                <tr key={r.activityId} className="border-t border-slate-100">
                  <td className="px-5 py-3 font-mono text-slate-700">
                    #{r.rank}
                  </td>
                  <td className="px-5 py-3 text-slate-900">{r.name}</td>
                  <td className="px-5 py-3">
                    <Chip color={STAGE_COLOR[r.stageCode]}>
                      {stageLabel(r.stageCode)}
                    </Chip>
                  </td>
                  <td className="px-5 py-3">
                    <Chip color={SCOPE_COLOR[r.scope]}>
                      {SCOPE_SHORT[r.scope]}
                    </Chip>
                  </td>
                  <td className="px-5 py-3 text-right font-mono text-slate-900">
                    {formatKgCO2e(r.kgCO2e)}
                  </td>
                  <td className="px-5 py-3">
                    <div
                      className="flex items-center gap-2"
                      aria-label={`전체 대비 비중 ${formatShare(r.share)}`}
                    >
                      <div className="h-1.5 w-24 rounded-full bg-slate-100">
                        <div
                          className="h-1.5 rounded-full bg-emerald-600"
                          style={{
                            width: `${Math.min(r.share * 100, 100)}%`,
                          }}
                        />
                      </div>
                      <span className="font-mono text-xs text-slate-600">
                        {formatShare(r.share)}
                      </span>
                    </div>
                  </td>
                  <td className="px-5 py-3 text-right">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button
                          type="button"
                          className="inline-flex items-center gap-1 rounded-md border border-slate-200 px-2 py-1 text-xs text-slate-600 hover:bg-slate-50"
                          aria-label={`${r.name} 계산식 보기`}
                        >
                          <Info className="h-3 w-3" aria-hidden /> 계산식 보기
                        </button>
                      </TooltipTrigger>
                      <TooltipContent side="left" className="max-w-xs">
                        <FormulaLine row={r} />
                      </TooltipContent>
                    </Tooltip>
                  </td>
                </tr>
              ))}
            </TooltipProvider>
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Chip({
  color,
  children,
}: {
  color: string;
  children: React.ReactNode;
}) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-md border border-slate-200 bg-slate-50 px-2 py-0.5 text-xs text-slate-700">
      <span
        className="h-2 w-2 rounded-sm"
        style={{ background: color }}
        aria-hidden
      />
      {children}
    </span>
  );
}

function FormulaLine({ row }: { row: TopEmitterRow }) {
  const { formula, kgCO2e } = row;
  if (formula.type === "transport-derived") {
    const tonKm =
      ((formula.weightKg ?? 0) / 1000) * (formula.distanceKm ?? 0);
    return (
      <>
        <p className="text-xs">
          ({formatNumber(formula.weightKg ?? 0)} kg / 1000) ×{" "}
          {formatNumber(formula.distanceKm ?? 0)} km ={" "}
          {formatNumber(tonKm)} ton-km
        </p>
        <p className="text-xs">
          {formatNumber(tonKm)} ton-km × {formatNumber(formula.factorValue)}{" "}
          {formula.factorUnit} × {formatNumber(formula.allocationRatio)}
        </p>
        <p className="mt-1 font-mono text-xs">= {formatKgCO2e(kgCO2e)}</p>
      </>
    );
  }

  return (
    <>
      <p className="text-xs">
        {formatNumber(formula.amount)} {formula.unit} ×{" "}
        {formatNumber(formula.factorValue)} {formula.factorUnit} ×{" "}
        {formatNumber(formula.allocationRatio)}
      </p>
      <p className="mt-1 font-mono text-xs">= {formatKgCO2e(kgCO2e)}</p>
    </>
  );
}
