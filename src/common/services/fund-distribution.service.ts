import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma.module.js';
import { KategoriKamar } from '../enums/hris.enum.js';

/**
 * Service that distributes incoming *Margin* funds into operational wallets (DanaOperasional)
 * based on predefined percentages.
 */
@Injectable()
export class FundDistributionService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Distribute a total margin amount for a given fiscal year.
   *
   * @param tahunFiscal          Fiscal year (e.g., 2026)
   * @param totalMargin          Total margin amount (in smallest currency unit)
   * @param mappingKoordinatorId Mapping from KategoriKamar to the coordinator's UnitKerja ID
   * @param dibuatOlehId         ID of the user who initiates the distribution (for audit)
   */
  async distributeMargin(
    tahunFiscal: number,
    totalMargin: number,
    mappingKoordinatorId: Record<KategoriKamar, string>,
    dibuatOlehId: string,
  ): Promise<void> {
    if (totalMargin <= 0) {
      throw new BadRequestException('Total margin harus lebih besar dari 0');
    }

    // ---- 1. Calculate portions (rounded) ---------------------------------
    const percentages: Record<KategoriKamar, number> = {
      P1_PNS_NON_PNS: 48,
      P2_KP3: 30,
      OPS_KANTOR: 17,
      OPS_KP3: 2.5,
      MULOS_SPI: 2.5,
      LAINNYA: 0,
    };

    const portions: Record<KategoriKamar, number> = {} as any;
    let allocated = 0;
    (Object.keys(percentages) as KategoriKamar[]).forEach((cat) => {
      if (cat === 'LAINNYA') return;
      const raw = (totalMargin * percentages[cat]) / 100;
      const rounded = Math.round(raw);
      portions[cat] = rounded;
      allocated += rounded;
    });

    // Adjust rounding discrepancy
    const diff = totalMargin - allocated;
    if (diff !== 0) {
      const biggestCat = (
        Object.entries(percentages) as [KategoriKamar, number][]
      )
        .filter(([c]) => c !== 'LAINNYA')
        .sort((a, b) => b[1] - a[1])[0][0];
      portions[biggestCat] = (portions[biggestCat] ?? 0) + diff;
    }

    // ---- 2. Transaction -------------------------------------------------
    await this.prisma.$transaction(async (tx) => {
      for (const kategori of [
        'P1_PNS_NON_PNS',
        'P2_KP3',
        'OPS_KANTOR',
        'OPS_KP3',
        'MULOS_SPI',
      ] as KategoriKamar[]) {
        const amount = portions[kategori];
        if (amount <= 0) continue;

        const unitKoordinatorId = mappingKoordinatorId[kategori];
        if (!unitKoordinatorId) {
          throw new BadRequestException(
            `Mapping koordinator tidak disediakan untuk kategori ${kategori}`,
          );
        }

        // Upsert DanaOperasional (fallback without composite unique input)
        let wallet = await tx.danaOperasional.findFirst({
          where: {
            unit_koordinator_id: unitKoordinatorId,
            tahun_fiscal: tahunFiscal,
            kategori_kamar: kategori,
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
              unit_koordinator_id: unitKoordinatorId,
              tahun_fiscal: tahunFiscal,
              kategori_kamar: kategori,
              total_plafon: amount,
            },
          });
        }

        // Insert DanaTransaksi (debit)
        await tx.danaTransaksi.create({
          data: {
            dana_id: wallet.id,
            nama_kegiatan: 'Distribusi Margin Otomatis',
            debit: amount,
            kredit: 0,
            tanggal: new Date(),
            keterangan: `Margin ${totalMargin} dibagi ${kategori} (${percentages[kategori]}%)`,
          },
        });
      }

      // Optional audit log for the whole distribution
      await tx.auditLog.create({
        data: {
          tabel: 'dana_operasional',
          record_id: `FY${tahunFiscal}`,
          aksi: 'CREATE',
          dilakukan_oleh: dibuatOlehId,
          data_sebelum: undefined,
          data_sesudah: {
            totalMargin,
            tahunFiscal,
            portions,
            mappingKoordinatorId,
          },
        },
      });
    });
  }
}
