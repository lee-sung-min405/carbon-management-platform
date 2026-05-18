import { prisma } from "@/lib/db";
import { ActivityInput } from "@/lib/validations/activity";
import { failFromZod, ok } from "@/lib/api/response";
import {
  handlePrismaError,
  parseJsonBody,
  requireProduct,
  toActivityWriteData,
  validateFactorForStage,
} from "@/lib/api/handlers";

/**
 * POST /api/products/[id]/activities
 * 제품에 활동 1건 추가.
 *
 * 검증 순서: 제품 존재 → Zod → factor 존재 ∘ 단계 일치.
 * `weightKg`/`distanceKm`는 TRANSPORT 에만 저장 (다른 단계에서는 null).
 */
export async function POST(
  request: Request,
  { params }: { params: { id: string } },
) {
  const productCheck = await requireProduct(params.id);
  if (!productCheck.ok) return productCheck.response;

  const bodyResult = await parseJsonBody(request);
  if (!bodyResult.ok) return bodyResult.response;

  const parsed = ActivityInput.safeParse(bodyResult.body);
  if (!parsed.success) return failFromZod(parsed.error);
  const input = parsed.data;

  const factorCheck = await validateFactorForStage(input.factorId, input.stageCode);
  if (!factorCheck.ok) return factorCheck.response;

  try {
    const activity = await prisma.productActivity.create({
      data: { productId: params.id, ...toActivityWriteData(input) },
    });
    return ok(activity, { status: 201 });
  } catch (err) {
    return handlePrismaError(err, "활동을 추가하지 못했습니다.");
  }
}
