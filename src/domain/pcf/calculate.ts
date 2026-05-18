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
 *  - TRANSPORT  : tonKm  = (weightKg / 1000) * distanceKm  (파생 모드)
 *                  또는 tonKm = amount (직접 모드, 단위 ton-km)
 *                 kgCO2e = tonKm * factor.value * allocationRatio
 */

import type {
  CalculationItem,
  CalculationResult,
  EmissionFactor,
  ProductActivity,
} from "./types";
import { isTransportStage } from "./stages";
import { PcfDomainError } from "./errors";

/**
 * 활동 1건의 배출량(kgCO2e)을 계산한다.
 *
 * - TRANSPORT 단계는 두 입력 모드를 지원한다:
 *   ① 파생 모드: weightKg, distanceKm이 모두 양수 → ton-km로 환산해서 사용.
 *   ② 직접 모드: amount > 0 → amount 자체를 ton-km로 사용 (단위 ton-km).
 *   둘 다 만족하면 파생 모드를 우선한다.
 * - 그 외 단계는 `amount`가 양수일 때만 유효하다.
 * - `allocationRatio`는 (0, 1] 범위가 아니면 오류.
 *
 * 입력 검증 실패는 `PcfDomainError`를 throw한다. 상위 레이어(API)에서
 * Zod 검증으로 사전 차단하는 것을 기본으로 하고, 본 함수는
 * 도메인 단위의 최후 가드레일이다.
 */
export function calculateActivityEmission(
  activity: ProductActivity,
  factor: EmissionFactor,
): number {
  if (activity.factorId !== factor.id) {
    throw new PcfDomainError(
      "FACTOR_MISMATCH",
      `Factor mismatch: activity ${activity.id} expects ${activity.factorId} but got ${factor.id}`,
    );
  }

  if (activity.stageCode !== factor.stageCode) {
    throw new PcfDomainError(
      "FACTOR_STAGE_MISMATCH",
      `Stage mismatch: activity ${activity.id} stage=${activity.stageCode} vs factor ${factor.id} stage=${factor.stageCode}`,
    );
  }

  const ratio = activity.allocationRatio;
  if (!(ratio > 0 && ratio <= 1)) {
    throw new PcfDomainError(
      "INVALID_ALLOCATION",
      `Invalid allocationRatio for activity ${activity.id}: ${ratio}`,
    );
  }

  if (isTransportStage(activity.stageCode)) {
    const { weightKg, distanceKm, amount } = activity;
    const hasDerived = weightKg != null && distanceKm != null;

    let tonKm: number;
    if (hasDerived) {
      if (weightKg! <= 0 || distanceKm! <= 0) {
        throw new PcfDomainError(
          "INVALID_TRANSPORT",
          `TRANSPORT activity ${activity.id} requires positive weightKg and distanceKm`,
        );
      }
      tonKm = (weightKg! / 1000) * distanceKm!;
    } else if (amount > 0) {
      // 직접 모드: amount 자체를 ton-km로 해석
      tonKm = amount;
    } else {
      throw new PcfDomainError(
        "INVALID_TRANSPORT",
        `TRANSPORT activity ${activity.id} requires either (weightKg+distanceKm) or amount(ton-km)`,
      );
    }
    return tonKm * factor.value * ratio;
  }

  if (!(activity.amount > 0)) {
    throw new PcfDomainError(
      "NEGATIVE_AMOUNT",
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
      throw new PcfDomainError(
        "FACTOR_NOT_FOUND",
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
