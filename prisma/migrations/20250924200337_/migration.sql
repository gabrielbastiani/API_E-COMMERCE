-- CreateTable
CREATE TABLE "productsCharacteristics" (
    "id" TEXT NOT NULL,
    "product_id" UUID NOT NULL,
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "image" TEXT,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "productsCharacteristics_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "productsCharacteristics" ADD CONSTRAINT "productsCharacteristics_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
