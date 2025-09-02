/*
  Warnings:

  - A unique constraint covering the columns `[id_order_store]` on the table `orders` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "orders_id_order_store_key" ON "orders"("id_order_store");
