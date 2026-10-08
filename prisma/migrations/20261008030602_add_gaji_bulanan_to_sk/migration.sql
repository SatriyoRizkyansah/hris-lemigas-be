/*
  Warnings:

  - You are about to drop the column `gaji_bulanan` on the `pegawai` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "pegawai" DROP COLUMN "gaji_bulanan";

-- AlterTable
ALTER TABLE "sk" ADD COLUMN     "dana_operasional_id_default" UUID,
ADD COLUMN     "gaji_bulanan" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "ro_id_default" UUID,
ADD COLUMN     "sumber_dana_default" "SumberDana" DEFAULT 'OPERASIONAL';

-- CreateIndex
CREATE INDEX "sk_tanggal_selesai_idx" ON "sk"("tanggal_selesai");

-- AddForeignKey
ALTER TABLE "sk" ADD CONSTRAINT "sk_ro_id_default_fkey" FOREIGN KEY ("ro_id_default") REFERENCES "ro"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sk" ADD CONSTRAINT "sk_dana_operasional_id_default_fkey" FOREIGN KEY ("dana_operasional_id_default") REFERENCES "dana_operasional"("id") ON DELETE SET NULL ON UPDATE CASCADE;
