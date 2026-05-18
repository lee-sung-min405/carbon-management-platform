-- AlterTable
ALTER TABLE "ProductActivity" ADD COLUMN     "occurredOn" DATE;

-- CreateIndex
CREATE INDEX "ProductActivity_productId_occurredOn_idx" ON "ProductActivity"("productId", "occurredOn");
