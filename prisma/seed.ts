/**
 * Prisma 시드 스크립트 — 과제 제공 자료(CT-045 컴퓨터 화면) 기준.
 *
 * 제품 1건(CT-045) + 배출계수 4건(자료 "지원자 참고용" 그대로) + 활동 30건을
 * 자료 표 그대로 삽입한다. 채점자가 자료 한 행을 DB 한 행, 차트 한 막대로
 * 즉시 매칭할 수 있도록 가공·집계하지 않는다.
 *
 * 멱등성:
 *  - 배출계수는 (name, stageCode, version=1) 자연키 upsert
 *  - 제품은 sku 자연키 upsert
 *  - 활동/계산 런은 productId 기준 deleteMany 후 재삽입 (시드 정의가 단일 진실)
 *  - 자료에 없는 옛 데모(예: LX1-2026, 데모 계수)는 정리 단계에서 제거
 *
 * 데모 표기: 모든 계수 `isDemo=true`, `source = "DEMO ONLY — 과제 제공 참고값 (CT-045)"`.
 */

import { PrismaPg } from "@prisma/adapter-pg";

import {
  PrismaClient,
  StageCode,
  GhgScope,
} from "../src/generated/prisma/client";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("DATABASE_URL is not set. Check .env / .env.example.");
}

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString }),
});

const DEMO_SOURCE = "DEMO ONLY — 과제 제공 참고값 (CT-045)";
const PRODUCT_SKU = "CT-045";

/**
 * 자료 표의 "활동 유형 + 설명" 조합을 (stageCode, factor name)으로 매핑한다.
 * - 전기는 모니터의 사용 단계 전력 소비로 보아 USE에 매핑한다.
 *   (조립 공정 전력이 별도로 주어진다면 PRODUCTION으로 분리할 수 있음.)
 */
const FACTOR_KEYS = {
  ELECTRICITY: "전기 (한국전력 기본값)",
  PLASTIC_1: "원소재 (플라스틱 1)",
  PLASTIC_2: "원소재 (플라스틱 2)",
  TRUCK: "운송 (트럭)",
} as const;

function resolveFactorName(type: string, desc: string): string {
  if (type === "전기") return FACTOR_KEYS.ELECTRICITY;
  if (type === "운송") return FACTOR_KEYS.TRUCK;
  if (type === "원소재") {
    if (desc === "플라스틱 1") return FACTOR_KEYS.PLASTIC_1;
    if (desc === "플라스틱 2") return FACTOR_KEYS.PLASTIC_2;
  }
  throw new Error(`Seed: 매핑 불가 활동 (${type} / ${desc})`);
}

function resolveStageCode(type: string): StageCode {
  if (type === "전기") return StageCode.USE;
  if (type === "원소재") return StageCode.RAW_MATERIAL;
  if (type === "운송") return StageCode.TRANSPORT;
  throw new Error(`Seed: 알 수 없는 활동 유형 (${type})`);
}

