/*
  Warnings:

  - You are about to drop the column `user_ecommerce_id` on the `commentsOrder` table. All the data in the column will be lost.
  - You are about to drop the column `user_ecommerce_id` on the `notificationUsersEcommerce` table. All the data in the column will be lost.
  - Added the required column `userEcommerce_id` to the `commentsOrder` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "commentsOrder" DROP CONSTRAINT "commentsOrder_user_ecommerce_id_fkey";

-- DropForeignKey
ALTER TABLE "notificationUsersEcommerce" DROP CONSTRAINT "notificationUsersEcommerce_user_ecommerce_id_fkey";

-- AlterTable
ALTER TABLE "commentsOrder" DROP COLUMN "user_ecommerce_id",
ADD COLUMN     "userEcommerce_id" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "notificationUsersEcommerce" DROP COLUMN "user_ecommerce_id",
ADD COLUMN     "userEcommerce_id" TEXT;

-- AddForeignKey
ALTER TABLE "commentsOrder" ADD CONSTRAINT "commentsOrder_userEcommerce_id_fkey" FOREIGN KEY ("userEcommerce_id") REFERENCES "usersEcommerce"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notificationUsersEcommerce" ADD CONSTRAINT "notificationUsersEcommerce_userEcommerce_id_fkey" FOREIGN KEY ("userEcommerce_id") REFERENCES "usersEcommerce"("id") ON DELETE SET NULL ON UPDATE CASCADE;
