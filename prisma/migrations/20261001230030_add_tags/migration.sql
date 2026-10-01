-- CreateTable
CREATE TABLE "tags" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "name" VARCHAR(50) NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tags_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "transaction_tags" (
    "transaction_id" INTEGER NOT NULL,
    "tag_id" INTEGER NOT NULL,
    "applied_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "transaction_tags_pkey" PRIMARY KEY ("transaction_id","tag_id")
);

-- CreateIndex
CREATE INDEX "idx_tags_user_id" ON "tags"("user_id");

-- CreateIndex
CREATE INDEX "idx_transaction_tags_tag_id" ON "transaction_tags"("tag_id");

-- CreateIndex
CREATE UNIQUE INDEX "uq_tags_user_id_lower_name" ON "tags" ("user_id", lower("name"));

-- AddForeignKey
ALTER TABLE "tags" ADD CONSTRAINT "tags_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "transaction_tags" ADD CONSTRAINT "transaction_tags_transaction_id_fkey" FOREIGN KEY ("transaction_id") REFERENCES "transactions"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "transaction_tags" ADD CONSTRAINT "transaction_tags_tag_id_fkey" FOREIGN KEY ("tag_id") REFERENCES "tags"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
