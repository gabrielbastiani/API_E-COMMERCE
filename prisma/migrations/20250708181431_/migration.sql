/*
  Warnings:

  - You are about to drop the column `filterId` on the `categories` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "categories" DROP CONSTRAINT "categories_filterId_fkey";

-- AlterTable
ALTER TABLE "categories" DROP COLUMN "filterId",
ADD COLUMN     "filter_id" TEXT;

-- AddForeignKey
ALTER TABLE "categories" ADD CONSTRAINT "categories_filter_id_fkey" FOREIGN KEY ("filter_id") REFERENCES "filters"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "menuItems" ADD CONSTRAINT "menuItems_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "menuItems" ADD CONSTRAINT "menuItems_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE SET NULL ON UPDATE CASCADE;
