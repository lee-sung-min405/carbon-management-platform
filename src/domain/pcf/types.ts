/**
 * PCF (Product Carbon Footprint) 도메인 타입.
 *
 * 본 모듈은 React / Prisma / fetch 등 외부 런타임에 의존하지 않는
 * 순수 도메인 타입만 정의한다. 계산 함수(`./calculate`)와 집계 함수
 * (`./summarize`)는 이 타입을 입력/출력의 단위로 사용한다.
 */

import type { StageCode } from "./stages";
import type { GhgScope } from "./scopes";

/** PCF 산정의 대상 단위. 예: "노트북 1대". */
export interface Product {
  id: string;
  name: string;
  sku?: string | null;
  /** 기능단위 (functional unit). 예: "1 unit", "1 kg". */
  functionalUnit: string;
  description?: string | null;
}

/**
 * 활동량을 CO2eq로 환산하는 배출계수.
 * `value`의 단위는 `unit`이 표현한다. 예: "kgCO2e/kg", "kgCO2e/kWh", "kgCO2e/ton-km".
 */
export interface EmissionFactor {
  id: string;
  name: string;
  stageCode: StageCode;
  /** GHG 프로토콜 스코프 분류 (Scope 1/2/3). */
  scope: GhgScope;
  /** 계수의 단위 문자열. 계산 시 직접 사용되지는 않으며 표기/검증용. */
  unit: string;
  /** 계수 값. 항상 양수. */
  value: number;
  /** 계수 출처 문자열. 데모 데이터의 경우 그 사실을 명시한다. */
  source: string;
  /** 데모용 샘플 데이터 여부. UI/README/seed에서 일관되게 표기한다. */
  isDemo: boolean;
  /** 계수 값 변경 이력 버전 (1부터 시작). */
  version: number;
}

/**
 * 사용자가 입력하는 단일 활동.
 *
 * TRANSPORT 단계인 경우 `weightKg`, `distanceKm`이 필수이며,
 * 계산기는 `amount` 대신 `(weightKg/1000) * distanceKm` (ton-km)을 사용한다.
 * 그 외 단계에서는 `amount * factor.value * allocationRatio`로 계산한다.
 */
export interface ProductActivity {
  id: string;
  productId: string;
  stageCode: StageCode;
  name: string;
  /** 활동량. 양수. TRANSPORT가 아닐 때 계산의 주 입력. */
  amount: number;
  /** 활동량 단위 문자열. 예: "kg", "kWh", "ton-km". */
  unit: string;
  /** 사용할 배출계수 id. `EmissionFactor.id`와 매칭된다. */
  factorId: string;
  /**
   * 할당비율 (allocation ratio). 0 초과 1 이하.
   * 공동 생산 등에서 본 제품에 귀속시킬 비율을 의미한다. 기본 1.0.
   */
  allocationRatio: number;
  /** TRANSPORT 전용. 단위 kg. */
  weightKg?: number | null;
  /** TRANSPORT 전용. 단위 km. */
  distanceKm?: number | null;
  /** 활동 발생일 (자료 임포트/시계열 차트용). 시스템 입력 시각인 `createdAt`과 구분. */
  occurredOn?: Date | null;
  note?: string | null;
}

/**
 * 계산 결과의 활동별 명세 1건.
 * `share`는 0~1 범위의 비율이며, 총 PCF가 0이면 0으로 둔다.
 */
export interface CalculationItem {
  activityId: string;
  stageCode: StageCode;
  /** 참조된 배출계수의 GHG Scope 스냅샷 (Scope 단위 집계용). */
  scope: GhgScope;
  kgCO2e: number;
  share: number;
}

/** 계산 1회의 결과. */
export interface CalculationResult {
  /** 총 PCF (kgCO2e). 활동별 `kgCO2e`의 합과 일치한다. */
  total: number;
  items: CalculationItem[];
}

/** 단계별 집계 1건. */
export interface StageSummary {
  stageCode: StageCode;
  kgCO2e: number;
  /** 단계 비율. 총합이 0이면 0. 합계는 1.0 ± 부동소수 오차. */
  share: number;
}

/** Scope별 집계 1건. */
export interface ScopeSummary {
  scope: GhgScope;
  kgCO2e: number;
  /** Scope 비율. 총합이 0이면 0. */
  share: number;
}
