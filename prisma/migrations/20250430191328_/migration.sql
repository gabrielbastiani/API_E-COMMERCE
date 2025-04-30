-- CreateEnum
CREATE TYPE "StatusCategory" AS ENUM ('DISPONIVEL', 'INDISPONIVEL');

-- AlterTable
ALTER TABLE "categories" ADD COLUMN     "status" "StatusCategory" NOT NULL DEFAULT 'DISPONIVEL';
