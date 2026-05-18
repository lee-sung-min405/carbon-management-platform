/**
 * GHG 프로토콜 스코프 (Scope) 정의.
 *
 * Prisma `GhgScope` enum과 1:1 대응한다. 단계(`StageCode`)는 생애주기 축이고,
 * 스코프는 보고/규제 축이라 직교한다 (한 활동이 둘 다 가짐).
 */

/** GHG 스코프 코드. Prisma enum과 동일. */
export type GhgScope = "SCOPE_1" | "SCOPE_2" | "SCOPE_3";

export interface GhgScopeMeta {
  code: GhgScope;
  /** UI 표시용 한국어 라벨. */
  label: string;
  /** 표시 순서 (1=Scope 1). */
  order: number;
}

/**
 * 표시/집계 시 항상 본 배열의 순서를 사용한다.
 * Scope 1 → 2 → 3 순.
 */
export const GHG_SCOPES: readonly GhgScopeMeta[] = [
  { code: "SCOPE_1", label: "Scope 1 (직접배출)", order: 1 },
  { code: "SCOPE_2", label: "Scope 2 (간접-전력열)", order: 2 },
  { code: "SCOPE_3", label: "Scope 3 (기타 간접)", order: 3 },
] as const;

/** Scope 코드 tuple. Zod `z.enum()`용. */
export const GHG_SCOPE_CODES = [
  "SCOPE_1",
  "SCOPE_2",
  "SCOPE_3",
] as const satisfies readonly GhgScope[];

/** Scope 코드 존재 여부 O(1) 검사. */
export const GHG_SCOPE_SET: ReadonlySet<GhgScope> = new Set(GHG_SCOPE_CODES);
