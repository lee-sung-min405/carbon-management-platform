import { prisma } from "@/lib/db";
import { ActivityInput } from "@/lib/validations/activity";
import { fail, failFromZod, ok } from "@/lib/api/response";
import { API_ERROR_CODES } from "@/lib/api/error-codes";
import {
  handlePrismaError,
  parseJsonBody,
  toActivityWriteData,
  validateFactorForStage,
} from "@/lib/api/handlers";

/**
 * PUT /api/activities/[id]
 * 활동 전체 교체 수정. POST와 동일한 Zod 스키마 사용.
 */
export async function PUT(
  request: Request,
  { params }: { params: { id: string } },
) {
  const id = params.id;
  if (!id)
    return fail(400, "활동 ID가 필요합니다.", {
      code: API_ERROR_CODES.INVALID_ACTIVITY_ID,
    });

  const bodyResult = await parseJsonBody(request);
  if (!bodyResult.ok) return bodyResult.response;

  const parsed = ActivityInput.safeParse(bodyResult.body);
  if (!parsed.success) return failFromZod(parsed.error);
  const input = parsed.data;

  const factorCheck = await validateFactorForStage(input.factorId, input.stageCode);
  if (!factorCheck.ok) return factorCheck.response;

  try {
    const activity = await prisma.productActivity.update({
      where: { id },
      data: toActivityWriteData(input),
    });
    return ok(activity);
  } catch (err) {
    return handlePrismaError(
      err,
      "활동을 수정하지 못했습니다.",
      {
        message: "해당 활동을 찾을 수 없습니다.",
        code: API_ERROR_CODES.ACTIVITY_NOT_FOUND,
      },
    );
  }
}

/**
 * DELETE /api/activities/[id]
 */
export async function DELETE(
  _request: Request,
  { params }: { params: { id: string } },
) {
  const id = params.id;
  if (!id)
    return fail(400, "활동 ID가 필요합니다.", {
      code: API_ERROR_CODES.INVALID_ACTIVITY_ID,
    });

  try {
    await prisma.productActivity.delete({ where: { id } });
    return ok({ ok: true });
  } catch (err) {
    return handlePrismaError(
      err,
      "활동을 삭제하지 못했습니다.",
      {
        message: "해당 활동을 찾을 수 없습니다.",
        code: API_ERROR_CODES.ACTIVITY_NOT_FOUND,
      },
    );
  }
}
