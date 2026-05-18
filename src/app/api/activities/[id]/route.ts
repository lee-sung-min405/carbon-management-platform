import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/db";
import { ActivityInput } from "@/lib/validations/activity";
import { fail, failFromZod, ok } from "@/lib/api/response";

/**
 * PUT /api/activities/[id]
 * 활동 전체 교체 수정. POST와 동일한 Zod 스키마 사용.
 */
export async function PUT(
  request: Request,
  { params }: { params: { id: string } },
) {
  const id = params.id;
  if (!id) return fail(400, "활동 ID가 필요합니다.");

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
    const factor = await prisma.emissionFactor.findUnique({
      where: { id: input.factorId },
      select: { id: true, stageCode: true },
    });
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
    const activity = await prisma.productActivity.update({
      where: { id },
      data: {
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

    return ok(activity);
  } catch (err) {
    if (
      err instanceof Prisma.PrismaClientKnownRequestError &&
      err.code === "P2025"
    ) {
      return fail(404, "해당 활동을 찾을 수 없습니다.");
    }
    console.error(`[PUT /api/activities/${id}] failed`, err);
    return fail(500, "활동을 수정하지 못했습니다.");
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
  if (!id) return fail(400, "활동 ID가 필요합니다.");

  try {
    await prisma.productActivity.delete({ where: { id } });
    return ok({ ok: true });
  } catch (err) {
    if (
      err instanceof Prisma.PrismaClientKnownRequestError &&
      err.code === "P2025"
    ) {
      return fail(404, "해당 활동을 찾을 수 없습니다.");
    }
    console.error(`[DELETE /api/activities/${id}] failed`, err);
    return fail(500, "활동을 삭제하지 못했습니다.");
  }
}
