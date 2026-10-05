-- CreateEnum
CREATE TYPE "StatusAktif" AS ENUM ('AKTIF', 'NONAKTIF');

-- CreateEnum
CREATE TYPE "TipePegawai" AS ENUM ('PNS', 'ASN', 'OUTSOURCING', 'TA');

-- CreateEnum
CREATE TYPE "TipeUnit" AS ENUM ('KOORDINATOR', 'SUB_KOORDINATOR');

-- CreateEnum
CREATE TYPE "SumberDana" AS ENUM ('RO', 'OPERASIONAL');

-- CreateEnum
CREATE TYPE "StatusAlokasi" AS ENUM ('AKTIF', 'DIBATALKAN');

-- CreateEnum
CREATE TYPE "AksiAudit" AS ENUM ('CREATE', 'UPDATE', 'DELETE', 'ACTIVATE', 'CANCEL');

-- CreateTable
CREATE TABLE "role" (
    "id" UUID NOT NULL,
    "kode" VARCHAR(50) NOT NULL,
    "nama" VARCHAR(100) NOT NULL,
    "deskripsi" TEXT,

    CONSTRAINT "role_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user" (
    "id" UUID NOT NULL,
    "nama" VARCHAR(150) NOT NULL,
    "email" VARCHAR(150) NOT NULL,
    "password_hash" VARCHAR(255) NOT NULL,
    "foto" VARCHAR(500),
    "role_id" UUID NOT NULL,
    "unit_kerja_id" UUID,
    "pegawai_id" UUID,
    "status" "StatusAktif" NOT NULL DEFAULT 'AKTIF',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "unit_kerja" (
    "id" UUID NOT NULL,
    "kode_unit" VARCHAR(30) NOT NULL,
    "nama_unit" VARCHAR(150) NOT NULL,
    "tipe_unit" "TipeUnit" NOT NULL,
    "parent_unit_id" UUID,
    "kepala_unit_id" UUID,
    "deskripsi" TEXT,
    "status_aktif" "StatusAktif" NOT NULL DEFAULT 'AKTIF',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "unit_kerja_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pegawai" (
    "id" UUID NOT NULL,
    "nip_nik" VARCHAR(32) NOT NULL,
    "nama" VARCHAR(150) NOT NULL,
    "tipe_pegawai" "TipePegawai" NOT NULL,
    "jabatan" VARCHAR(150),
    "email" VARCHAR(150),
    "telepon" VARCHAR(30),
    "tanggal_mulai" DATE NOT NULL,
    "status_aktif" "StatusAktif" NOT NULL DEFAULT 'AKTIF',
    "bidang_keahlian" VARCHAR(150),
    "kontrak_mulai" DATE,
    "kontrak_selesai" DATE,
    "gaji_bulanan" INTEGER NOT NULL DEFAULT 0,
    "unit_kerja_id" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "pegawai_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sk" (
    "id" UUID NOT NULL,
    "nomor_sk" VARCHAR(100) NOT NULL,
    "tanggal_sk" DATE NOT NULL,
    "tanggal_efektif" DATE NOT NULL,
    "tanggal_selesai" DATE,
    "pegawai_id" UUID NOT NULL,
    "unit_kerja_id" UUID NOT NULL,
    "jabatan" VARCHAR(150),
    "file_sk" VARCHAR(500),
    "status_aktif" "StatusAktif" NOT NULL DEFAULT 'AKTIF',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sk_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "proyek" (
    "id" UUID NOT NULL,
    "kode_proyek" VARCHAR(50) NOT NULL,
    "nama_proyek" VARCHAR(200) NOT NULL,
    "tahun_fiscal" INTEGER NOT NULL,
    "sumber_pendanaan" VARCHAR(150),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "proyek_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ro" (
    "id" UUID NOT NULL,
    "kode_ro" VARCHAR(50) NOT NULL,
    "nama_ro" VARCHAR(200) NOT NULL,
    "proyek_id" UUID NOT NULL,
    "unit_koordinator_id" UUID NOT NULL,
    "tahun_fiscal" INTEGER NOT NULL,
    "total_plafon" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ro_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "dana_operasional" (
    "id" UUID NOT NULL,
    "unit_koordinator_id" UUID NOT NULL,
    "tahun_fiscal" INTEGER NOT NULL,
    "total_plafon" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "dana_operasional_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "alokasi_gaji_ta" (
    "id" UUID NOT NULL,
    "pegawai_id" UUID NOT NULL,
    "periode_bulan" INTEGER NOT NULL,
    "periode_tahun" INTEGER NOT NULL,
    "sumber_dana" "SumberDana" NOT NULL,
    "ro_id" UUID,
    "dana_operasional_id" UUID,
    "jumlah" INTEGER NOT NULL,
    "status" "StatusAlokasi" NOT NULL DEFAULT 'AKTIF',
    "keterangan" VARCHAR(255),
    "dibuat_oleh" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "alokasi_gaji_ta_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_log" (
    "id" UUID NOT NULL,
    "tabel" VARCHAR(50) NOT NULL,
    "record_id" UUID NOT NULL,
    "aksi" "AksiAudit" NOT NULL,
    "dilakukan_oleh" UUID NOT NULL,
    "data_sebelum" JSONB,
    "data_sesudah" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_log_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "role_kode_key" ON "role"("kode");

-- CreateIndex
CREATE UNIQUE INDEX "user_email_key" ON "user"("email");

-- CreateIndex
CREATE UNIQUE INDEX "user_pegawai_id_key" ON "user"("pegawai_id");

-- CreateIndex
CREATE INDEX "user_role_id_idx" ON "user"("role_id");

-- CreateIndex
CREATE UNIQUE INDEX "unit_kerja_kode_unit_key" ON "unit_kerja"("kode_unit");

-- CreateIndex
CREATE INDEX "unit_kerja_parent_unit_id_idx" ON "unit_kerja"("parent_unit_id");

-- CreateIndex
CREATE INDEX "unit_kerja_tipe_unit_idx" ON "unit_kerja"("tipe_unit");

-- CreateIndex
CREATE UNIQUE INDEX "pegawai_nip_nik_key" ON "pegawai"("nip_nik");

-- CreateIndex
CREATE UNIQUE INDEX "pegawai_email_key" ON "pegawai"("email");

-- CreateIndex
CREATE INDEX "pegawai_tipe_pegawai_idx" ON "pegawai"("tipe_pegawai");

-- CreateIndex
CREATE INDEX "pegawai_status_aktif_idx" ON "pegawai"("status_aktif");

-- CreateIndex
CREATE INDEX "pegawai_unit_kerja_id_idx" ON "pegawai"("unit_kerja_id");

-- CreateIndex
CREATE UNIQUE INDEX "sk_nomor_sk_key" ON "sk"("nomor_sk");

-- CreateIndex
CREATE INDEX "sk_pegawai_id_idx" ON "sk"("pegawai_id");

-- CreateIndex
CREATE INDEX "sk_status_aktif_idx" ON "sk"("status_aktif");

-- CreateIndex
CREATE UNIQUE INDEX "proyek_kode_proyek_key" ON "proyek"("kode_proyek");

-- CreateIndex
CREATE INDEX "proyek_tahun_fiscal_idx" ON "proyek"("tahun_fiscal");

-- CreateIndex
CREATE UNIQUE INDEX "ro_kode_ro_key" ON "ro"("kode_ro");

-- CreateIndex
CREATE INDEX "ro_proyek_id_idx" ON "ro"("proyek_id");

-- CreateIndex
CREATE INDEX "ro_unit_koordinator_id_idx" ON "ro"("unit_koordinator_id");

-- CreateIndex
CREATE INDEX "ro_tahun_fiscal_idx" ON "ro"("tahun_fiscal");

-- CreateIndex
CREATE UNIQUE INDEX "dana_operasional_unit_koordinator_id_tahun_fiscal_key" ON "dana_operasional"("unit_koordinator_id", "tahun_fiscal");

-- CreateIndex
CREATE INDEX "alokasi_gaji_ta_pegawai_id_idx" ON "alokasi_gaji_ta"("pegawai_id");

-- CreateIndex
CREATE INDEX "alokasi_gaji_ta_periode_bulan_periode_tahun_idx" ON "alokasi_gaji_ta"("periode_bulan", "periode_tahun");

-- CreateIndex
CREATE INDEX "alokasi_gaji_ta_ro_id_idx" ON "alokasi_gaji_ta"("ro_id");

-- CreateIndex
CREATE INDEX "alokasi_gaji_ta_dana_operasional_id_idx" ON "alokasi_gaji_ta"("dana_operasional_id");

-- CreateIndex
CREATE INDEX "audit_log_tabel_record_id_idx" ON "audit_log"("tabel", "record_id");

-- AddForeignKey
ALTER TABLE "user" ADD CONSTRAINT "user_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "role"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user" ADD CONSTRAINT "user_pegawai_id_fkey" FOREIGN KEY ("pegawai_id") REFERENCES "pegawai"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user" ADD CONSTRAINT "user_unit_kerja_id_fkey" FOREIGN KEY ("unit_kerja_id") REFERENCES "unit_kerja"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "unit_kerja" ADD CONSTRAINT "unit_kerja_parent_unit_id_fkey" FOREIGN KEY ("parent_unit_id") REFERENCES "unit_kerja"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "unit_kerja" ADD CONSTRAINT "unit_kerja_kepala_unit_id_fkey" FOREIGN KEY ("kepala_unit_id") REFERENCES "pegawai"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pegawai" ADD CONSTRAINT "pegawai_unit_kerja_id_fkey" FOREIGN KEY ("unit_kerja_id") REFERENCES "unit_kerja"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sk" ADD CONSTRAINT "sk_pegawai_id_fkey" FOREIGN KEY ("pegawai_id") REFERENCES "pegawai"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sk" ADD CONSTRAINT "sk_unit_kerja_id_fkey" FOREIGN KEY ("unit_kerja_id") REFERENCES "unit_kerja"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ro" ADD CONSTRAINT "ro_proyek_id_fkey" FOREIGN KEY ("proyek_id") REFERENCES "proyek"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ro" ADD CONSTRAINT "ro_unit_koordinator_id_fkey" FOREIGN KEY ("unit_koordinator_id") REFERENCES "unit_kerja"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dana_operasional" ADD CONSTRAINT "dana_operasional_unit_koordinator_id_fkey" FOREIGN KEY ("unit_koordinator_id") REFERENCES "unit_kerja"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "alokasi_gaji_ta" ADD CONSTRAINT "alokasi_gaji_ta_pegawai_id_fkey" FOREIGN KEY ("pegawai_id") REFERENCES "pegawai"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "alokasi_gaji_ta" ADD CONSTRAINT "alokasi_gaji_ta_ro_id_fkey" FOREIGN KEY ("ro_id") REFERENCES "ro"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "alokasi_gaji_ta" ADD CONSTRAINT "alokasi_gaji_ta_dana_operasional_id_fkey" FOREIGN KEY ("dana_operasional_id") REFERENCES "dana_operasional"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "alokasi_gaji_ta" ADD CONSTRAINT "alokasi_gaji_ta_dibuat_oleh_fkey" FOREIGN KEY ("dibuat_oleh") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_log" ADD CONSTRAINT "audit_log_dilakukan_oleh_fkey" FOREIGN KEY ("dilakukan_oleh") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
