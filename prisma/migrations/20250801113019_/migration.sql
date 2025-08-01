/*
  Warnings:

  - You are about to drop the column `active` on the `promotions` table. All the data in the column will be lost.

*/
-- CreateEnum
CREATE TYPE "StatusPromotion" AS ENUM ('Programado', 'Fim_da_programacao', 'Disponivel', 'Disponivel_programado', 'Indisponivel');

-- AlterTable
ALTER TABLE "promotions" DROP COLUMN "active",
ADD COLUMN     "email_sent" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "is_completed" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "is_processing" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "status" "StatusPromotion" NOT NULL DEFAULT 'Disponivel';
