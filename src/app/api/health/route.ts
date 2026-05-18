import { prisma } from "@/lib/db";
import { fail, ok } from "@/lib/api/response";
import { API_ERROR_CODES } from "@/lib/api/error-codes";

/**
 * GET /api/health
 *
 * 운영/배포/CI healthcheck 용 표준 엔드포인트.
 * - 프로세스 살아있음(uptime) + DB ping(`SELECT 1`) 성공 여부를 함께 보고
 * - 성공: 200 + `{ data: { status, db, version, uptimeSec } }`
 * - DB 실패: 503 + `{ error: { code: "INTERNAL_ERROR" } }`
 *
 * 인증 없음(외부 모니터링 도구가 직접 호출). 민감 정보(env/DB URL 등)는 노출하지 않는다.
 */
export async function GET() {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return ok({
      status: "ok",
      db: "ok",
      version: process.env.npm_package_version ?? "unknown",
      uptimeSec: Math.round(process.uptime()),
    });
  } catch (err) {
    console.error("[GET /api/health] DB ping failed", err);
    return fail(503, "헬스체크 실패: DB 연결 불가", {
      code: API_ERROR_CODES.INTERNAL_ERROR,
    });
  }
}