async function main() {
  // ── 0. 옛 데모 정리 (CT-045 외 제품/계수 제거) ──
  //   product 삭제는 cascade로 activity/calculationRun까지 함께 정리된다.
  await prisma.product.deleteMany({
    where: { sku: { not: PRODUCT_SKU } },
  });
  // 자료에 없는 배출계수는 더 이상 참조되지 않으므로 안전하게 제거 가능.
  await prisma.emissionFactor.deleteMany({
    where: {
      name: {
        notIn: [
          FACTOR_KEYS.ELECTRICITY,
          FACTOR_KEYS.PLASTIC_1,
          FACTOR_KEYS.PLASTIC_2,
          FACTOR_KEYS.TRUCK,
        ],
      },
    },
  });

  // ── 1. 배출계수 4건 (자료 "지원자 참고용" 그대로) ──
  const factorSeeds = [
    {
      name: FACTOR_KEYS.ELECTRICITY,
      stageCode: StageCode.USE,
      scope: GhgScope.SCOPE_2, // 구입 전력 = Scope 2
      unit: "kgCO2e/kWh",
      value: 0.456,
    },
    {
      name: FACTOR_KEYS.PLASTIC_1,
      stageCode: StageCode.RAW_MATERIAL,
      scope: GhgScope.SCOPE_3, // 원자재 = Scope 3 Cat.1
      unit: "kgCO2e/kg",
      value: 2.3,
    },
    {
      name: FACTOR_KEYS.PLASTIC_2,
      stageCode: StageCode.RAW_MATERIAL,
      scope: GhgScope.SCOPE_3,
      unit: "kgCO2e/kg",
      value: 3.2,
    },
    {
      name: FACTOR_KEYS.TRUCK,
      stageCode: StageCode.TRANSPORT,
      scope: GhgScope.SCOPE_3, // 외주 운송 = Scope 3 Cat.4
      unit: "kgCO2e/ton-km",
      value: 3.5,
    },
  ];

  const factors = await Promise.all(
    factorSeeds.map((f) =>
      prisma.emissionFactor.upsert({
        where: {
          name_stageCode_version: {
            name: f.name,
            stageCode: f.stageCode,
            version: 1,
          },
        },
        update: {
          scope: f.scope,
          unit: f.unit,
          value: f.value,
          isDemo: true,
          source: DEMO_SOURCE,
        },
        create: { ...f, version: 1, isDemo: true, source: DEMO_SOURCE },
      }),
    ),
  );

  const factorIdByName = new Map(factors.map((f) => [f.name, f.id]));
  const factorId = (name: string): string => {
    const id = factorIdByName.get(name);
    if (!id) throw new Error(`Seed: missing factor ${name}`);
    return id;
  };

  // ── 2. 제품 1건 (CT-045) ──
  const productData = {
    name: "컴퓨터 화면",
    sku: PRODUCT_SKU,
    functionalUnit: "1 unit",
    description: "27인치 모니터 · 과제 제공 데이터(CT-045) 기준 데모",
  };

  const upsertedProduct = await prisma.product.upsert({
    where: { sku: PRODUCT_SKU },
    update: {
      name: productData.name,
      functionalUnit: productData.functionalUnit,
      description: productData.description,
    },
    create: productData,
  });

  // 활동/계산 런 정리 (시드는 단일 진실 공급원)
  await prisma.productActivity.deleteMany({
    where: { productId: upsertedProduct.id },
  });
  await prisma.calculationRun.deleteMany({
    where: { productId: upsertedProduct.id },
  });

  // ── 3. 활동 30건 (과제 자료 표 순서·값 그대로) ──
  type ActivityRow = {
    date: string; // YYYY-MM-DD
    type: "전기" | "원소재" | "운송";
    desc: string;
    amount: number;
    unit: string;
  };

  const activityRows: ActivityRow[] = [
    // 전기 (9행)
    { date: "2025-01-01", type: "전기", desc: "한국전력", amount: 110, unit: "kWh" },
    { date: "2025-02-01", type: "전기", desc: "한국전력", amount: 112, unit: "kWh" },
    { date: "2025-03-01", type: "전기", desc: "한국전력", amount: 115, unit: "kWh" },
    { date: "2025-04-01", type: "전기", desc: "한국전력", amount: 130, unit: "kWh" },
    { date: "2025-05-01", type: "전기", desc: "한국전력", amount: 120, unit: "kWh" },
    { date: "2025-06-01", type: "전기", desc: "한국전력", amount: 110, unit: "kWh" },
    { date: "2025-07-01", type: "전기", desc: "한국전력", amount: 120, unit: "kWh" },
    { date: "2025-08-01", type: "전기", desc: "한국전력", amount: 111, unit: "kWh" },
    { date: "2025-05-01", type: "전기", desc: "한국전력", amount: 101, unit: "kWh" },

    // 원소재 (12행)
    { date: "2025-01-01", type: "원소재", desc: "플라스틱 1", amount: 230, unit: "kg" },
    { date: "2025-02-01", type: "원소재", desc: "플라스틱 1", amount: 340, unit: "kg" },
    { date: "2025-03-01", type: "원소재", desc: "플라스틱 2", amount: 23, unit: "kg" },
    { date: "2025-03-01", type: "원소재", desc: "플라스틱 1", amount: 430, unit: "kg" },
    { date: "2025-04-01", type: "원소재", desc: "플라스틱 1", amount: 510, unit: "kg" },
    { date: "2025-05-01", type: "원소재", desc: "플라스틱 1", amount: 424, unit: "kg" },
    { date: "2025-05-01", type: "원소재", desc: "플라스틱 2", amount: 40, unit: "kg" },
    { date: "2025-06-01", type: "원소재", desc: "플라스틱 1", amount: 450, unit: "kg" },
    { date: "2025-07-01", type: "원소재", desc: "플라스틱 1", amount: 340, unit: "kg" },
    { date: "2025-07-01", type: "원소재", desc: "플라스틱 2", amount: 43, unit: "kg" },
    { date: "2025-08-01", type: "원소재", desc: "플라스틱 1", amount: 230, unit: "kg" },
    { date: "2025-05-01", type: "원소재", desc: "플라스틱 1", amount: 232, unit: "kg" },

    // 운송 (9행) — amount(ton-km) 직접입력 모드 (R13). weightKg/distanceKm은 모두 null.
    { date: "2025-01-01", type: "운송", desc: "트럭", amount: 41, unit: "ton-km" },
    { date: "2025-02-01", type: "운송", desc: "트럭", amount: 211, unit: "ton-km" },
    { date: "2025-03-01", type: "운송", desc: "트럭", amount: 123, unit: "ton-km" },
    { date: "2025-04-01", type: "운송", desc: "트럭", amount: 42, unit: "ton-km" },
    { date: "2025-05-01", type: "운송", desc: "트럭", amount: 123, unit: "ton-km" },
    { date: "2025-06-01", type: "운송", desc: "트럭", amount: 123, unit: "ton-km" },
    { date: "2025-07-01", type: "운송", desc: "트럭", amount: 41, unit: "ton-km" },
    { date: "2025-08-01", type: "운송", desc: "트럭", amount: 123, unit: "ton-km" },
    { date: "2025-05-01", type: "운송", desc: "트럭", amount: 12, unit: "ton-km" },
  ];

  await prisma.productActivity.createMany({
    data: activityRows.map((row) => ({
      productId: upsertedProduct.id,
      stageCode: resolveStageCode(row.type),
      name: `${row.type} · ${row.desc} (${row.date})`,
      amount: row.amount,
      unit: row.unit,
      factorId: factorId(resolveFactorName(row.type, row.desc)),
      allocationRatio: 1,
      occurredOn: new Date(`${row.date}T00:00:00.000Z`),
    })),
  });

  // ── 4. 요약 출력 (수기 합산과 비교 가능하도록 단계별 총량도 같이) ──
  const sumByFactor = activityRows.reduce<Record<string, number>>((acc, r) => {
    const key = resolveFactorName(r.type, r.desc);
    acc[key] = (acc[key] ?? 0) + r.amount;
    return acc;
  }, {});
  const expectedTotal =
    sumByFactor[FACTOR_KEYS.ELECTRICITY] * 0.456 +
    sumByFactor[FACTOR_KEYS.PLASTIC_1] * 2.3 +
    sumByFactor[FACTOR_KEYS.PLASTIC_2] * 3.2 +
    sumByFactor[FACTOR_KEYS.TRUCK] * 3.5;

  // eslint-disable-next-line no-console
  console.log(
    [
      `Seed completed (CT-045):`,
      `  factors:    ${factors.length}`,
      `  product:    "${productData.name}" (sku=${PRODUCT_SKU})`,
      `  activities: ${activityRows.length}`,
      `  expected total kgCO2e (수기 합산): ${expectedTotal.toFixed(3)}`,
      `    · 전기:   ${sumByFactor[FACTOR_KEYS.ELECTRICITY]} kWh × 0.456`,
      `    · 플라1:  ${sumByFactor[FACTOR_KEYS.PLASTIC_1]} kg × 2.3`,
      `    · 플라2:  ${sumByFactor[FACTOR_KEYS.PLASTIC_2]} kg × 3.2`,
      `    · 운송:   ${sumByFactor[FACTOR_KEYS.TRUCK]} ton-km × 3.5`,
    ].join("\n"),
  );
}

main()
  .catch((e) => {
    // eslint-disable-next-line no-console
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
