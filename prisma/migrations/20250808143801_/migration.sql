/*
  Warnings:

  - A unique constraint covering the columns `[cart_id,product_id,variant_id]` on the table `cartItens` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "cartItens" ADD COLUMN     "variant_id" UUID;

-- CreateIndex
CREATE UNIQUE INDEX "cartItens_cart_id_product_id_variant_id_key" ON "cartItens"("cart_id", "product_id", "variant_id");

-- AddForeignKey
ALTER TABLE "cartItens" ADD CONSTRAINT "cartItens_variant_id_fkey" FOREIGN KEY ("variant_id") REFERENCES "productsVariants"("id") ON DELETE SET NULL ON UPDATE CASCADE;
