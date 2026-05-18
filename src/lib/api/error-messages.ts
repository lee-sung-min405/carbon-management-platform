import { API_ERROR_CODES, type ApiErrorCode } from "./error-codes";
import { ApiClientError } from "@/lib/http";

/**
 * 19개 API 에러 코드별 기본 한국어 메시지.
 * `ErrorState` 와 폼 인라인 표시에서 공통 사용.
 *
 * 우선순위:
 *   1) `code` 가 본 테이블에 있으면 → 한국어 기본문
 *   2) 서버가 보낸 `message` (사용자 친화 메시지)
 *   3) 기본 fallback "알 수 없는 오류가 발생했습니다."
 */
export const ERROR_MESSAGES: Record<ApiErrorCode, string> = {
  [API_ERROR_CODES.VALIDATION_ERROR]: "입력값이 올바르지 않습니다. 표시된 항목을 확인해주세요.",
  [API_ERROR_CODES.INVALID_JSON]: "요청 형식이 올바르지 않습니다.",
  [API_ERROR_CODES.INVALID_STAGE]: "알 수 없는 단계 코드입니다.",
  [API_ERROR_CODES.INVALID_SCOPE]: "알 수 없는 Scope 값입니다.",
  [API_ERROR_CODES.INVALID_PRODUCT_ID]: "제품 ID가 필요합니다.",
  [API_ERROR_CODES.INVALID_ACTIVITY_ID]: "활동 ID가 필요합니다.",
  [API_ERROR_CODES.PRODUCT_NOT_FOUND]: "해당 제품을 찾을 수 없습니다.",
  [API_ERROR_CODES.ACTIVITY_NOT_FOUND]: "해당 활동을 찾을 수 없습니다.",
  [API_ERROR_CODES.SKU_CONFLICT]: "이미 사용 중인 SKU입니다. 다른 값을 입력해주세요.",

  [API_ERROR_CODES.FACTOR_NOT_FOUND]: "선택한 배출계수를 찾을 수 없습니다.",
  [API_ERROR_CODES.FACTOR_STAGE_MISMATCH]: "선택한 배출계수의 단계가 활동 단계와 일치하지 않습니다.",
  [API_ERROR_CODES.FACTOR_MISMATCH]: "배출계수 참조가 일치하지 않습니다.",
  [API_ERROR_CODES.INVALID_ALLOCATION]: "할당비율은 0보다 크고 1 이하여야 합니다.",
  [API_ERROR_CODES.NEGATIVE_AMOUNT]: "활동량은 0보다 커야 합니다.",
  [API_ERROR_CODES.INVALID_TRANSPORT]: "운송 단계는 무게(kg)+거리(km) 또는 활동량(ton-km)을 입력해야 합니다.",
  [API_ERROR_CODES.NO_ACTIVITIES]: "계산할 활동이 없습니다. 먼저 활동을 1건 이상 추가해주세요.",

  [API_ERROR_CODES.CSV_PARSE_ERROR]: "CSV 파일을 해석할 수 없습니다. 헤더와 컬럼 수를 확인해주세요.",
  [API_ERROR_CODES.UNSUPPORTED_MEDIA_TYPE]: "지원하지 않는 요청 형식입니다.",

  [API_ERROR_CODES.INTERNAL_ERROR]: "서버에서 오류가 발생했습니다. 잠시 후 다시 시도해주세요.",
};

/**
 * `ApiClientError` 또는 임의의 `unknown` 에러를 사용자용 한국어 메시지로 변환.
 * 우선순위는 본 파일 docstring 참고.
 */
export function getErrorMessage(err: unknown): string {
  if (err instanceof ApiClientError) {
    if (err.code && err.code in ERROR_MESSAGES) {
      return ERROR_MESSAGES[err.code as ApiErrorCode];
    }
    if (err.message) return err.message;
  }
  if (err instanceof Error && err.message) return err.message;
  return "알 수 없는 오류가 발생했습니다.";
}
