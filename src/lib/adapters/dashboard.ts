/**
 * 대시보드 차트/표에 주입할 row & insights 빌더.
 *
 * 도메인 계산 결과(`CalculationItem`)와 백엔드 응답 메타(`Activity`, `Factor`)를
 * 결합해 컴포넌트가 그대로 렌더할 수 있는 모양으로 변환한다.
 */

import type { CalculationItem } from "@/domain/pcf/types";
import type {
  Activity,
  Factor,
  CalculationItem as ApiCalculationItem,
} from "@/types/api";
import type {
  StageSummary,
  ScopeSummary,
} from "@/domain/pcf/types";
import { LIFECYCLE_STAGES } from "@/domain/pcf/stages";
import { GHG_SCOPES } from "@/domain/pcf/scopes";
import type { StageCode } from "@/domain/pcf/stages";
import type { GhgScope } from "@/domain/pcf/scopes";

/** 5단계 라벨 룩업. */
const STAGE_LABEL: Record<StageCode, string> = Object.fromEntries(
  LIFECYCLE_STAGES.map((s) => [s.code, s.label]),
) as Record<StageCode, string>;

/** 3 Scope 라벨 룩업. */
const SCOPE_LABEL: Record<GhgScope, string> = Object.fromEntries(
  GHG_SCOPES.map((s) => [s.code, s.label]),
) as Record<GhgScope, string>;

export const stageLabel = (code: StageCode) => STAGE_LABEL[code];
export const scopeLabel = (code: GhgScope) => SCOPE_LABEL[code];

/** TopEmittersTable 의 행. 활동/계수 메타를 join 해 둔 모양. */
export interface TopEmitterRow {
  rank: number;
  activityId: string;
  name: string;
  stageCode: StageCode;
  scope: GhgScope;
  kgCO2e: number;
  share: number;
  /** 계산식 tooltip 용 메타 (활동 유형별 4공식). */
  formula: {
    type: "general" | "transport-derived" | "transport-direct";
    amount: number;
    unit: string;
    factorValue: number;
    factorUnit: string;
    allocationRatio: number;
    weightKg?: number;
    distanceKm?: number;
  };
}

/**
 * 활동 join + 계산식 메타 빌드.
 * - items 는 도메인/API 어느 쪽 CalculationItem 이든 호환 (구조 동일).
 * - activities 가 없으면 name 은 fallback 으로 activityId 축약.
 */
export function buildTopEmittersRows(
  items: readonly (CalculationItem | ApiCalculationItem)[],
  activities: readonly Activity[],
  total: number,
): TopEmitterRow[] {
  const activityMap = new Map(activities.map((a) => [a.id, a]));
  const grand = total > 0 ? total : 1;

  return items.map((item, idx) => {
    const activity = activityMap.get(item.activityId);
    const allocationRatio = activity?.allocationRatio ?? 1;
    const isTransport = activity?.stageCode === "TRANSPORT";
    const hasDerived =
      isTransport &&
      activity?.weightKg != null &&
      activity?.distanceKm != null;

    return {
      rank: idx + 1,
      activityId: item.activityId,
      name: activity?.name ?? item.activityId.slice(0, 8),
      stageCode: item.stageCode,
      scope: item.scope,
      kgCO2e: item.kgCO2e,
      share: grand > 0 ? item.kgCO2e / grand : 0,
      formula: {
        type: hasDerived
          ? "transport-derived"
          : isTransport
            ? "transport-direct"
            : "general",
        amount: activity?.amount ?? 0,
        unit: activity?.unit ?? "",
        factorValue: activity?.factor.value ?? 0,
        factorUnit: activity?.factor.unit ?? "",
        allocationRatio,
        weightKg: activity?.weightKg ?? undefined,
        distanceKm: activity?.distanceKm ?? undefined,
      },
    };
  });
}

/** TotalPcfCard "핵심 인사이트" 섹션에 표시할 4개 지표. */
export interface DashboardInsights {
  topStage: { label: string; share: number } | null;
  topScope: { label: string; share: number } | null;
  topActivityName: string | null;
  activityCount: number;
  factorCount: number;
}

export function buildInsights(
  stageSummary: readonly StageSummary[],
  scopeSummary: readonly ScopeSummary[],
  topRow0: TopEmitterRow | undefined,
  activities: readonly Activity[],
  factors: readonly Factor[],
): DashboardInsights {
  const topStageEntry = [...stageSummary].sort(
    (a, b) => b.kgCO2e - a.kgCO2e,
  )[0];
  const topScopeEntry = [...scopeSummary].sort(
    (a, b) => b.kgCO2e - a.kgCO2e,
  )[0];

  return {
    topStage:
      topStageEntry && topStageEntry.kgCO2e > 0
        ? {
            label: stageLabel(topStageEntry.stageCode),
            share: topStageEntry.share,
          }
        : null,
    topScope:
      topScopeEntry && topScopeEntry.kgCO2e > 0
        ? {
            label: scopeLabel(topScopeEntry.scope),
            share: topScopeEntry.share,
          }
        : null,
    topActivityName: topRow0?.name ?? null,
    activityCount: activities.length,
    factorCount: factors.length,
  };
}
