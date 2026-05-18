import { prisma } from "@/lib/db";
import { fail, ok } from "@/lib/api/response";
import { requireProduct } from "@/lib/api/handlers";
import { calculateProductPcf } from "@/domain/pcf/calculate";
import type {
  EmissionFactor as DomainEmissionFactor,
  ProductActivity as DomainProductActivity,
} from "@/domain/pcf/types";
import type { Prisma } from "@/generated/prisma/client";

/**
 * POST /api/products/[id]/calculate
 *
 * 1) 제품의 활동 + 참조 계수를 fetch
 * 2) 도메인 함수 `calculateProductPcf`로 PCF 계산 (라우트에는 계산 로직 없음)
 * 3) `CalculationRun` + `CalculationItem[]`을 한 번의 nested create로 저장하고
 *    `snapshotJson`에는 계산 시점의 활동/계수 원본을 박제하여 추후 재현 가능하게 한다.
 *
 * 활동이 0건이면 의미 있는 계산이 불가능하므로 400.
 */
export async function POST(
  _request: Request,
  { params }: { params: { id: string } },
) {
  const productCheck = await requireProduct(params.id);
  if (!productCheck.ok) return productCheck.response;
  const productId = productCheck.product.id;

  try {
    const activities = await prisma.productActivity.findMany({
      where: { productId },
      orderBy: { createdAt: "asc" },
    });
    if (activities.length === 0) {
      return fail(400, "계산할 활동이 없습니다.", {
        code: "NO_ACTIVITIES",
      });
    }

    const factorIds = Array.from(new Set(activities.map((a) => a.factorId)));
    const factors = await prisma.emissionFactor.findMany({
      where: { id: { in: factorIds } },
    });

    // Prisma row → 순수 도메인 객체로 정규화 (계산기는 외부 의존이 없음)
    const domainActivities: DomainProductActivity[] = activities.map((a) => ({
      id: a.id,
      productId: a.productId,
      stageCode: a.stageCode,
      name: a.name,
      amount: a.amount,
      unit: a.unit,
      factorId: a.factorId,
      allocationRatio: a.allocationRatio,
      weightKg: a.weightKg,
      distanceKm: a.distanceKm,
      note: a.note,
    }));
    const domainFactors: DomainEmissionFactor[] = factors.map((f) => ({
      id: f.id,
      name: f.name,
      stageCode: f.stageCode,
      unit: f.unit,
      value: f.value,
      source: f.source,
      isDemo: f.isDemo,
    }));

    let result;
    try {
      result = calculateProductPcf(domainActivities, domainFactors);
    } catch (err) {
      // 도메인 가드레일에서 throw된 경우 (예: 계수 누락) 400으로 변환
      const message = err instanceof Error ? err.message : "계산 실패";
      return fail(400, message, { code: "CALCULATION_ERROR" });
    }

    const snapshot = {
      activities: domainActivities,
      factors: domainFactors,
      calculatedAt: new Date().toISOString(),
    } satisfies Record<string, unknown>;

    const run = await prisma.calculationRun.create({
      data: {
        productId,
        totalKgCO2e: result.total,
        snapshotJson: snapshot as unknown as Prisma.InputJsonValue,
        items: {
          create: result.items.map((it) => ({
            activityId: it.activityId,
            stageCode: it.stageCode,
            kgCO2e: it.kgCO2e,
            share: it.share,
          })),
        },
      },
      include: { items: true },
    });

    return ok(run, { status: 201 });
  } catch (err) {
    console.error(`[POST /api/products/${productId}/calculate] failed`, err);
    return fail(500, "PCF 계산에 실패했습니다.");
  }
}
