/*
  Warnings:

  - You are about to drop the column `childProductId` on the `productsRelations` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[parentProduct_id,childProduct_id,relationType]` on the table `productsRelations` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `childProduct_id` to the `productsRelations` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "productsRelations" DROP CONSTRAINT "productsRelations_childProductId_fkey";

-- DropIndex
DROP INDEX "productsRelations_parentProduct_id_childProductId_relationT_key";

-- AlterTable
ALTER TABLE "products" ADD COLUMN     "view" INTEGER DEFAULT 0;

-- AlterTable
ALTER TABLE "productsRelations" DROP COLUMN "childProductId",
ADD COLUMN     "childProduct_id" UUID NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "productsRelations_parentProduct_id_childProduct_id_relation_key" ON "productsRelations"("parentProduct_id", "childProduct_id", "relationType");

-- AddForeignKey
ALTER TABLE "productsRelations" ADD CONSTRAINT "productsRelations_childProduct_id_fkey" FOREIGN KEY ("childProduct_id") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
