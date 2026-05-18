import { describe, expect, it } from "vitest";

import {
  calculateActivityEmission,
  calculateProductPcf,
} from "../calculate";
import { PcfDomainError } from "../errors";
import {
  getTopEmissionActivities,
  summarizeByStage,
} from "../summarize";
import type {
  CalculationItem,
  EmissionFactor,
  ProductActivity,
} from "../types";

/**
 * PCF 계산 엔진 단위 테스트.
 *
 * IMPLEMENTATION_PLAN.md 10장의 케이스 #1~#9를 도메인 단위로 검증한다.
 * (#7 음수, #8 운송 필수값 누락은 Zod 검증이 추가되기 전까지
 *  도메인 가드의 throw 동작으로 동등하게 보장한다.)
 */
function makeFactor(overrides: Partial<EmissionFactor> = {}): EmissionFactor {
  return {
    id: "factor-default",
    name: "demo factor",
    stageCode: "RAW_MATERIAL",
    unit: "kgCO2e/kg",
    value: 1,
    source: "DEMO ONLY — not for certification",
    isDemo: true,
    ...overrides,
  };
}

function makeActivity(
  overrides: Partial<ProductActivity> = {},
): ProductActivity {
  return {
    id: "activity-default",
    productId: "product-1",
    stageCode: "RAW_MATERIAL",
    name: "default activity",
    amount: 1,
    unit: "kg",
    factorId: "factor-default",
    allocationRatio: 1,
    weightKg: null,
    distanceKm: null,
    note: null,
    ...overrides,
  };
}

