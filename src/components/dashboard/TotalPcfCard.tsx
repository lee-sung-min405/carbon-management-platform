"use client";

import { formatKgCO2e, formatShare, formatDateTime } from "@/lib/format";
import type { DashboardInsights } from "@/lib/adapters/dashboard";

export interface TotalPcfCardProps {
  total: number;
  functionalUnit: string;
  calculatedAt: string | null;
  insights: DashboardInsights;
}

/**
 * 총 PCF 큰 숫자 + "핵심 인사이트" 4행 (최대 단계 / 최대 Scope / 최대 활동 / 데이터 카운트).
 * - calculatedAt 이 null 이면 "아직 계산 안 됨" 안내.
 */
export function TotalPcfCard({
  total,
  functionalUnit,
  calculatedAt,
  insights,
}: TotalPcfCardProps) {
  return (
    <div className="flex h-full flex-col rounded-lg border border-slate-200 bg-white p-5">
      <p className="text-sm text-slate-500">총 PCF</p>
      <div className="mt-2 flex items-baseline gap-2">
        <span className="font-mono text-3xl font-semibold tracking-tight text-slate-900">
          {formatKgCO2e(total).replace(" kgCO2e", "")}
        </span>
        <span className="text-sm text-slate-500">kgCO2e</span>
      </div>
      <p className="mt-1 text-xs text-slate-500">
        기능단위 {functionalUnit}
        {calculatedAt && <> · 최근 계산 {formatDateTime(calculatedAt)}</>}
      </p>

      <div className="mt-4 border-t border-slate-100 pt-4">
        <p className="mb-2 text-xs uppercase tracking-wide text-slate-500">
          핵심 인사이트
        </p>
        <ul className="space-y-1.5 text-xs text-slate-700">
          <InsightRow label="최대 배출 단계">
            {insights.topStage ? (
              <>
                {insights.topStage.label} ·{" "}
                <span className="font-mono text-emerald-700">
                  {formatShare(insights.topStage.share)}
                </span>
              </>
            ) : (
              <span className="text-slate-400">—</span>
            )}
          </InsightRow>
          <InsightRow label="최대 Scope">
            {insights.topScope ? (
              <>
                {insights.topScope.label} ·{" "}
                <span className="font-mono text-emerald-700">
                  {formatShare(insights.topScope.share)}
                </span>
              </>
            ) : (
              <span className="text-slate-400">—</span>
            )}
          </InsightRow>
          <InsightRow label="최대 배출 활동">
            <span className="text-slate-900">
              {insights.topActivityName ?? (
                <span className="text-slate-400">—</span>
              )}
            </span>
          </InsightRow>
          <InsightRow label="계산 데이터">
            <span className="font-mono text-slate-900">
              활동 {insights.activityCount}건 · 배출계수{" "}
              {insights.factorCount}개
            </span>
          </InsightRow>
        </ul>
      </div>
    </div>
  );
}

function InsightRow({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <li className="flex items-start justify-between gap-2">
      <span className="text-slate-500">{label}</span>
      <span className="text-right">{children}</span>
    </li>
  );
}
