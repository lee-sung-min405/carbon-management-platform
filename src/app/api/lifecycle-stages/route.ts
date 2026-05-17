import { LIFECYCLE_STAGES } from "@/domain/pcf/stages";
import { ok } from "@/lib/api/response";

/**
 * GET /api/lifecycle-stages
 * UI 단계 선택기에서 사용할 5단계 메타 목록.
 * DB 의존이 없으므로 항상 도메인 상수에서 직접 응답한다.
 */
export async function GET() {
  return ok(LIFECYCLE_STAGES);
}
