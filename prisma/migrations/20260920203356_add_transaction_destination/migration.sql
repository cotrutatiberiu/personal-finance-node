-- AlterTable
ALTER TABLE "transactions" ADD COLUMN     "destination_account_id" INTEGER;

-- CreateIndex
CREATE INDEX "idx_tx_destination_account" ON "transactions"("destination_account_id");

-- AddForeignKey
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_destination_account_id_fkey" FOREIGN KEY ("destination_account_id") REFERENCES "accounts"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;
