/*
  Warnings:

  - Added the required column `type` to the `paymentWebhooks` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "paymentWebhooks" ADD COLUMN     "type" TEXT NOT NULL,
ALTER COLUMN "asaas_payment_id" DROP NOT NULL;
