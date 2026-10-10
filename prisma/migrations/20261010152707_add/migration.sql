/*
  Warnings:

  - You are about to drop the column `rekening_id` on the `proyek` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "proyek" DROP CONSTRAINT "proyek_rekening_id_fkey";

-- DropIndex
DROP INDEX "proyek_rekening_id_idx";

-- AlterTable
ALTER TABLE "pengaturan_margin" ADD COLUMN     "rekening_id" UUID;

-- AlterTable
ALTER TABLE "proyek" DROP COLUMN "rekening_id";

-- CreateIndex
CREATE INDEX "pengaturan_margin_rekening_id_idx" ON "pengaturan_margin"("rekening_id");

-- AddForeignKey
ALTER TABLE "pengaturan_margin" ADD CONSTRAINT "pengaturan_margin_rekening_id_fkey" FOREIGN KEY ("rekening_id") REFERENCES "master_rekening"("id") ON DELETE SET NULL ON UPDATE CASCADE;
