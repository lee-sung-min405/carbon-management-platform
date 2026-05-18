import { prisma } from "@/lib/db";
import { ActivityInput } from "@/lib/validations/activity";
import { fail, failFromZod, ok } from "@/lib/api/response";

/**
 * POST /api/products/[id]/activities
 * 제품에 활동 1건 추가.
 *
 * 검증 순서: Zod → 제품 존재 → factor 존재 ∘ 단계 일치.
 * `weightKg`/`distanceKm`는 TRANSPORT 에만 저장 (다른 단계에서는 null).
 */
export async function POST(
  request: Request,
  { params }: { params: { id: string } },
) {
  const productId = params.id;
  if (!productId) return fail(400, "제품 ID가 필요합니다.");

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return fail(400, "요청 본문(JSON)을 파싱할 수 없습니다.");
  }

  const parsed = ActivityInput.safeParse(body);
  if (!parsed.success) return failFromZod(parsed.error);
  const input = parsed.data;

  try {
    const [product, factor] = await Promise.all([
      prisma.product.findUnique({ where: { id: productId }, select: { id: true } }),
      prisma.emissionFactor.findUnique({
        where: { id: input.factorId },
        select: { id: true, stageCode: true },
      }),
    ]);

    if (!product) return fail(404, "해당 제품을 찾을 수 없습니다.");
    if (!factor) {
      return fail(400, "선택한 배출계수를 찾을 수 없습니다.", {
        code: "FACTOR_NOT_FOUND",
        fields: { factorId: ["배출계수가 존재하지 않습니다."] },
      });
    }
    if (factor.stageCode !== input.stageCode) {
      return fail(
        400,
        "배출계수의 단계가 활동 단계와 일치하지 않습니다.",
        {
          code: "FACTOR_STAGE_MISMATCH",
          fields: {
            factorId: [
              `선택한 계수는 ${factor.stageCode} 단계용입니다.`,
            ],
          },
        },
      );
    }

    const isTransport = input.stageCode === "TRANSPORT";
    const activity = await prisma.productActivity.create({
      data: {
        productId,
        stageCode: input.stageCode,
        name: input.name,
        amount: input.amount,
        unit: input.unit,
        factorId: input.factorId,
        allocationRatio: input.allocationRatio,
        weightKg: isTransport ? input.weightKg ?? null : null,
        distanceKm: isTransport ? input.distanceKm ?? null : null,
        note: input.note ?? null,
      },
    });

    return ok(activity, { status: 201 });
  } catch (err) {
    console.error(`[POST /api/products/${productId}/activities] failed`, err);
    return fail(500, "활동을 추가하지 못했습니다.");
  }
}
