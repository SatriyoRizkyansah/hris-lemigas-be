/*
  Warnings:

  - You are about to drop the `penempatan_pegawai` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "penempatan_pegawai" DROP CONSTRAINT "penempatan_pegawai_pegawai_id_fkey";

-- DropForeignKey
ALTER TABLE "penempatan_pegawai" DROP CONSTRAINT "penempatan_pegawai_unit_kerja_id_fkey";

-- AlterTable
ALTER TABLE "sk" ADD COLUMN     "is_homebase" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "keterangan" VARCHAR(255);

-- DropTable
DROP TABLE "penempatan_pegawai";

-- CreateIndex
CREATE INDEX "sk_is_homebase_idx" ON "sk"("is_homebase");
