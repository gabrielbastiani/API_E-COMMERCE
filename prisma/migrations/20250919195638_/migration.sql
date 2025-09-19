-- AlterTable
ALTER TABLE "orderItens" ADD COLUMN     "variant_id" UUID;

-- AddForeignKey
ALTER TABLE "orderItens" ADD CONSTRAINT "orderItens_variant_id_fkey" FOREIGN KEY ("variant_id") REFERENCES "productsVariants"("id") ON DELETE SET NULL ON UPDATE CASCADE;
