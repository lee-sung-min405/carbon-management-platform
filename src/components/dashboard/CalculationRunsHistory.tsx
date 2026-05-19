"use client";

import { useState } from "react";
import { ChevronDown, ChevronRight, History } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/common/EmptyState";
import { formatDateTime, formatKgCO2e } from "@/lib/format";
import type { CalculationRun, RunMeta } from "@/types/api";

export interface CalculationRunsHistoryProps {
  runs: RunMeta[];
  /** 현 세션에서 막 실행한 run (items + snapshotJson 포함). 그 외 run 은 JSON 펼침 불가. */
  lastSession?: CalculationRun | null;
  onCalculate?: () => void;
  isCalculating?: boolean;
}

/**
 * 계산 이력 표.
 * - 백엔드에 단건 run 상세 API 가 없어 "현 세션에서 실행한 run" 만 JSON 펼침 가능.
 * - 그 외 row 는 안내문 fallback.
 */
export function CalculationRunsHistory({
  runs,
  lastSession,
  onCalculate,
  isCalculating,
}: CalculationRunsHistoryProps) {
  const [openId, setOpenId] = useState<string | null>(null);

  if (runs.length === 0) {
    return (
      <EmptyState
        icon={<History className="h-6 w-6" aria-hidden />}
        title="아직 계산 이력이 없습니다."
        description="‘계산 실행’ 으로 첫 PCF 계산을 수행해 보세요."
        actionLabel={onCalculate ? "계산 실행" : undefined}
        onAction={onCalculate}
      />
    );
  }

  return (
    <div className="rounded-lg border border-slate-200 bg-white">
      <div className="flex items-center justify-between gap-2 border-b border-slate-200 p-5">
        <div>
          <p className="text-sm text-slate-700">계산 이력</p>
          <p className="mt-1 text-xs text-slate-500">
            총 {runs.length}건 · 현 세션에서 실행한 결과만 JSON 펼침 가능
          </p>
        </div>
        {onCalculate && (
          <Button
            type="button"
            variant="outline"
            onClick={onCalculate}
            disabled={isCalculating}
          >
            다시 계산 실행
          </Button>
        )}
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[640px] text-sm">
          <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-4 py-3 text-left">실행 시각</th>
              <th className="px-4 py-3 text-right">총 PCF</th>
              <th className="px-4 py-3 text-left">Run ID</th>
              <th className="px-4 py-3 text-right">JSON</th>
            </tr>
          </thead>
          <tbody>
            {runs.map((r) => {
              const isCurrent = lastSession?.id === r.id;
              const isOpen = openId === r.id;
              return (
                <Row
                  key={r.id}
                  run={r}
                  isCurrent={isCurrent}
                  isOpen={isOpen}
                  onToggle={() => setOpenId(isOpen ? null : r.id)}
                  snapshot={isCurrent ? lastSession?.snapshotJson : undefined}
                />
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Row({
  run,
  isCurrent,
  isOpen,
  onToggle,
  snapshot,
}: {
  run: RunMeta;
  isCurrent: boolean;
  isOpen: boolean;
  onToggle: () => void;
  snapshot?: unknown;
}) {
  return (
    <>
      <tr className="border-t border-slate-100">
        <td className="px-4 py-3 font-mono text-slate-700">
          {formatDateTime(run.runAt)}
        </td>
        <td className="px-4 py-3 text-right font-mono text-emerald-700">
          {formatKgCO2e(run.totalKgCO2e)}
        </td>
        <td className="px-4 py-3 font-mono text-xs text-slate-500">
          {run.id.slice(0, 8)}
          {isCurrent && (
            <span className="ml-2 rounded bg-emerald-50 px-1.5 py-0.5 text-[10px] font-medium text-emerald-700">
              현 세션
            </span>
          )}
        </td>
        <td className="px-4 py-3 text-right">
          <Button
            type="button"
            size="sm"
            variant="ghost"
            onClick={onToggle}
            aria-expanded={isOpen}
            aria-controls={`run-json-${run.id}`}
          >
            {isOpen ? (
              <ChevronDown className="mr-1 h-4 w-4" aria-hidden />
            ) : (
              <ChevronRight className="mr-1 h-4 w-4" aria-hidden />
            )}
            JSON
          </Button>
        </td>
      </tr>
      {isOpen && (
        <tr className="border-t border-slate-100 bg-slate-50">
          <td colSpan={4} className="px-4 py-3">
            <div id={`run-json-${run.id}`}>
              {isCurrent && snapshot != null ? (
                <pre className="max-h-80 overflow-auto rounded-md border border-slate-200 bg-white p-3 font-mono text-[11px] text-slate-700">
                  {JSON.stringify(snapshot, null, 2)}
                </pre>
              ) : (
                <p className="text-xs text-slate-500">
                  이번 세션 이전의 계산 결과입니다 — 단건 run 상세 API 가
                  제공되지 않아 JSON 을 불러올 수 없습니다. ‘다시 계산 실행’ 후
                  새 row 의 JSON 을 펼쳐 보세요.
                </p>
              )}
            </div>
          </td>
        </tr>
      )}
    </>
  );
}
