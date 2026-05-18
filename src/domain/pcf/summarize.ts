/**
 * PCF 계산 결과를 대시보드용으로 집계하는 순수 함수.
 *
 * `calculate.ts`에서 산출한 `CalculationItem[]`을 입력으로 받아
 * 단계별 합계와 상위 배출 활동 목록을 제공한다.
 */

import type { CalculationItem, ScopeSummary, StageSummary } from "./types";
import { LIFECYCLE_STAGES, type StageCode } from "./stages";
import { GHG_SCOPES, type GhgScope } from "./scopes";

/**
 * 단계별 배출량과 비율을 집계한다.
 *
 * - 반환 순서는 `LIFECYCLE_STAGES`의 `order` 순서를 따른다.
 * - 해당 단계의 item이 없으면 `kgCO2e: 0`, `share: 0`으로 포함한다
 *   (차트에서 "0인 단계"도 명시적으로 보여주기 위함).
 * - `share`의 합은 1.0 ± 부동소수 오차. 총합이 0이면 모두 0.
 *
 * 소비 예정: C11 대시보드 StageBarChart / StagePieChart.
 */
export function summarizeByStage(
  items: readonly CalculationItem[],
): StageSummary[] {
  const totals = new Map<StageCode, number>();
  let grandTotal = 0;
  for (const item of items) {
    totals.set(
      item.stageCode,
      (totals.get(item.stageCode) ?? 0) + item.kgCO2e,
    );
    grandTotal += item.kgCO2e;
  }

  return LIFECYCLE_STAGES.map(({ code }) => {
    const kgCO2e = totals.get(code) ?? 0;
    return {
      stageCode: code,
      kgCO2e,
      share: grandTotal === 0 ? 0 : kgCO2e / grandTotal,
    };
  });
}

/**
 * 배출량이 큰 순으로 상위 N개 활동을 반환한다.
 *
 * - 입력 배열을 변경하지 않는다 (새 배열 반환).
 * - `n <= 0`이면 빈 배열. n이 items 길이보다 크면 전체 반환.
 *
 * 소비 예정: C11 대시보드 TopEmittersTable.
 */
export function getTopEmissionActivities(
  items: readonly CalculationItem[],
  n = 5,
): CalculationItem[] {
  if (n <= 0) return [];
  return [...items]
    .sort((a, b) => b.kgCO2e - a.kgCO2e)
    .slice(0, n);
}

/**
 * GHG Scope별 배출량과 비율을 집계한다.
 *
 * - 반환 순서는 `GHG_SCOPES`(SCOPE_1 → 2 → 3) 순서를 따른다.
 * - 해당 Scope의 item이 없으면 `kgCO2e: 0`, `share: 0`으로 포함한다
 *   (Scope 1/2/3 모두 자리를 채워 누락 여부를 시각화하기 위함).
 * - `share`의 합은 1.0 ± 부동소수 오차. 총합이 0이면 모두 0.
 *
 * 소비 예정: C11 대시보드 ScopePieChart, 평가기준 1 보고.
 */
export function summarizeByScope(
  items: readonly CalculationItem[],
): ScopeSummary[] {
  const totals = new Map<GhgScope, number>();
  let grandTotal = 0;
  for (const item of items) {
    totals.set(item.scope, (totals.get(item.scope) ?? 0) + item.kgCO2e);
    grandTotal += item.kgCO2e;
  }

  return GHG_SCOPES.map(({ code }) => {
    const kgCO2e = totals.get(code) ?? 0;
    return {
      scope: code,
      kgCO2e,
      share: grandTotal === 0 ? 0 : kgCO2e / grandTotal,
    };
  });
}
