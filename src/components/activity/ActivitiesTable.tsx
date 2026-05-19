"use client";

import { useState } from "react";
import { Pencil, Trash2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { EmptyState } from "@/components/common/EmptyState";
import { ApiClientError } from "@/lib/http";
import { deleteActivity } from "@/lib/api/mutations";
import { getErrorMessage } from "@/lib/api/error-messages";
import { formatKgCO2e, formatNumber } from "@/lib/format";
import { STAGE_COLOR } from "@/lib/ui/palette";
import { stageLabel } from "@/lib/adapters/dashboard";
import type { Activity } from "@/types/api";

export interface ActivitiesTableProps {
  activities: Activity[];
  onEdit?: (activity: Activity) => void;
  /** 삭제 성공 후 호출 (부모 mutate 트리거). */
  onDeleted?: () => void;
}

/**
 * 제품의 활동 목록 표.
 * - 계산 배출량은 활동 유형별 4공식 중 하나로 인라인 계산 (서버 계산 결과와 동일).
 * - 행별 수정/삭제 — 삭제는 confirm Dialog 후 `deleteActivity`.
 */
export function ActivitiesTable({
  activities,
  onEdit,
  onDeleted,
}: ActivitiesTableProps) {
  const [target, setTarget] = useState<Activity | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const handleConfirmDelete = async () => {
    if (!target) return;
    setIsDeleting(true);
    setDeleteError(null);
    try {
      await deleteActivity(target.id);
      setTarget(null);
      onDeleted?.();
    } catch (err) {
      setDeleteError(
        err instanceof ApiClientError ? getErrorMessage(err) : getErrorMessage(err),
      );
    } finally {
      setIsDeleting(false);
    }
  };

  if (activities.length === 0) {
    return (
      <EmptyState
        title="등록된 활동이 없습니다."
        description="위 폼에서 활동을 추가하면 표에 표시됩니다."
      />
    );
  }

  return (
    <>
      <div className="rounded-lg border border-slate-200 bg-white">
        <div className="border-b border-slate-200 p-5">
          <p className="text-sm text-slate-700">활동 데이터</p>
          <p className="mt-1 text-xs text-slate-500">총 {activities.length}건</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[920px] text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3 text-left">활동명</th>
                <th className="px-4 py-3 text-left">단계</th>
                <th className="px-4 py-3 text-right">활동량</th>
                <th className="px-4 py-3 text-left">단위</th>
                <th className="px-4 py-3 text-right">배출계수</th>
                <th className="px-4 py-3 text-right">할당비율</th>
                <th className="px-4 py-3 text-right">계산 배출량</th>
                <th className="px-4 py-3 text-left">발생일</th>
                <th className="px-4 py-3 text-right">작업</th>
              </tr>
            </thead>
            <tbody>
              {activities.map((a) => {
                const emission = computeEmission(a);
                const display = displayAmount(a);
                return (
                  <tr key={a.id} className="border-t border-slate-100">
                    <td className="px-4 py-3 text-slate-900">{a.name}</td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center gap-1.5 rounded-md border border-slate-200 bg-slate-50 px-2 py-0.5 text-xs text-slate-700">
                        <span
                          className="h-2 w-2 rounded-sm"
                          style={{ background: STAGE_COLOR[a.stageCode] }}
                          aria-hidden
                        />
                        {stageLabel(a.stageCode)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right font-mono">
                      {formatNumber(display.value)}
                    </td>
                    <td className="px-4 py-3 text-slate-600">{display.unit}</td>
                    <td className="px-4 py-3 text-right font-mono">
                      {formatNumber(a.factor.value, 6)} {a.factor.unit}
                    </td>
                    <td className="px-4 py-3 text-right font-mono">
                      {formatNumber(a.allocationRatio, 3)}
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-emerald-700">
                      {formatKgCO2e(emission)}
                    </td>
                    <td className="px-4 py-3 font-mono text-slate-600">
                      {a.occurredOn ? a.occurredOn.slice(0, 10) : "-"}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          aria-label={`${a.name} 수정`}
                          onClick={() => onEdit?.(a)}
                        >
                          <Pencil className="h-4 w-4" aria-hidden />
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          className="text-red-600 hover:text-red-700"
                          aria-label={`${a.name} 삭제`}
                          onClick={() => setTarget(a)}
                        >
                          <Trash2 className="h-4 w-4" aria-hidden />
                        </Button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <p className="border-t border-slate-100 px-5 py-3 text-xs text-slate-500">
          계산 배출량 = 활동량 × 배출계수 × 할당비율 (운송 파생: ton-km ×
          배출계수 × 할당비율)
        </p>
      </div>

      <Dialog
        open={!!target}
        onOpenChange={(open) => {
          if (!open && !isDeleting) {
            setTarget(null);
            setDeleteError(null);
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>활동을 삭제하시겠습니까?</DialogTitle>
            <DialogDescription>
              <span className="font-mono text-slate-700">{target?.name}</span>{" "}
              활동이 영구적으로 삭제됩니다. 이 동작은 되돌릴 수 없으며 이후 계산
              결과에 반영됩니다.
            </DialogDescription>
          </DialogHeader>
          {deleteError && (
            <p className="text-xs text-red-600" role="alert">
              {deleteError}
            </p>
          )}
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setTarget(null);
                setDeleteError(null);
              }}
              disabled={isDeleting}
            >
              취소
            </Button>
            <Button
              type="button"
              onClick={handleConfirmDelete}
              disabled={isDeleting}
              className="bg-red-600 hover:bg-red-700"
            >
              {isDeleting && (
                <Loader2 className="mr-1 h-4 w-4 animate-spin" aria-hidden />
              )}
              삭제
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

/**
 * 활동 1건의 배출량.
 * - 운송 파생: (weightKg/1000) × distanceKm × factor.value × allocationRatio
 * - 그 외(운송 직접 포함): amount × factor.value × allocationRatio
 */
function computeEmission(a: Activity): number {
  const ratio = a.allocationRatio;
  const v = a.factor.value;
  if (
    a.stageCode === "TRANSPORT" &&
    a.weightKg != null &&
    a.distanceKm != null
  ) {
    return (a.weightKg / 1000) * a.distanceKm * v * ratio;
  }
  return a.amount * v * ratio;
}

/** 표에 보여줄 "활동량" 표시값 (운송 파생이면 ton-km 환산값). */
function displayAmount(a: Activity): { value: number; unit: string } {
  if (
    a.stageCode === "TRANSPORT" &&
    a.weightKg != null &&
    a.distanceKm != null
  ) {
    return {
      value: (a.weightKg / 1000) * a.distanceKm,
      unit: "ton-km",
    };
  }
  return { value: a.amount, unit: a.unit };
}
