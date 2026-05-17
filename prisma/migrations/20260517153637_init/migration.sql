-- CreateEnum
CREATE TYPE "StageCode" AS ENUM ('RAW_MATERIAL', 'PRODUCTION', 'TRANSPORT', 'USE', 'END_OF_LIFE');

-- CreateTable
CREATE TABLE "Product" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "sku" TEXT,
    "functionalUnit" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Product_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmissionFactor" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "stageCode" "StageCode" NOT NULL,
    "unit" TEXT NOT NULL,
    "value" DOUBLE PRECISION NOT NULL,
    "source" TEXT NOT NULL,
    "isDemo" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "EmissionFactor_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductActivity" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "stageCode" "StageCode" NOT NULL,
    "name" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "unit" TEXT NOT NULL,
    "factorId" TEXT NOT NULL,
    "allocationRatio" DOUBLE PRECISION NOT NULL DEFAULT 1.0,
    "weightKg" DOUBLE PRECISION,
    "distanceKm" DOUBLE PRECISION,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProductActivity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CalculationRun" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "totalKgCO2e" DOUBLE PRECISION NOT NULL,
    "snapshotJson" JSONB NOT NULL,
    "runAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CalculationRun_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CalculationItem" (
    "id" TEXT NOT NULL,
    "runId" TEXT NOT NULL,
    "activityId" TEXT NOT NULL,
    "stageCode" "StageCode" NOT NULL,
    "kgCO2e" DOUBLE PRECISION NOT NULL,
    "share" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "CalculationItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Product_sku_key" ON "Product"("sku");

-- CreateIndex
CREATE INDEX "EmissionFactor_stageCode_idx" ON "EmissionFactor"("stageCode");

-- CreateIndex
CREATE INDEX "ProductActivity_productId_idx" ON "ProductActivity"("productId");

-- CreateIndex
CREATE INDEX "ProductActivity_factorId_idx" ON "ProductActivity"("factorId");

-- CreateIndex
CREATE INDEX "CalculationRun_productId_runAt_idx" ON "CalculationRun"("productId", "runAt");

-- CreateIndex
CREATE INDEX "CalculationItem_runId_idx" ON "CalculationItem"("runId");

-- AddForeignKey
ALTER TABLE "ProductActivity" ADD CONSTRAINT "ProductActivity_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductActivity" ADD CONSTRAINT "ProductActivity_factorId_fkey" FOREIGN KEY ("factorId") REFERENCES "EmissionFactor"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CalculationRun" ADD CONSTRAINT "CalculationRun_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CalculationItem" ADD CONSTRAINT "CalculationItem_runId_fkey" FOREIGN KEY ("runId") REFERENCES "CalculationRun"("id") ON DELETE CASCADE ON UPDATE CASCADE;
