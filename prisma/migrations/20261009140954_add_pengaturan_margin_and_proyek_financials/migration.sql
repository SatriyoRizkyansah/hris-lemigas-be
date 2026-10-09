-- AlterTable
ALTER TABLE "dana_transaksi" ADD COLUMN     "proyek_id" UUID;

-- AlterTable
ALTER TABLE "proyek" ADD COLUMN     "nilai_kontrak" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "total_direct_cost" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "total_margin" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "pengaturan_margin" (
    "id" UUID NOT NULL,
    "kategori_kamar" "KategoriKamar" NOT NULL,
    "nama_kamar" VARCHAR(150) NOT NULL,
    "persentase" DOUBLE PRECISION NOT NULL,
    "unit_kerja_id" UUID NOT NULL,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "pengaturan_margin_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "pengaturan_margin_kategori_kamar_key" ON "pengaturan_margin"("kategori_kamar");

-- CreateIndex
CREATE INDEX "pengaturan_margin_unit_kerja_id_idx" ON "pengaturan_margin"("unit_kerja_id");

-- CreateIndex
CREATE INDEX "dana_transaksi_proyek_id_idx" ON "dana_transaksi"("proyek_id");

-- AddForeignKey
ALTER TABLE "pengaturan_margin" ADD CONSTRAINT "pengaturan_margin_unit_kerja_id_fkey" FOREIGN KEY ("unit_kerja_id") REFERENCES "unit_kerja"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dana_transaksi" ADD CONSTRAINT "dana_transaksi_proyek_id_fkey" FOREIGN KEY ("proyek_id") REFERENCES "proyek"("id") ON DELETE SET NULL ON UPDATE CASCADE;
