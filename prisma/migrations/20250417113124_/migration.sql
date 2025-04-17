-- CreateEnum
CREATE TYPE "StatusCustomer" AS ENUM ('DISPONIVEL', 'INDISPONIVEL');

-- AlterTable
ALTER TABLE "customers" ADD COLUMN     "status" "StatusCustomer" NOT NULL DEFAULT 'DISPONIVEL';
