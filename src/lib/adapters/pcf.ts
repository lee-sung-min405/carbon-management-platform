import type {
  EmissionFactor as PrismaEmissionFactor,
  ProductActivity as PrismaProductActivity,
  Prisma,
} from "@/generated/prisma/client";

import type {
  EmissionFactor as DomainEmissionFactor,
  ProductActivity as DomainProductActivity,
} from "@/domain/pcf/types";

/**
 * Prisma row ↔ 도메인 객체 어댑터.
 *
 * 두 타입의 모양이 같더라도 어댑터 함수를 유지한다. 스키마와 도메인의
 * 진화 속도가 다르므로 경계를 명시해두고, 향후 컬럼 이름이나 직렬화
 * 형태가 갈리더라도 호출부 변경 없이 한 곳에서 흡수하기 위함이다.
 */

export function toDomainActivity(
  row: PrismaProductActivity,
): DomainProductActivity {
  return {
    id: row.id,
    productId: row.productId,
    stageCode: row.stageCode,
    name: row.name,
    amount: row.amount,
    unit: row.unit,
    factorId: row.factorId,
    allocationRatio: row.allocationRatio,
    weightKg: row.weightKg,
    distanceKm: row.distanceKm,
    note: row.note,
  };
}

export function toDomainFactor(
  row: PrismaEmissionFactor,
): DomainEmissionFactor {
  return {
    id: row.id,
    name: row.name,
    stageCode: row.stageCode,
    unit: row.unit,
    value: row.value,
    source: row.source,
    isDemo: row.isDemo,
  };
}

/**
 * 계산 시점의 활동/계수 원본을 박제한 snapshot을 만든다.
 * `calculatedAt`은 호출 시각으로 자동 기입한다.
 *
 * 반환 타입을 `Prisma.InputJsonValue`로 좁혀 호출부에서 `as unknown as ...`
 * 캐스트를 제거할 수 있도록 한다.
 */
export function buildCalculationSnapshot(
  activities: DomainProductActivity[],
  factors: DomainEmissionFactor[],
): Prisma.InputJsonValue {
  return {
    activities: activities.map((a) => ({
      id: a.id,
      productId: a.productId,
      stageCode: a.stageCode,
      name: a.name,
      amount: a.amount,
      unit: a.unit,
      factorId: a.factorId,
      allocationRatio: a.allocationRatio,
      weightKg: a.weightKg ?? null,
      distanceKm: a.distanceKm ?? null,
      note: a.note ?? null,
    })),
    factors: factors.map((f) => ({
      id: f.id,
      name: f.name,
      stageCode: f.stageCode,
      unit: f.unit,
      value: f.value,
      source: f.source,
      isDemo: f.isDemo,
    })),
    calculatedAt: new Date().toISOString(),
  };
}