describe("calculateActivityEmission", () => {
  it("#1 원자재: amount × factor (2kg × 0.96 = 1.92)", () => {
    const factor = makeFactor({ value: 0.96 });
    const activity = makeActivity({ amount: 2, factorId: factor.id });
    expect(calculateActivityEmission(activity, factor)).toBeCloseTo(1.92, 6);
  });

  it("#2 전력: kWh × 계수 (30kWh × 0.45 = 13.5)", () => {
    const factor = makeFactor({
      stageCode: "USE",
      unit: "kgCO2e/kWh",
      value: 0.45,
    });
    const activity = makeActivity({
      stageCode: "USE",
      amount: 30,
      unit: "kWh",
      factorId: factor.id,
    });
    expect(calculateActivityEmission(activity, factor)).toBeCloseTo(13.5, 6);
  });

  it("#3 운송 ton-km: (500/1000) × 200 × 0.1 = 10", () => {
    const factor = makeFactor({
      stageCode: "TRANSPORT",
      unit: "kgCO2e/ton-km",
      value: 0.1,
    });
    const activity = makeActivity({
      stageCode: "TRANSPORT",
      amount: 0,
      unit: "ton-km",
      factorId: factor.id,
      weightKg: 500,
      distanceKm: 200,
    });
    expect(calculateActivityEmission(activity, factor)).toBeCloseTo(10, 6);
  });

  it("#4 할당비율 0.5 적용 시 결과가 절반", () => {
    const factor = makeFactor({ value: 0.96 });
    const full = makeActivity({ amount: 2, factorId: factor.id });
    const half = makeActivity({
      amount: 2,
      factorId: factor.id,
      allocationRatio: 0.5,
    });
    expect(calculateActivityEmission(half, factor)).toBeCloseTo(
      calculateActivityEmission(full, factor) / 2,
      6,
    );
  });

  it("#7 음수 amount는 도메인 가드가 거부한다", () => {
    const factor = makeFactor({ value: 0.96 });
    const activity = makeActivity({ amount: -1, factorId: factor.id });
    expect(() => calculateActivityEmission(activity, factor)).toThrow(
      /positive amount/i,
    );
  });

  it("#8 TRANSPORT 파생 모드에서 weightKg/distanceKm 일부만 있고 amount=0이면 거부", () => {
    const factor = makeFactor({
      stageCode: "TRANSPORT",
      unit: "kgCO2e/ton-km",
      value: 0.1,
    });
    const activity = makeActivity({
      stageCode: "TRANSPORT",
      amount: 0,
      unit: "ton-km",
      factorId: factor.id,
      weightKg: null,
      distanceKm: 200,
    });
    expect(() => calculateActivityEmission(activity, factor)).toThrow(
      /weightKg\+distanceKm.*amount\(ton-km\)/,
    );
  });

  it("TRANSPORT 직접 모드: amount(ton-km) 그대로 사용 (41 × 3.5 = 143.5)", () => {
    const factor = makeFactor({
      stageCode: "TRANSPORT",
      unit: "kgCO2e/ton-km",
      value: 3.5,
    });
    const activity = makeActivity({
      stageCode: "TRANSPORT",
      amount: 41,
      unit: "ton-km",
      factorId: factor.id,
      weightKg: null,
      distanceKm: null,
    });
    expect(calculateActivityEmission(activity, factor)).toBeCloseTo(143.5, 6);
  });

  it("TRANSPORT: weight+distance와 amount 모두 있으면 파생 모드 우선", () => {
    const factor = makeFactor({
      stageCode: "TRANSPORT",
      unit: "kgCO2e/ton-km",
      value: 0.1,
    });
    const activity = makeActivity({
      stageCode: "TRANSPORT",
      amount: 999, // 무시되어야 함
      unit: "ton-km",
      factorId: factor.id,
      weightKg: 500,
      distanceKm: 200,
    });
    // (500/1000)*200*0.1 = 10 — amount=999 이 사용되었다면 999*0.1=99.9
    expect(calculateActivityEmission(activity, factor)).toBeCloseTo(10, 6);
  });

  it("TRANSPORT: 모든 입력 누락(amount=0, w/d=null)이면 INVALID_TRANSPORT", () => {
    const factor = makeFactor({
      stageCode: "TRANSPORT",
      unit: "kgCO2e/ton-km",
      value: 0.1,
    });
    const activity = makeActivity({
      stageCode: "TRANSPORT",
      amount: 0,
      unit: "ton-km",
      factorId: factor.id,
      weightKg: null,
      distanceKm: null,
    });
    try {
      calculateActivityEmission(activity, factor);
      throw new Error("expected to throw");
    } catch (err) {
      expect(err).toBeInstanceOf(PcfDomainError);
      expect((err as PcfDomainError).code).toBe("INVALID_TRANSPORT");
    }
  });

  it("활동 단계와 계수 단계가 다르면 거부한다 (도메인 가드)", () => {
    const factor = makeFactor({
      id: "f-transport",
      stageCode: "TRANSPORT",
      unit: "kgCO2e/ton-km",
      value: 0.1,
    });
    const activity = makeActivity({
      stageCode: "RAW_MATERIAL",
      amount: 1,
      factorId: factor.id,
    });
    expect(() => calculateActivityEmission(activity, factor)).toThrow(
      /Stage mismatch/,
    );
  });

  it("도메인 가드는 PcfDomainError 인스턴스와 안정 code를 노출한다", () => {
    const factor = makeFactor({ value: 0.96 });
    const activity = makeActivity({ amount: -1, factorId: factor.id });
    try {
      calculateActivityEmission(activity, factor);
      throw new Error("expected to throw");
    } catch (err) {
      expect(err).toBeInstanceOf(PcfDomainError);
      expect((err as PcfDomainError).code).toBe("NEGATIVE_AMOUNT");
    }
  });
});

