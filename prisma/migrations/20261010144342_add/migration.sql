-- AlterTable
ALTER TABLE "proyek" ADD COLUMN     "rekening_id" UUID;

-- CreateIndex
CREATE INDEX "proyek_rekening_id_idx" ON "proyek"("rekening_id");

-- AddForeignKey
ALTER TABLE "proyek" ADD CONSTRAINT "proyek_rekening_id_fkey" FOREIGN KEY ("rekening_id") REFERENCES "master_rekening"("id") ON DELETE SET NULL ON UPDATE CASCADE;
