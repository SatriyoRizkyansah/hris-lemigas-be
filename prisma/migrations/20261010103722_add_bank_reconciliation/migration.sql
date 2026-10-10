-- CreateEnum
CREATE TYPE "StatusRekonsiliasi" AS ENUM ('MATCHED', 'UNMATCHED');

-- AlterTable
ALTER TABLE "dana_operasional" ADD COLUMN     "rekening_id" UUID;

-- AlterTable
ALTER TABLE "ro" ADD COLUMN     "rekening_id" UUID;

-- CreateTable
CREATE TABLE "master_rekening" (
    "id" UUID NOT NULL,
    "nama_bank" VARCHAR(100) NOT NULL,
    "nomor_rekening" VARCHAR(100) NOT NULL,
    "nama_rekening" VARCHAR(200) NOT NULL,
    "status_aktif" "StatusAktif" NOT NULL DEFAULT 'AKTIF',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "master_rekening_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rekonsiliasi_bank" (
    "id" UUID NOT NULL,
    "rekening_id" UUID NOT NULL,
    "tanggal_rekonsiliasi" DATE NOT NULL,
    "tahun_fiscal" INTEGER NOT NULL,
    "saldo_sistem" INTEGER NOT NULL,
    "saldo_bank" INTEGER NOT NULL,
    "selisih" INTEGER NOT NULL,
    "status" "StatusRekonsiliasi" NOT NULL,
    "keterangan" VARCHAR(500),
    "diperiksa_oleh" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "rekonsiliasi_bank_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "master_rekening_nomor_rekening_key" ON "master_rekening"("nomor_rekening");

-- CreateIndex
CREATE INDEX "master_rekening_status_aktif_idx" ON "master_rekening"("status_aktif");

-- CreateIndex
CREATE INDEX "rekonsiliasi_bank_tahun_fiscal_idx" ON "rekonsiliasi_bank"("tahun_fiscal");

-- CreateIndex
CREATE INDEX "rekonsiliasi_bank_tanggal_rekonsiliasi_idx" ON "rekonsiliasi_bank"("tanggal_rekonsiliasi");

-- CreateIndex
CREATE INDEX "rekonsiliasi_bank_diperiksa_oleh_idx" ON "rekonsiliasi_bank"("diperiksa_oleh");

-- CreateIndex
CREATE UNIQUE INDEX "rekonsiliasi_bank_rekening_id_tanggal_rekonsiliasi_key" ON "rekonsiliasi_bank"("rekening_id", "tanggal_rekonsiliasi");

-- AddForeignKey
ALTER TABLE "rekonsiliasi_bank" ADD CONSTRAINT "rekonsiliasi_bank_rekening_id_fkey" FOREIGN KEY ("rekening_id") REFERENCES "master_rekening"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rekonsiliasi_bank" ADD CONSTRAINT "rekonsiliasi_bank_diperiksa_oleh_fkey" FOREIGN KEY ("diperiksa_oleh") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ro" ADD CONSTRAINT "ro_rekening_id_fkey" FOREIGN KEY ("rekening_id") REFERENCES "master_rekening"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dana_operasional" ADD CONSTRAINT "dana_operasional_rekening_id_fkey" FOREIGN KEY ("rekening_id") REFERENCES "master_rekening"("id") ON DELETE SET NULL ON UPDATE CASCADE;
