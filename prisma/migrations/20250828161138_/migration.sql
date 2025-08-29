-- DropForeignKey
ALTER TABLE "emailReminders" DROP CONSTRAINT "emailReminders_template_id_fkey";

-- AlterTable
ALTER TABLE "emailReminders" ALTER COLUMN "template_id" DROP NOT NULL;

-- AlterTable
ALTER TABLE "orders" ADD COLUMN     "id_order_store" TEXT;

-- AddForeignKey
ALTER TABLE "emailReminders" ADD CONSTRAINT "emailReminders_template_id_fkey" FOREIGN KEY ("template_id") REFERENCES "emailTemplates"("id") ON DELETE SET NULL ON UPDATE CASCADE;
