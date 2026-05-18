/**
 * PCF 생애주기 단계 정의.
 *
 * Prisma `StageCode` enum과 동일한 5단계를 사용한다.
 * DB row를 따로 두지 않고, 본 상수 테이블이 단일 진실 공급원이다.
 */

/** 생애주기 단계 코드. Prisma `StageCode` enum과 1:1 대응. */
export type StageCode =
  | "RAW_MATERIAL"
  | "PRODUCTION"
  | "TRANSPORT"
  | "USE"
  | "END_OF_LIFE";

export interface LifeCycleStage {
  code: StageCode;
  /** UI 표시용 한국어 라벨. */
  label: string;
  /** 1부터 시작하는 표시 순서. */
  order: number;
}

/**
 * 표시/집계 시 항상 본 배열의 순서를 기준으로 사용한다.
 * 다른 모듈에서 임의로 정렬을 정의하지 않도록 한 곳에 모은다.
 */
export const LIFECYCLE_STAGES: readonly LifeCycleStage[] = [
  { code: "RAW_MATERIAL", label: "원자재", order: 1 },
  { code: "PRODUCTION", label: "생산", order: 2 },
  { code: "TRANSPORT", label: "운송", order: 3 },
  { code: "USE", label: "사용", order: 4 },
  { code: "END_OF_LIFE", label: "폐기", order: 5 },
] as const;

/**
 * 단계 코드만 모은 tuple. Zod `z.enum()`이 비어있지 않은 tuple을 요구하므로
 * 명시적으로 5원소 tuple로 표기한다. 단계가 추가/제거되면 본 tuple과
 * `LIFECYCLE_STAGES`를 함께 수정해야 한다 (TypeScript가 강제하지 못함).
 */
export const STAGE_CODES = [
  "RAW_MATERIAL",
  "PRODUCTION",
  "TRANSPORT",
  "USE",
  "END_OF_LIFE",
] as const satisfies readonly StageCode[];

/** 단계 코드 존재 여부를 O(1)로 검사하기 위한 집합. */
export const STAGE_CODE_SET: ReadonlySet<StageCode> = new Set(STAGE_CODES);

/** TRANSPORT 단계 여부. 계산기에서 ton-km 분기에 사용. */
export function isTransportStage(code: StageCode): boolean {
  return code === "TRANSPORT";
}
