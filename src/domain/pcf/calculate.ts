/**
 * PCF 순수 계산 엔진.
 *
 * 설계 원칙:
 *  - React / Prisma / fetch 등 외부 시스템을 import하지 않는다.
 *  - 입력 배열을 변경하지 않고 항상 새 객체를 반환한다.
 *  - 계산 공식과 단위는 IMPLEMENTATION_PLAN.md 6장을 따른다.
 *
 * 공식:
 *  - 일반 단계: kgCO2e = amount * factor.value * allocationRatio
 *  - TRANSPORT  : tonKm  = (weightKg / 1000) * distanceKm
 *                 kgCO2e = tonKm * factor.value * allocationRatio
 */

import type {
  CalculationItem,
  CalculationResult,
  EmissionFactor,
  ProductActivity,
} from "./types";
import { isTransportStage } from "./stages";

/**
 * 활동 1건의 배출량(kgCO2e)을 계산한다.
 *
 * - TRANSPORT 단계는 `weightKg`, `distanceKm`이 모두 육수일 때만 유효하며
 *   ton-km 환산을 통해 `amount`를 사용하지 않는다.
 * - 그 외 단계는 `amount`가 양수일 때만 유효하다.
 * - `allocationRatio`는 (0, 1] 범위가 아니면 오류.
 *
 * 입력 검증 실패는 `Error`를 throw한다. 상위 레이어(API)에서
 * Zod 검증으로 사전 차단하는 것을 기본으로 하고, 본 함수는
 * 도메인 단위의 최후 가드레일이다.
 */
export function calculateActivityEmission(
  activity: ProductActivity,
  factor: EmissionFactor,
): number {
  if (activity.factorId !== factor.id) {
    throw new Error(
      `Factor mismatch: activity ${activity.id} expects ${activity.factorId} but got ${factor.id}`,
    );
  }

  if (activity.stageCode !== factor.stageCode) {
    throw new Error(
      `Stage mismatch: activity ${activity.id} stage=${activity.stageCode} vs factor ${factor.id} stage=${factor.stageCode}`,
    );
  }

  const ratio = activity.allocationRatio;
  if (!(ratio > 0 && ratio <= 1)) {
    throw new Error(
      `Invalid allocationRatio for activity ${activity.id}: ${ratio}`,
    );
  }

  if (isTransportStage(activity.stageCode)) {
    const { weightKg, distanceKm } = activity;
    if (weightKg == null || distanceKm == null) {
      throw new Error(
        `TRANSPORT activity ${activity.id} requires weightKg and distanceKm`,
      );
    }
    if (weightKg <= 0 || distanceKm <= 0) {
      throw new Error(
        `TRANSPORT activity ${activity.id} requires positive weightKg and distanceKm`,
      );
    }
    const tonKm = (weightKg / 1000) * distanceKm;
    return tonKm * factor.value * ratio;
  }

  if (!(activity.amount > 0)) {
    throw new Error(
      `Activity ${activity.id} requires positive amount`,
    );
  }
  return activity.amount * factor.value * ratio;
}

/**
 * 제품 1건의 총 PCF와 활동별 명세를 반환한다.
 *
 * - `factors`는 활동이 참조하는 모든 계수를 포함해야 한다.
 *   누락 시 즉시 throw.
 * - `total`은 부동소수 누적 오차를 피하기 위해 items 합으로 재계산한다.
 * - `share`는 [0, 1] 범위. total이 0이면 모두 0으로 둔다.
 */
export function calculateProductPcf(
  activities: readonly ProductActivity[],
  factors: readonly EmissionFactor[],
): CalculationResult {
  const factorMap = new Map(factors.map((f) => [f.id, f]));

  const rawItems: CalculationItem[] = activities.map((activity) => {
    const factor = factorMap.get(activity.factorId);
    if (!factor) {
      throw new Error(
        `Missing emission factor ${activity.factorId} for activity ${activity.id}`,
      );
    }
    return {
      activityId: activity.id,
      stageCode: activity.stageCode,
      kgCO2e: calculateActivityEmission(activity, factor),
      share: 0,
    };
  });

  const total = rawItems.reduce((sum, item) => sum + item.kgCO2e, 0);
  const items = rawItems.map((item) => ({
    ...item,
    share: total === 0 ? 0 : item.kgCO2e / total,
  }));

  return { total, items };
}
