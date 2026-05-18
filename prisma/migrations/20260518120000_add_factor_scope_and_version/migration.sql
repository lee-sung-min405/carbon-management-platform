-- CreateEnum
CREATE TYPE "GhgScope" AS ENUM ('SCOPE_1', 'SCOPE_2', 'SCOPE_3');

-- DropIndex
DROP INDEX IF EXISTS "EmissionFactor_name_stageCode_key";

-- AlterTable
ALTER TABLE "EmissionFactor"
  ADD COLUMN "scope"     "GhgScope" NOT NULL DEFAULT 'SCOPE_3',
  ADD COLUMN "version"   INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN "validFrom" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  ADD COLUMN "validTo"   TIMESTAMP(3);

-- AlterTable
ALTER TABLE "CalculationItem"
  ADD COLUMN "scope" "GhgScope" NOT NULL DEFAULT 'SCOPE_3';

-- CreateIndex
CREATE UNIQUE INDEX "EmissionFactor_name_stageCode_version_key" ON "EmissionFactor"("name", "stageCode", "version");

-- CreateIndex
CREATE INDEX "EmissionFactor_stageCode_scope_idx" ON "EmissionFactor"("stageCode", "scope");
