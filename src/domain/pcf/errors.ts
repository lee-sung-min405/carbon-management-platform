/**
 * PCF 도메인 전용 에러.
 *
 * 도메인 가드레일(`calculate.ts`)이 입력 위반을 발견하면 익명 `Error` 대신
 * `PcfDomainError`를 throw 한다. 상위 라우트는 `instanceof` 분기로 식별해
 * 사용자용 한글 메시지와 안정적인 `code`를 함께 API 봉투에 실어 응답한다.
 */

export type PcfErrorCode =
  | "FACTOR_MISMATCH"
  | "FACTOR_STAGE_MISMATCH"
  | "FACTOR_NOT_FOUND"
  | "INVALID_ALLOCATION"
  | "NEGATIVE_AMOUNT"
  | "INVALID_TRANSPORT"
  | "NO_ACTIVITIES";

export class PcfDomainError extends Error {
  readonly code: PcfErrorCode;

  constructor(code: PcfErrorCode, message: string) {
    super(message);
    this.name = "PcfDomainError";
    this.code = code;
  }
}
