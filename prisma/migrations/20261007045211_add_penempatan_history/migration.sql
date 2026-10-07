/*
  Warnings:

  - You are about to drop the column `unit_kerja_id` on the `pegawai` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "pegawai" DROP CONSTRAINT "pegawai_unit_kerja_id_fkey";

-- DropIndex
DROP INDEX "pegawai_unit_kerja_id_idx";

-- AlterTable
ALTER TABLE "pegawai" DROP COLUMN "unit_kerja_id";

-- CreateTable
CREATE TABLE "penempatan_pegawai" (
    "id" UUID NOT NULL,
    "pegawai_id" UUID NOT NULL,
    "unit_kerja_id" UUID NOT NULL,
    "jabatan" VARCHAR(150),
    "tmt" DATE NOT NULL,
    "tanggal_selesai" DATE,
    "no_sk" VARCHAR(100),
    "file_sk" VARCHAR(500),
    "status_aktif" "StatusAktif" NOT NULL DEFAULT 'AKTIF',
    "is_homebase" BOOLEAN NOT NULL DEFAULT true,
    "keterangan" VARCHAR(256),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "penempatan_pegawai_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "penempatan_pegawai_pegawai_id_idx" ON "penempatan_pegawai"("pegawai_id");

-- CreateIndex
CREATE INDEX "penempatan_pegawai_unit_kerja_id_idx" ON "penempatan_pegawai"("unit_kerja_id");

-- CreateIndex
CREATE INDEX "penempatan_pegawai_status_aktif_idx" ON "penempatan_pegawai"("status_aktif");

-- CreateIndex
CREATE INDEX "penempatan_pegawai_is_homebase_idx" ON "penempatan_pegawai"("is_homebase");

-- AddForeignKey
ALTER TABLE "penempatan_pegawai" ADD CONSTRAINT "penempatan_pegawai_pegawai_id_fkey" FOREIGN KEY ("pegawai_id") REFERENCES "pegawai"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "penempatan_pegawai" ADD CONSTRAINT "penempatan_pegawai_unit_kerja_id_fkey" FOREIGN KEY ("unit_kerja_id") REFERENCES "unit_kerja"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
