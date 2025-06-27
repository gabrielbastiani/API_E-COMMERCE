/*
  Warnings:

  - You are about to drop the column `name` on the `buysTogethers` table. All the data in the column will be lost.
  - You are about to drop the column `product_id` on the `buysTogethers` table. All the data in the column will be lost.
  - You are about to drop the `promotionRules` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "buysTogethers" DROP CONSTRAINT "buysTogethers_product_id_fkey";

-- DropForeignKey
ALTER TABLE "promotionRules" DROP CONSTRAINT "promotionRules_promotion_id_fkey";

-- AlterTable
ALTER TABLE "buysTogethers" DROP COLUMN "name",
DROP COLUMN "product_id",
ADD COLUMN     "name_group" TEXT,
ADD COLUMN     "product" TEXT;

-- AlterTable
ALTER TABLE "products" ADD COLUMN     "buyTogether_id" TEXT;

-- DropTable
DROP TABLE "promotionRules";

-- AddForeignKey
ALTER TABLE "products" ADD CONSTRAINT "products_buyTogether_id_fkey" FOREIGN KEY ("buyTogether_id") REFERENCES "buysTogethers"("id") ON DELETE SET NULL ON UPDATE CASCADE;
