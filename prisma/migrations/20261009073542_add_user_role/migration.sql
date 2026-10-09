/*
  Warnings:

  - A unique constraint covering the columns `[unit_koordinator_id,tahun_fiscal,kategori_kamar]` on the table `dana_operasional` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateEnum
CREATE TYPE "KategoriKamar" AS ENUM ('P1_PNS_NON_PNS', 'P2_KP3', 'OPS_KANTOR', 'OPS_KP3', 'MULOS_SPI', 'LAINNYA');

-- DropIndex
DROP INDEX "dana_operasional_unit_koordinator_id_tahun_fiscal_key";

-- AlterTable
ALTER TABLE "dana_operasional" ADD COLUMN     "kategori_kamar" "KategoriKamar" NOT NULL DEFAULT 'LAINNYA';

-- AlterTable
ALTER TABLE "user" ADD COLUMN     "created_by" UUID;

-- CreateTable
CREATE TABLE "user_role" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "role_id" UUID NOT NULL,
    "is_default" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_role_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "user_role_user_id_idx" ON "user_role"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "user_role_user_id_role_id_key" ON "user_role"("user_id", "role_id");

-- CreateIndex
CREATE UNIQUE INDEX "dana_operasional_unit_koordinator_id_tahun_fiscal_kategori__key" ON "dana_operasional"("unit_koordinator_id", "tahun_fiscal", "kategori_kamar");

-- AddForeignKey
ALTER TABLE "user_role" ADD CONSTRAINT "user_role_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_role" ADD CONSTRAINT "user_role_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "role"("id") ON DELETE CASCADE ON UPDATE CASCADE;
