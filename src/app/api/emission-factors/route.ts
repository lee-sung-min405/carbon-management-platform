import type { StageCode } from "@/domain/pcf/stages";
import { STAGE_CODE_SET } from "@/domain/pcf/stages";
import { prisma } from "@/lib/db";
import { fail, ok } from "@/lib/api/response";
import { API_ERROR_CODES } from "@/lib/api/error-codes";

/**
 * GET /api/emission-factors?stage=TRANSPORT
 * 배출계수 목록. `stage` 쿼리로 단계 필터링 가능.
 */
export async function GET(request: Request) {
  const stageParam = new URL(request.url).searchParams.get("stage");

  if (stageParam && !STAGE_CODE_SET.has(stageParam as StageCode)) {
    return fail(400, `알 수 없는 단계 코드: ${stageParam}`, {
      code: API_ERROR_CODES.INVALID_STAGE,
    });
  }

  try {
    const factors = await prisma.emissionFactor.findMany({
      where: stageParam ? { stageCode: stageParam as StageCode } : undefined,
      orderBy: [{ stageCode: "asc" }, { name: "asc" }],
    });
    return ok(factors);
  } catch (err) {
    console.error("[GET /api/emission-factors] failed", err);
    return fail(500, "배출계수 목록을 불러오지 못했습니다.", {
      code: API_ERROR_CODES.INTERNAL_ERROR,
    });
  }
}
