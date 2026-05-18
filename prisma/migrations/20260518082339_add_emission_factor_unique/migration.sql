/*
  Warnings:

  - A unique constraint covering the columns `[name,stageCode]` on the table `EmissionFactor` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "EmissionFactor_name_stageCode_key" ON "EmissionFactor"("name", "stageCode");