describe("calculateProductPcf", () => {
  const rawFactor = makeFactor({
    id: "f-raw",
    value: 0.96,
    stageCode: "RAW_MATERIAL",
  });
  const elecFactor = makeFactor({
    id: "f-elec",
    value: 0.45,
    stageCode: "USE",
    unit: "kgCO2e/kWh",
  });
  const transportFactor = makeFactor({
    id: "f-transport",
    value: 0.1,
    stageCode: "TRANSPORT",
    unit: "kgCO2e/ton-km",
  });

  const activities: ProductActivity[] = [
    makeActivity({
      id: "a-raw",
      stageCode: "RAW_MATERIAL",
      amount: 2,
      factorId: rawFactor.id,
    }),
    makeActivity({
      id: "a-elec",
      stageCode: "USE",
      amount: 30,
      unit: "kWh",
      factorId: elecFactor.id,
    }),
    makeActivity({
      id: "a-transport",
      stageCode: "TRANSPORT",
      amount: 0,
      unit: "ton-km",
      factorId: transportFactor.id,
      weightKg: 500,
      distanceKm: 200,
    }),
  ];

  it("#6 total === Σ items.kgCO2e", () => {
    const result = calculateProductPcf(activities, [
      rawFactor,
      elecFactor,
      transportFactor,
    ]);
    const sum = result.items.reduce((acc, it) => acc + it.kgCO2e, 0);
    expect(result.total).toBeCloseTo(sum, 6);
    expect(result.total).toBeCloseTo(1.92 + 13.5 + 10, 6);
  });

  it("share 합계가 1.0에 수렴한다", () => {
    const result = calculateProductPcf(activities, [
      rawFactor,
      elecFactor,
      transportFactor,
    ]);
    const shareSum = result.items.reduce((acc, it) => acc + it.share, 0);
    expect(shareSum).toBeCloseTo(1, 6);
  });

  it("입력이 비어있으면 total=0, items=[]", () => {
    const result = calculateProductPcf([], []);
    expect(result.total).toBe(0);
    expect(result.items).toEqual([]);
  });
});

describe("summarizeByStage", () => {
  it("#5 단계별 합계와 share 합이 1.0", () => {
    const items: CalculationItem[] = [
      { activityId: "a1", stageCode: "RAW_MATERIAL", kgCO2e: 6, share: 0 },
      { activityId: "a2", stageCode: "RAW_MATERIAL", kgCO2e: 4, share: 0 },
      { activityId: "a3", stageCode: "USE", kgCO2e: 10, share: 0 },
    ];
    const summary = summarizeByStage(items);

    const raw = summary.find((s) => s.stageCode === "RAW_MATERIAL");
    const use = summary.find((s) => s.stageCode === "USE");
    const transport = summary.find((s) => s.stageCode === "TRANSPORT");

    expect(raw?.kgCO2e).toBe(10);
    expect(raw?.share).toBeCloseTo(0.5, 6);
    expect(use?.kgCO2e).toBe(10);
    expect(use?.share).toBeCloseTo(0.5, 6);
    expect(transport?.kgCO2e).toBe(0);
    expect(transport?.share).toBe(0);

    const shareSum = summary.reduce((acc, s) => acc + s.share, 0);
    expect(shareSum).toBeCloseTo(1, 6);
  });

  it("LIFECYCLE_STAGES 순서를 유지한다", () => {
    const summary = summarizeByStage([]);
    expect(summary.map((s) => s.stageCode)).toEqual([
      "RAW_MATERIAL",
      "PRODUCTION",
      "TRANSPORT",
      "USE",
      "END_OF_LIFE",
    ]);
  });
});

describe("getTopEmissionActivities", () => {
  const items: CalculationItem[] = [
    { activityId: "a1", stageCode: "RAW_MATERIAL", kgCO2e: 1, share: 0 },
    { activityId: "a2", stageCode: "USE", kgCO2e: 50, share: 0 },
    { activityId: "a3", stageCode: "PRODUCTION", kgCO2e: 20, share: 0 },
    { activityId: "a4", stageCode: "TRANSPORT", kgCO2e: 5, share: 0 },
  ];

  it("#9 kgCO2e 내림차순 상위 3개를 반환한다", () => {
    const top = getTopEmissionActivities(items, 3);
    expect(top.map((i) => i.activityId)).toEqual(["a2", "a3", "a4"]);
  });

  it("입력 배열을 변경하지 않는다", () => {
    const snapshot = [...items];
    getTopEmissionActivities(items, 2);
    expect(items).toEqual(snapshot);
  });

  it("n이 0 이하면 빈 배열", () => {
    expect(getTopEmissionActivities(items, 0)).toEqual([]);
  });
});
