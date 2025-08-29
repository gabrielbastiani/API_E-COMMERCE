/*
  Warnings:

  - A unique constraint covering the columns `[event]` on the table `paymentWebhooks` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "paymentWebhooks_event_key" ON "paymentWebhooks"("event");
