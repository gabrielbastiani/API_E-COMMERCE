/*
  Warnings:

  - You are about to drop the column `mainPromotionId` on the `products` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "products" DROP CONSTRAINT "products_mainPromotionId_fkey";

-- AlterTable
ALTER TABLE "products" DROP COLUMN "mainPromotionId",
ADD COLUMN     "mainPromotion_id" TEXT;

-- AddForeignKey
ALTER TABLE "products" ADD CONSTRAINT "products_mainPromotion_id_fkey" FOREIGN KEY ("mainPromotion_id") REFERENCES "promotions"("id") ON DELETE SET NULL ON UPDATE CASCADE;
