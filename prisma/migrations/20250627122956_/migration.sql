/*
  Warnings:

  - You are about to drop the column `product` on the `buysTogethers` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "buysTogethers" DROP COLUMN "product",
ADD COLUMN     "products" JSONB;
