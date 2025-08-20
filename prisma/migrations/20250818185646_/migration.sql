/*
  Warnings:

  - You are about to drop the column `attributeKeyId` on the `filters` table. All the data in the column will be lost.
  - You are about to drop the `attributeKeys` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "filters" DROP CONSTRAINT "filters_attributeKeyId_fkey";

-- AlterTable
ALTER TABLE "filters" DROP COLUMN "attributeKeyId";

-- DropTable
DROP TABLE "attributeKeys";
