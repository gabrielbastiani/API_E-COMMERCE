-- CreateTable
CREATE TABLE "promotion_badges" (
    "id" TEXT NOT NULL,
    "promotion_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "imageUrl" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "promotion_badges_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "promotion_badges" ADD CONSTRAINT "promotion_badges_promotion_id_fkey" FOREIGN KEY ("promotion_id") REFERENCES "promotions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
