/**
 * 백엔드 API 응답을 좁게 모델링한 타입 모음.
 * Prisma 생성 타입을 그대로 노출하지 않고, 라우트 핸들러가 실제로 돌려주는
 * 모양(필요한 필드만)을 한 곳에서 정의해 컴포넌트가 의존하기 쉽게 한다.
 */

import type { StageCode } from "@/domain/pcf/stages";
import type { GhgScope } from "@/domain/pcf/scopes";

/** GET /api/health */
export interface Health {
  status: "ok";
  db: "ok";
  version: string;
  uptimeSec: number;
}

/** 활동에 join 되어 내려오는 배출계수 메타 (GET /api/products/[id] 내부 시각용). */
export interface FactorMeta {
  id: string;
  name: string;
  stageCode: StageCode;
  unit: string;
  value: number;
  source: string | null;
  isDemo: boolean;
}

/** GET /api/emission-factors — 전체 컬럼. */
export interface Factor {
  id: string;
  name: string;
  stageCode: StageCode;
  scope: GhgScope;
  unit: string;
  value: number;
  source: string | null;
  region: string | null;
  isDemo: boolean;
  version: string | null;
  createdAt: string;
}

/** 활동 1건 (GET /api/products/[id] 안의 activities[i]). */
export interface Activity {
  id: string;
  productId: string;
  stageCode: StageCode;
  name: string;
  amount: number;
  unit: string;
  factorId: string;
  allocationRatio: number;
  weightKg: number | null;
  distanceKm: number | null;
  occurredOn: string | null;
  note: string | null;
  createdAt: string;
  updatedAt: string;
  factor: FactorMeta;
}

/** GET /api/products — 목록 행. */
export interface ProductListItem {
  id: string;
  name: string;
  sku: string | null;
  functionalUnit: string;
  description: string | null;
  createdAt: string;
  activityCount: number;
  lastRun: { runAt: string; totalKgCO2e: number } | null;
}

/** GET /api/products/[id] — 상세 (활동 + 최근 run 메타). */
export interface ProductDetail {
  id: string;
  name: string;
  sku: string | null;
  functionalUnit: string;
  description: string | null;
  createdAt: string;
  updatedAt: string;
  activities: Activity[];
  runs: Array<{ id: string; runAt: string; totalKgCO2e: number }>;
}

/** 계산 결과 항목 (POST /api/products/[id]/calculate 의 items[i]). */
export interface CalculationItem {
  id: string;
  runId: string;
  activityId: string;
  stageCode: StageCode;
  scope: GhgScope;
  kgCO2e: number;
  share: number;
}

/** POST /api/products/[id]/calculate — full run + items. */
export interface CalculationRun {
  id: string;
  productId: string;
  runAt: string;
  totalKgCO2e: number;
  snapshotJson: unknown;
  items: CalculationItem[];
}

/** GET /api/products/[id]/calculation-runs — 메타만. */
export interface RunMeta {
  id: string;
  productId: string;
  runAt: string;
  totalKgCO2e: number;
  snapshotJson: unknown;
}

/** POST /api/products/[id]/activities/bulk 응답. */
export interface BulkImportResult {
  inserted: number;
  deleted: number;
  mode: "append" | "replace";
}
