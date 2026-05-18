import type { StageCode } from "@/domain/pcf/stages";
import { STAGE_CODE_SET } from "@/domain/pcf/stages";
import type { GhgScope } from "@/domain/pcf/scopes";
import { GHG_SCOPE_SET } from "@/domain/pcf/scopes";
import { prisma } from "@/lib/db";
import { fail, ok } from "@/lib/api/response";
import { API_ERROR_CODES } from "@/lib/api/error-codes";

/**
 * GET /api/emission-factors?stage=TRANSPORT&scope=SCOPE_2
 * 배출계수 목록. `stage`, `scope` 쿼리로 각각/동시 필터링 가능.
 */
export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const stageParam = params.get("stage");
  const scopeParam = params.get("scope");

  if (stageParam && !STAGE_CODE_SET.has(stageParam as StageCode)) {
    return fail(400, `알 수 없는 단계 코드: ${stageParam}`, {
      code: API_ERROR_CODES.INVALID_STAGE,
    });
  }
  if (scopeParam && !GHG_SCOPE_SET.has(scopeParam as GhgScope)) {
    return fail(400, `알 수 없는 Scope: ${scopeParam}`, {
      code: API_ERROR_CODES.INVALID_SCOPE,
    });
  }

  const where: { stageCode?: StageCode; scope?: GhgScope } = {};
  if (stageParam) where.stageCode = stageParam as StageCode;
  if (scopeParam) where.scope = scopeParam as GhgScope;

  try {
    const factors = await prisma.emissionFactor.findMany({
      where,
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
