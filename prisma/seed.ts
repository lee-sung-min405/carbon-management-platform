/**
 * Prisma 시드 스크립트.
 *
 * 데모용 배출계수 6종 + 샘플 제품 1개(Laptop X1) + 활동 6건을 생성한다.
 * 모든 EmissionFactor는 `isDemo=true`, `source`에 DEMO 표기를 포함하여
 * UI/README/시드 3중으로 데모 데이터임을 명시한다 (계획 16장 안티패턴 대응).
 *
 * 멱등성: 자연키(EmissionFactor: name+stageCode / Product: sku) 기준 upsert로
 *        재실행해도 ID가 안정적으로 유지된다. 활동은 productId 기준 deleteMany 후
 *        재삽입하여 시드 정의를 단일 진실 공급원으로 둔다.
 */

import { PrismaPg } from "@prisma/adapter-pg";

import { PrismaClient, StageCode, GhgScope } from "../src/generated/prisma/client";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("DATABASE_URL is not set. Check .env / .env.example.");
}

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString }),
});

const DEMO_SOURCE = "DEMO ONLY — not for certification";

async function main() {
  // 1. 배출계수 (데모 값) — 자연키(name+stageCode+version=1) 기준 upsert
  const factorSeeds = [
    {
      name: "알루미늄 (1차 생산)",
      stageCode: StageCode.RAW_MATERIAL,
      scope: GhgScope.SCOPE_3, // 원자재 채굴·제련은 공급망 배출
      unit: "kgCO2e/kg",
      value: 8.24,
    },
    {
      name: "폴리카보네이트 수지",
      stageCode: StageCode.RAW_MATERIAL,
      scope: GhgScope.SCOPE_3,
      unit: "kgCO2e/kg",
      value: 3.43,
    },
    {
      name: "공장 전력 (한국 평균)",
      stageCode: StageCode.PRODUCTION,
      scope: GhgScope.SCOPE_2, // 구입 전력 = Scope 2
      unit: "kgCO2e/kWh",
      value: 0.4567,
    },
    {
      name: "디젤 화물차 (ton-km)",
      stageCode: StageCode.TRANSPORT,
      scope: GhgScope.SCOPE_3, // 외주 운송 = Scope 3 카테고리4
      unit: "kgCO2e/ton-km",
      value: 0.105,
    },
    {
      name: "사용 단계 전력 (한국 평균)",
      stageCode: StageCode.USE,
      scope: GhgScope.SCOPE_2, // 고객이 구입한 전력 기준 (편의상 Scope 2 표기, 실제는 Scope 3 cat11 서술 필요)
      unit: "kgCO2e/kWh",
      value: 0.4567,
    },
    {
      name: "전자제품 폐기 (소각·매립 혼합)",
      stageCode: StageCode.END_OF_LIFE,
      scope: GhgScope.SCOPE_3, // 폐기 = Scope 3 카테고리12
      unit: "kgCO2e/kg",
      value: 0.62,
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

  const byName = new Map(factors.map((f) => [f.name, f]));
  const factorId = (name: string): string => {
    const f = byName.get(name);
    if (!f) throw new Error(`Seed: missing factor ${name}`);
    return f.id;
  };

  // 2. 샘플 제품 — sku 기준 upsert (활동은 productId 기준 비우고 재삽입)
  const productSku = "LX1-2026";
  const productData = {
    name: "Laptop X1",
    sku: productSku,
    functionalUnit: "1 unit",
    description: "데모용 노트북 제품 (LCA 시연 시나리오)",
  };

  const upsertedProduct = await prisma.product.upsert({
    where: { sku: productSku },
    update: {
      name: productData.name,
      functionalUnit: productData.functionalUnit,
      description: productData.description,
    },
    create: productData,
  });

  // 활동/계산 런은 productId 기준으로 정리 (CalculationRun은 Cascade로 함께 제거)
  await prisma.productActivity.deleteMany({
    where: { productId: upsertedProduct.id },
  });
  await prisma.calculationRun.deleteMany({
    where: { productId: upsertedProduct.id },
  });

  const product = await prisma.product.update({
    where: { id: upsertedProduct.id },
    data: {
      activities: {
        create: [
          {
            stageCode: StageCode.RAW_MATERIAL,
            name: "알루미늄 프레임 1.2kg",
            amount: 1.2,
            unit: "kg",
            factorId: factorId("알루미늄 (1차 생산)"),
            allocationRatio: 1,
          },
          {
            stageCode: StageCode.RAW_MATERIAL,
            name: "폴리카보네이트 하우징 0.5kg",
            amount: 0.5,
            unit: "kg",
            factorId: factorId("폴리카보네이트 수지"),
            allocationRatio: 1,
          },
          {
            stageCode: StageCode.PRODUCTION,
            name: "조립 공정 전력 30kWh",
            amount: 30,
            unit: "kWh",
            factorId: factorId("공장 전력 (한국 평균)"),
            allocationRatio: 1,
          },
          {
            stageCode: StageCode.TRANSPORT,
            name: "공장 → 물류센터 운송 (1.8kg × 320km)",
            amount: 0, // 도메인 계산기는 weightKg/distanceKm을 우선 사용
            unit: "ton-km",
            factorId: factorId("디젤 화물차 (ton-km)"),
            allocationRatio: 1,
            weightKg: 1.8,
            distanceKm: 320,
          },
          {
            stageCode: StageCode.USE,
            name: "3년 사용 전력 (연 80kWh × 3)",
            amount: 240,
            unit: "kWh",
            factorId: factorId("사용 단계 전력 (한국 평균)"),
            allocationRatio: 1,
          },
          {
            stageCode: StageCode.END_OF_LIFE,
            name: "제품 폐기 1.8kg",
            amount: 1.8,
            unit: "kg",
            factorId: factorId("전자제품 폐기 (소각·매립 혼합)"),
            allocationRatio: 1,
          },
        ],
      },
    },
    include: { activities: true },
  });

  // eslint-disable-next-line no-console
  console.log(
    `Seed completed: ${factors.length} factors, product "${product.name}" with ${product.activities.length} activities.`,
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

