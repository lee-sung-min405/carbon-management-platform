import { prisma } from "@/lib/db";
import { fail, ok } from "@/lib/api/response";
import { API_ERROR_CODES } from "@/lib/api/error-codes";
import { requireProduct } from "@/lib/api/handlers";
import {
  buildCalculationSnapshot,
  toDomainActivity,
  toDomainFactor,
} from "@/lib/adapters/pcf";
import { calculateProductPcf } from "@/domain/pcf/calculate";
import { PcfDomainError } from "@/domain/pcf/errors";

/**
 * POST /api/products/[id]/calculate
 *
 * 1) `prisma.$transaction` 안에서 활동 + 참조 계수를 일관된 스냅샷으로 조회
 * 2) 도메인 함수 `calculateProductPcf`로 PCF 계산 (라우트에는 계산 로직 없음)
 * 3) 같은 트랜잭션에서 `CalculationRun` + `CalculationItem[]`을 nested create로 기록
 *    → 읽기-쓰기 경계가 한 트랜잭션이므로 동시 활동 수정과의 race를 줄이고,
 *      쓰기 실패 시 부분 row가 남지 않는다.
 *
 * 도메인 가드(`PcfDomainError`)는 400으로 매핑하고 `code`를 그대로 전파한다.
 * 활동이 0건이면 의미 있는 계산이 불가능하므로 `NO_ACTIVITIES`(400).
 */
export async function POST(
  _request: Request,
  { params }: { params: { id: string } },
) {
  const productCheck = await requireProduct(params.id);
  if (!productCheck.ok) return productCheck.response;
  const productId = productCheck.product.id;

  try {
    const run = await prisma.$transaction(async (tx) => {
      const activities = await tx.productActivity.findMany({
        where: { productId },
        orderBy: { createdAt: "asc" },
      });
      if (activities.length === 0) {
        throw new PcfDomainError("NO_ACTIVITIES", "계산할 활동이 없습니다.");
      }

      const factorIds = Array.from(new Set(activities.map((a) => a.factorId)));
      const factors = await tx.emissionFactor.findMany({
        where: { id: { in: factorIds } },
      });

      // Prisma row → 순수 도메인 객체 (계산기는 외부 의존이 없음)
      const domainActivities = activities.map(toDomainActivity);
      const domainFactors = factors.map(toDomainFactor);

      const result = calculateProductPcf(domainActivities, domainFactors);

      return tx.calculationRun.create({
        data: {
          productId,
          totalKgCO2e: result.total,
          snapshotJson: buildCalculationSnapshot(
            domainActivities,
            domainFactors,
          ),
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
    });

    return ok(run, { status: 201 });
  } catch (err) {
    if (err instanceof PcfDomainError) {
      return fail(400, err.message, { code: err.code });
    }
    console.error(`[POST /api/products/${productId}/calculate] failed`, err);
    return fail(500, "PCF 계산에 실패했습니다.", {
      code: API_ERROR_CODES.INTERNAL_ERROR,
    });
  }
}
