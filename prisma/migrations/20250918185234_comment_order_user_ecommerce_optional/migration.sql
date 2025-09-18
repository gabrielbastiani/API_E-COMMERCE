-- DropForeignKey
ALTER TABLE "commentsOrder" DROP CONSTRAINT "commentsOrder_userEcommerce_id_fkey";

-- AlterTable
ALTER TABLE "commentsOrder" ALTER COLUMN "userEcommerce_id" DROP NOT NULL;

-- AlterTable
ALTER TABLE "orders" ADD COLUMN     "assigned_userEcommerce_id" TEXT;

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_assigned_userEcommerce_id_fkey" FOREIGN KEY ("assigned_userEcommerce_id") REFERENCES "usersEcommerce"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "commentsOrder" ADD CONSTRAINT "commentsOrder_userEcommerce_id_fkey" FOREIGN KEY ("userEcommerce_id") REFERENCES "usersEcommerce"("id") ON DELETE SET NULL ON UPDATE CASCADE;
