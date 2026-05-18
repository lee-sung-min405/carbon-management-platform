/**
 * API 에러 코드 카탈로그.
 *
 * `code`는 사용자용 메시지(한글)와 분리된 안정 식별자다.
 *  - 클라이언트는 메시지가 아닌 `code`로 분기/번역해야 한다.
 *  - 새 코드는 반드시 본 파일에 등록한 뒤 라우트에서 사용한다.
 *  - 도메인 레이어 코드(`PcfErrorCode`, `src/domain/pcf/errors.ts`)는
 *    동일 문자열로 본 카탈로그에도 포함시켜 API ↔ 도메인 매핑을 일치시킨다.
 */

export const API_ERROR_CODES = {
  /** Zod 입력 검증 실패. */
  VALIDATION_ERROR: "VALIDATION_ERROR",
  /** 요청 본문이 유효한 JSON이 아님. */
  INVALID_JSON: "INVALID_JSON",
  /** 단계 코드 쿼리 파라미터가 미정의 값. */
  INVALID_STAGE: "INVALID_STAGE",
  /** 제품 ID 누락. */
  INVALID_PRODUCT_ID: "INVALID_PRODUCT_ID",
  /** 활동 ID 누락. */
  INVALID_ACTIVITY_ID: "INVALID_ACTIVITY_ID",
  /** 제품 미존재. */
  PRODUCT_NOT_FOUND: "PRODUCT_NOT_FOUND",
  /** 활동 미존재. */
  ACTIVITY_NOT_FOUND: "ACTIVITY_NOT_FOUND",
  /** SKU 중복 (Prisma P2002). */
  SKU_CONFLICT: "SKU_CONFLICT",

  // ── 도메인(`PcfErrorCode`)과 동일 문자열을 공유 ──
  /** 활동이 참조한 배출계수가 존재하지 않음. */
  FACTOR_NOT_FOUND: "FACTOR_NOT_FOUND",
  /** 활동 단계와 배출계수 단계 불일치. */
  FACTOR_STAGE_MISMATCH: "FACTOR_STAGE_MISMATCH",
  /** 활동의 factorId 와 전달된 factor.id 불일치 (도메인 가드). */
  FACTOR_MISMATCH: "FACTOR_MISMATCH",
  /** 할당비율이 (0, 1] 범위 밖. */
  INVALID_ALLOCATION: "INVALID_ALLOCATION",
  /** 비-운송 단계인데 amount ≤ 0. */
  NEGATIVE_AMOUNT: "NEGATIVE_AMOUNT",
  /** 운송 단계인데 weightKg/distanceKm 누락 또는 ≤ 0. */
  INVALID_TRANSPORT: "INVALID_TRANSPORT",
  /** 계산할 활동이 0건. */
  NO_ACTIVITIES: "NO_ACTIVITIES",

  /** 분류되지 않은 서버 오류 (500). */
  INTERNAL_ERROR: "INTERNAL_ERROR",
} as const;

export type ApiErrorCode =
  (typeof API_ERROR_CODES)[keyof typeof API_ERROR_CODES];
