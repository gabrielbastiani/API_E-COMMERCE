/*
  Warnings:

  - You are about to drop the `filterOptions` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "filterOptions" DROP CONSTRAINT "filterOptions_filterId_fkey";

-- DropTable
DROP TABLE "filterOptions";
