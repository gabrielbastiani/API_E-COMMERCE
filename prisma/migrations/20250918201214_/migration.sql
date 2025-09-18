-- CreateTable
CREATE TABLE "commentAttachments" (
    "id" TEXT NOT NULL,
    "comment_id" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "filename" TEXT NOT NULL,
    "mimetype" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "commentAttachments_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "commentAttachments" ADD CONSTRAINT "commentAttachments_comment_id_fkey" FOREIGN KEY ("comment_id") REFERENCES "commentsOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE;
