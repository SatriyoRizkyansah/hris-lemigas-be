import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma.module.js';
import type { Prisma } from '@prisma/client';

@Injectable()
export class FundDistributionService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Dynamic margin distribution based on PengaturanMargin table.
   * Each config defines kategori_kamar, persentase, and target unit_kerja_id.
   * Creates/updates DanaOperasional wallets and inserts DanaTransaksi linked to proyek.
   */
  async distributeMargin(
    proyekId: string,
    tahunFiscal: number,
    totalMargin: number,
    dibuatOlehId: string,
    prismaTx?: Prisma.TransactionClient,
  ): Promise<void> {
    if (totalMargin <= 0) {
      throw new BadRequestException('Total margin harus lebih besar dari 0');
    }

    const run = async (tx: Prisma.TransactionClient) => {
      const proyek = await tx.proyek.findUnique({ where: { id: proyekId } });
      if (!proyek) throw new BadRequestException('Proyek tidak ditemukan');

      const configs = await tx.pengaturanMargin.findMany({
        orderBy: { kategori_kamar: 'asc' },
      });
      if (configs.length === 0) {
        throw new BadRequestException('Pengaturan margin belum dikonfigurasi');
      }
      const totalPct = configs.reduce((s, c) => s + c.persentase, 0);
      if (Math.abs(totalPct - 100) > 0.01) {
        throw new BadRequestException(
          `Total persentase pengaturan margin harus 100% (saat ini ${totalPct}%)`,
        );
      }
      const configsWithoutAccount = configs.filter(
        (config) => !config.rekening_id,
      );
      if (configsWithoutAccount.length > 0) {
        throw new BadRequestException(
          `Master rekening belum dipilih untuk kategori: ${configsWithoutAccount.map((config) => config.nama_kamar).join(', ')}`,
        );
      }
      const activeAccounts = await tx.masterRekening.findMany({
        where: {
          id: { in: configs.map((config) => config.rekening_id as string) },
          status_aktif: 'AKTIF',
        },
        select: { id: true },
      });
      if (
        activeAccounts.length !==
        new Set(configs.map((config) => config.rekening_id)).size
      ) {
        throw new BadRequestException(
          'Satu atau lebih Master Rekening margin tidak aktif atau tidak ditemukan',
        );
      }

      // Calculate portions rounded, adjust diff to biggest percentage
      const portions = new Map<string, number>();
      let allocated = 0;
      for (const cfg of configs) {
        const raw = (cfg.persentase / 100) * totalMargin;
        const rounded = Math.round(raw);
        portions.set(cfg.kategori_kamar, rounded);
        allocated += rounded;
      }
      const diff = totalMargin - allocated;
      if (diff !== 0) {
        const biggest = [...configs].sort(
          (a, b) => b.persentase - a.persentase,
        )[0];
        portions.set(
          biggest.kategori_kamar,
          (portions.get(biggest.kategori_kamar) ?? 0) + diff,
        );
      }

      for (const cfg of configs) {
        const amount = portions.get(cfg.kategori_kamar) ?? 0;
        if (amount <= 0) continue;

        let wallet = await tx.danaOperasional.findFirst({
          where: {
            unit_koordinator_id: cfg.unit_kerja_id,
            tahun_fiscal: tahunFiscal,
            kategori_kamar: cfg.kategori_kamar as any,
          },
        });
        if (wallet) {
          if (wallet.rekening_id && wallet.rekening_id !== cfg.rekening_id) {
            throw new BadRequestException(
              `Wallet ${cfg.nama_kamar} sudah terhubung ke rekening lain. Samakan rekening wallet dan pengaturan margin sebelum distribusi.`,
            );
          }
          wallet = await tx.danaOperasional.update({
            where: { id: wallet.id },
            data: {
              rekening_id: cfg.rekening_id,
              total_plafon: { increment: amount },
            },
          });
        } else {
          wallet = await tx.danaOperasional.create({
            data: {
              unit_koordinator_id: cfg.unit_kerja_id,
              rekening_id: cfg.rekening_id,
              tahun_fiscal: tahunFiscal,
              kategori_kamar: cfg.kategori_kamar as any,
              total_plafon: amount,
            },
          });
        }

        await tx.danaTransaksi.create({
          data: {
            dana_id: wallet.id,
            proyek_id: proyekId,
            nama_kegiatan: `Injeksi Margin dari Proyek ${proyek.kode_proyek}`,
            debit: amount,
            kredit: 0,
            tanggal: new Date(),
            keterangan: `Margin ${totalMargin} dibagi ${cfg.kategori_kamar} (${cfg.persentase}%)`,
          },
        });
      }

      await tx.auditLog.create({
        data: {
          tabel: 'dana_operasional',
          record_id: proyekId,
          aksi: 'CREATE',
          dilakukan_oleh: dibuatOlehId,
          data_sesudah: {
            proyekId,
            kode_proyek: proyek.kode_proyek,
            tahunFiscal,
            totalMargin,
            portions: Object.fromEntries(portions),
          } as any,
        },
      });
    };

    if (prismaTx) {
      await run(prismaTx as unknown as Prisma.TransactionClient);
    } else {
      await this.prisma.$transaction(async (tx) => {
        await run(tx as unknown as Prisma.TransactionClient);
      });
    }
  }

  /** Legacy overload: distribute by tahunFiscal + totalMargin + mapping (kept for backward compat, delegates to dynamic) */
  async distributeMarginLegacy(
    tahunFiscal: number,
    totalMargin: number,
    mappingKoordinatorId: Record<string, string>,
    dibuatOlehId: string,
  ): Promise<void> {
    // Fallback: if PengaturanMargin exists, use dynamic; otherwise use mapping
    const configs = await this.prisma.pengaturanMargin.findMany();
    if (configs.length > 0) {
      throw new BadRequestException(
        'Gunakan distributeMargin(proyekId, tahunFiscal, totalMargin, dibuatOlehId) — mapping legacy tidak didukung saat PengaturanMargin aktif',
      );
    }
    // legacy path (should not happen after migration)
    const percentages: Record<string, number> = {
      P1_PNS_NON_PNS: 48,
      P2_KP3: 30,
      OPS_KANTOR: 17,
      OPS_KP3: 2.5,
      MULOS_SPI: 2.5,
    };
    await this.prisma.$transaction(async (tx) => {
      for (const [kategori, pct] of Object.entries(percentages)) {
        const amount = Math.round((totalMargin * pct) / 100);
        const unitId = mappingKoordinatorId[kategori];
        if (!unitId) continue;
        let wallet = await tx.danaOperasional.findFirst({
          where: {
            unit_koordinator_id: unitId,
            tahun_fiscal: tahunFiscal,
            kategori_kamar: kategori as any,
          },
        });
        if (wallet) {
          wallet = await tx.danaOperasional.update({
            where: { id: wallet.id },
            data: { total_plafon: { increment: amount } },
          });
        } else {
          wallet = await tx.danaOperasional.create({
            data: {
              unit_koordinator_id: unitId,
              tahun_fiscal: tahunFiscal,
              kategori_kamar: kategori as any,
              total_plafon: amount,
            },
          });
        }
        await tx.danaTransaksi.create({
          data: {
            dana_id: wallet.id,
            nama_kegiatan: 'Distribusi Margin Otomatis',
            debit: amount,
            kredit: 0,
            tanggal: new Date(),
            keterangan: `Margin ${totalMargin} dibagi ${kategori} (${pct}%)`,
          },
        });
      }
    });
  }
}
