/*
  Warnings:

  - You are about to drop the column `validFrom` on the `EmissionFactor` table. All the data in the column will be lost.
  - You are about to drop the column `validTo` on the `EmissionFactor` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "EmissionFactor" DROP COLUMN "validFrom",
DROP COLUMN "validTo";
