"use client";

import { Info } from "lucide-react";
import { formatNumber } from "@/lib/format";
import { STAGE_COLOR, SCOPE_COLOR, SCOPE_SHORT } from "@/lib/ui/palette";
import { stageLabel } from "@/lib/adapters/dashboard";
import type { Factor } from "@/types/api";

export interface CalculationBasisNoteProps {
  factors: Factor[];
  /** 한 개라도 isDemo 인 계수가 있으면 경고 노출. */
  isDemo: boolean;
}

/**
 * 4공식 안내 + 배출계수 출처 미니 표 + DEMO 경고.
 */
export function CalculationBasisNote({
  factors,
  isDemo,
}: CalculationBasisNoteProps) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-5">
      <div className="flex items-center gap-2">
        <Info className="h-4 w-4 text-emerald-700" aria-hidden />
        <p className="text-sm text-slate-700">계산 기준</p>
      </div>
      <ul className="mt-3 space-y-1.5 text-xs text-slate-600">
        <Formula label="일반 활동 배출량" expr="활동량 × 배출계수 × 할당비율" />
        <Formula label="운송 배출량" expr="ton-km × 배출계수 × 할당비율" />
        <Formula label="ton-km" expr="(중량 kg / 1000) × 거리 km" />
        <Formula label="총 PCF" expr="모든 활동별 배출량 합계" />
        {isDemo && (
          <li className="text-amber-700">
            ※ 배출계수는 DEMO ONLY 샘플 데이터이며 인증/보고 용도로 사용할 수
            없습니다.
          </li>
        )}
      </ul>

      <div className="mt-4">
        <p className="text-xs uppercase tracking-wide text-slate-500">
          배출계수 출처 ({factors.length}개)
        </p>
        <div className="mt-2 overflow-x-auto rounded-md border border-slate-200">
          <table className="w-full min-w-[560px] text-xs">
            <thead className="bg-slate-50 text-slate-500">
              <tr>
                <th className="px-3 py-2 text-left">이름</th>
                <th className="px-3 py-2 text-left">단계</th>
                <th className="px-3 py-2 text-left">Scope</th>
                <th className="px-3 py-2 text-right">값</th>
                <th className="px-3 py-2 text-left">단위</th>
                <th className="px-3 py-2 text-left">출처</th>
              </tr>
            </thead>
            <tbody>
              {factors.map((f) => (
                <tr key={f.id} className="border-t border-slate-100">
                  <td className="px-3 py-2 text-slate-800">{f.name}</td>
                  <td className="px-3 py-2">
                    <ChipInline color={STAGE_COLOR[f.stageCode]}>
                      {stageLabel(f.stageCode)}
                    </ChipInline>
                  </td>
                  <td className="px-3 py-2">
                    <ChipInline color={SCOPE_COLOR[f.scope]}>
                      {SCOPE_SHORT[f.scope]}
                    </ChipInline>
                  </td>
                  <td className="px-3 py-2 text-right font-mono">
                    {formatNumber(f.value, 6)}
                  </td>
                  <td className="px-3 py-2 text-slate-600">{f.unit}</td>
                  <td className="px-3 py-2 text-amber-700">{f.source ?? "-"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function Formula({ label, expr }: { label: string; expr: string }) {
  return (
    <li>
      <span className="text-slate-500">{label}</span>{" "}
      <span className="font-mono text-slate-800">= {expr}</span>
    </li>
  );
}

function ChipInline({
  color,
  children,
}: {
  color: string;
  children: React.ReactNode;
}) {
  return (
    <span className="inline-flex items-center gap-1.5 text-slate-700">
      <span
        className="h-2 w-2 rounded-sm"
        style={{ background: color }}
        aria-hidden
      />
      {children}
    </span>
  );
}
