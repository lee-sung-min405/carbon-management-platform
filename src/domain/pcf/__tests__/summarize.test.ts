/**
 * `summarizeByScope` 단위 테스트.
 *
 * Scope 단위 집계는 평가기준 1(분류 보고)의 핵심 입력이며,
 * Scope 1/2/3 누락 자리도 0으로 채워 차트가 빈칸 없이 그려지도록 한다.
 */
import { describe, expect, it } from "vitest";

import type { CalculationItem } from "@/domain/pcf/types";
import { summarizeByScope } from "@/domain/pcf/summarize";

function item(overrides: Partial<CalculationItem> = {}): CalculationItem {
  return {
    activityId: "a",
    stageCode: "RAW_MATERIAL",
    scope: "SCOPE_3",
    kgCO2e: 0,
    share: 0,
    ...overrides,
  };
}

describe("summarizeByScope", () => {
  it("총합이 0이면 모든 Scope의 share=0이고 길이는 3", () => {
    const result = summarizeByScope([]);
    expect(result).toHaveLength(3);
    expect(result.map((r) => r.scope)).toEqual([
      "SCOPE_1",
      "SCOPE_2",
      "SCOPE_3",
    ]);
    expect(result.every((r) => r.kgCO2e === 0 && r.share === 0)).toBe(true);
  });

  it("Scope별 합산과 share를 정확히 계산한다", () => {
    const items: CalculationItem[] = [
      item({ scope: "SCOPE_1", kgCO2e: 10 }),
      item({ scope: "SCOPE_2", kgCO2e: 30 }),
      item({ scope: "SCOPE_3", kgCO2e: 60 }),
      item({ scope: "SCOPE_2", kgCO2e: 10 }), // SCOPE_2 누적
    ];
    const result = summarizeByScope(items);
    const map = new Map(result.map((r) => [r.scope, r]));
    expect(map.get("SCOPE_1")!.kgCO2e).toBe(10);
    expect(map.get("SCOPE_2")!.kgCO2e).toBe(40);
    expect(map.get("SCOPE_3")!.kgCO2e).toBe(60);
    const shareSum = result.reduce((s, r) => s + r.share, 0);
    expect(shareSum).toBeCloseTo(1, 10);
    expect(map.get("SCOPE_2")!.share).toBeCloseTo(40 / 110, 10);
  });

  it("존재하지 않는 Scope는 0으로 채워 3행을 항상 반환한다", () => {
    const items: CalculationItem[] = [
      item({ scope: "SCOPE_2", kgCO2e: 100 }),
    ];
    const result = summarizeByScope(items);
    expect(result).toHaveLength(3);
    const map = new Map(result.map((r) => [r.scope, r]));
    expect(map.get("SCOPE_1")!.kgCO2e).toBe(0);
    expect(map.get("SCOPE_2")!.kgCO2e).toBe(100);
    expect(map.get("SCOPE_2")!.share).toBeCloseTo(1, 10);
    expect(map.get("SCOPE_3")!.kgCO2e).toBe(0);
  });
});
