-- CreateEnum
CREATE TYPE "TaKategori" AS ENUM ('BIASA', 'RO');

-- CreateEnum
CREATE TYPE "StatusRo" AS ENUM ('AKTIF', 'NONAKTIF', 'SELESAI');

-- AlterTable
ALTER TABLE "pegawai" ADD COLUMN     "ta_kategori" "TaKategori" NOT NULL DEFAULT 'BIASA';

-- AlterTable
ALTER TABLE "ro" ADD COLUMN     "berakhir_sk" DATE,
ADD COLUMN     "file_rab" VARCHAR(500),
ADD COLUMN     "mulai_sk" DATE,
ADD COLUMN     "no_kontrak" VARCHAR(100),
ADD COLUMN     "no_sk" VARCHAR(100),
ADD COLUMN     "pj" VARCHAR(150),
ADD COLUMN     "status_ro" "StatusRo" NOT NULL DEFAULT 'AKTIF';

-- CreateTable
CREATE TABLE "ro_transaksi" (
    "id" UUID NOT NULL,
    "ro_id" UUID NOT NULL,
    "nama_kegiatan" VARCHAR(200) NOT NULL,
    "no_kuitansi" VARCHAR(100),
    "tanggal" DATE NOT NULL,
    "debit" INTEGER NOT NULL DEFAULT 0,
    "kredit" INTEGER NOT NULL DEFAULT 0,
    "keterangan" VARCHAR(255),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ro_transaksi_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "dana_transaksi" (
    "id" UUID NOT NULL,
    "dana_id" UUID NOT NULL,
    "nama_kegiatan" VARCHAR(200) NOT NULL,
    "no_kuitansi" VARCHAR(100),
    "tanggal" DATE NOT NULL,
    "debit" INTEGER NOT NULL DEFAULT 0,
    "kredit" INTEGER NOT NULL DEFAULT 0,
    "keterangan" VARCHAR(255),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "dana_transaksi_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ro_transaksi_ro_id_idx" ON "ro_transaksi"("ro_id");

-- CreateIndex
CREATE INDEX "ro_transaksi_tanggal_idx" ON "ro_transaksi"("tanggal");

-- CreateIndex
CREATE INDEX "dana_transaksi_dana_id_idx" ON "dana_transaksi"("dana_id");

-- CreateIndex
CREATE INDEX "dana_transaksi_tanggal_idx" ON "dana_transaksi"("tanggal");

-- AddForeignKey
ALTER TABLE "ro_transaksi" ADD CONSTRAINT "ro_transaksi_ro_id_fkey" FOREIGN KEY ("ro_id") REFERENCES "ro"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dana_transaksi" ADD CONSTRAINT "dana_transaksi_dana_id_fkey" FOREIGN KEY ("dana_id") REFERENCES "dana_operasional"("id") ON DELETE CASCADE ON UPDATE CASCADE;
