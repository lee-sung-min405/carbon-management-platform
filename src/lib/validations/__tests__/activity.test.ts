import { describe, expect, it } from "vitest";

import { ActivityInput } from "../activity";

/**
 * ActivityInput Zod 스키마 단위 테스트.
 *
 * 메시지 문자열은 변동 가능성이 있으므로 `path` 기반으로 검증한다.
 * 핵심 분기는 다음과 같다:
 *  - amount: 비-TRANSPORT 단계는 > 0
 *  - TRANSPORT 입력 모드 (XOR-ish):
 *    · 파생 모드: weightKg + distanceKm 모두 → amount=0 허용
 *    · 직접 모드: amount(ton-km) > 0 → weightKg/distanceKm 비움
 *    · 한쪽만 채운 파생 입력 또는 둘 다 비고 amount=0 → 실패
 *  - allocationRatio: (0, 1]
 *  - note: 빈 문자열은 undefined로 정규화
 *  - stageCode: 사전 정의된 값 외 거부
 */

function base(overrides: Record<string, unknown> = {}) {
  return {
    stageCode: "RAW_MATERIAL",
    name: "샘플 활동",
    amount: 1,
    unit: "kg",
    factorId: "f-1",
    ...overrides,
  };
}

function failedPaths(input: unknown): string[] {
  const result = ActivityInput.safeParse(input);
  if (result.success) return [];
  return result.error.issues.map((i) => i.path.join("."));
}

describe("ActivityInput", () => {
  it("RAW_MATERIAL + 정상 값 → success (allocationRatio 기본 1)", () => {
    const result = ActivityInput.safeParse(base());
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.allocationRatio).toBe(1);
    }
  });

  it("비-TRANSPORT에서 amount=0 → 실패", () => {
    expect(failedPaths(base({ amount: 0 }))).toContain("amount");
  });

  it("amount 음수 → 실패", () => {
    expect(failedPaths(base({ amount: -1 }))).toContain("amount");
  });

  it("TRANSPORT + amount=0 + weight/distance 있음 → success (7113fa7 회귀 보호)", () => {
    const result = ActivityInput.safeParse(
      base({
        stageCode: "TRANSPORT",
        amount: 0,
        unit: "ton-km",
        weightKg: 500,
        distanceKm: 200,
      }),
    );
    expect(result.success).toBe(true);
  });

  it("TRANSPORT + weight/distance/amount 모두 누락 → amount 경로 실패", () => {
    const paths = failedPaths(
      base({ stageCode: "TRANSPORT", amount: 0, unit: "ton-km" }),
    );
    expect(paths).toContain("amount");
  });

  it("TRANSPORT 직접 모드: amount(ton-km)만 있고 weight/distance 비어도 success", () => {
    const result = ActivityInput.safeParse(
      base({
        stageCode: "TRANSPORT",
        amount: 41,
        unit: "ton-km",
      }),
    );
    expect(result.success).toBe(true);
  });

  it("TRANSPORT 파생 모드: weightKg만 입력하면 distanceKm 누락으로 실패", () => {
    const paths = failedPaths(
      base({
        stageCode: "TRANSPORT",
        amount: 0,
        unit: "ton-km",
        weightKg: 500,
      }),
    );
    expect(paths).toContain("distanceKm");
  });

  it("TRANSPORT 파생 모드: distanceKm만 입력하면 weightKg 누락으로 실패", () => {
    const paths = failedPaths(
      base({
        stageCode: "TRANSPORT",
        amount: 0,
        unit: "ton-km",
        distanceKm: 200,
      }),
    );
    expect(paths).toContain("weightKg");
  });

  it("allocationRatio 경계: 0 실패, 1 성공, 1.5 실패", () => {
    expect(failedPaths(base({ allocationRatio: 0 }))).toContain(
      "allocationRatio",
    );
    expect(ActivityInput.safeParse(base({ allocationRatio: 1 })).success).toBe(
      true,
    );
    expect(failedPaths(base({ allocationRatio: 1.5 }))).toContain(
      "allocationRatio",
    );
  });

  it("note: 빈 문자열 → undefined 로 정규화", () => {
    const result = ActivityInput.safeParse(base({ note: "" }));
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.note).toBeUndefined();
    }
  });

  it("알 수 없는 stageCode → 실패", () => {
    expect(failedPaths(base({ stageCode: "BOGUS" }))).toContain("stageCode");
  });

  it("occurredOn: ISO 문자열 → Date 로 coerce", () => {
    const result = ActivityInput.safeParse(
      base({ occurredOn: "2025-05-01" }),
    );
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.occurredOn).toBeInstanceOf(Date);
      expect(result.data.occurredOn?.toISOString().slice(0, 10)).toBe(
        "2025-05-01",
      );
    }
  });

  it("occurredOn: 누락 → undefined (기본값)", () => {
    const result = ActivityInput.safeParse(base());
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.occurredOn).toBeUndefined();
    }
  });
});
