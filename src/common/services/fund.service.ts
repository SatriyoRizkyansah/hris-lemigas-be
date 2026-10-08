import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma.module.js';
import { SumberDana } from '../enums/hris.enum.js';

@Injectable()
export class FundService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Saldo RO = plafon - (alokasi aktif + net debit transaksi).
   * debit = pengeluaran, kredit = pemasukan/pengembalian.
   */
  async getRoBalance(roId: string) {
    const ro = await this.prisma.ro.findUnique({ where: { id: roId } });
    if (!ro) throw new NotFoundException('RO tidak ditemukan');

    const [terpakai, trxAgg] = await Promise.all([
      this.prisma.alokasiGajiTA.aggregate({
        _sum: { jumlah: true },
        where: { ro_id: roId, status: 'AKTIF' },
      }),
      this.prisma.roTransaksi.aggregate({
        _sum: { debit: true, kredit: true },
        where: { ro_id: roId },
      }),
    ]);

    const alokasi_terpakai = terpakai._sum.jumlah ?? 0;
    const trx_debit = trxAgg._sum.debit ?? 0;
    const trx_kredit = trxAgg._sum.kredit ?? 0;
    const total_terpakai = alokasi_terpakai + trx_debit - trx_kredit;

    return {
      id: ro.id,
      kode_ro: ro.kode_ro,
      nama_ro: ro.nama_ro,
      total_plafon: ro.total_plafon,
      total_terpakai,
      sisa_saldo: ro.total_plafon - total_terpakai,
      alokasi_terpakai,
      trx_debit,
      trx_kredit,
    };
  }

  /**
   * Saldo dana operasional = plafon - (alokasi aktif + net debit transaksi).
   */
  async getOperationalBalance(danaOperasionalId: string) {
    const dana = await this.prisma.danaOperasional.findUnique({
      where: { id: danaOperasionalId },
    });
    if (!dana) throw new NotFoundException('Dana operasional tidak ditemukan');

    const [terpakai, trxAgg] = await Promise.all([
      this.prisma.alokasiGajiTA.aggregate({
        _sum: { jumlah: true },
        where: { dana_operasional_id: danaOperasionalId, status: 'AKTIF' },
      }),
      this.prisma.danaTransaksi.aggregate({
        _sum: { debit: true, kredit: true },
        where: { dana_id: danaOperasionalId },
      }),
    ]);

    const alokasi_terpakai = terpakai._sum.jumlah ?? 0;
    const trx_debit = trxAgg._sum.debit ?? 0;
    const trx_kredit = trxAgg._sum.kredit ?? 0;
    const total_terpakai = alokasi_terpakai + trx_debit - trx_kredit;

    return {
      id: dana.id,
      unit_koordinator_id: dana.unit_koordinator_id,
      tahun_fiscal: dana.tahun_fiscal,
      total_plafon: dana.total_plafon,
      total_terpakai,
      sisa_saldo: dana.total_plafon - total_terpakai,
      alokasi_terpakai,
      trx_debit,
      trx_kredit,
    };
  }

  async getRoLedger(roId: string) {
    const list = await this.prisma.roTransaksi.findMany({
      where: { ro_id: roId },
      orderBy: { tanggal: 'asc' },
    });
    const total_debit = list.reduce((s, r) => s + r.debit, 0);
    const total_kredit = list.reduce((s, r) => s + r.kredit, 0);
    let running = 0;
    const withSaldo = list.map((r) => {
      running += r.kredit - r.debit;
      return { ...r, saldo: running };
    });
    return {
      list: withSaldo,
      total_debit,
      total_kredit,
      saldo_ledger: total_kredit - total_debit,
    };
  }

  async getDanaLedger(danaId: string) {
    const list = await this.prisma.danaTransaksi.findMany({
      where: { dana_id: danaId },
      orderBy: { tanggal: 'asc' },
    });
    const total_debit = list.reduce((s, r) => s + r.debit, 0);
    const total_kredit = list.reduce((s, r) => s + r.kredit, 0);
    let running = 0;
    const withSaldo = list.map((r) => {
      running += r.kredit - r.debit;
      return { ...r, saldo: running };
    });
    return {
      list: withSaldo,
      total_debit,
      total_kredit,
      saldo_ledger: total_kredit - total_debit,
    };
  }

  /**
   * Validasi alokasi terhadap sisa saldo sumber dana.
   */
  async assertSufficientBalance(params: {
    sumberDana: SumberDana;
    roId?: string | null;
    danaOperasionalId?: string | null;
    jumlah: number;
  }): Promise<void> {
    if (params.sumberDana === SumberDana.RO) {
      if (!params.roId) {
        throw new BadRequestException(
          'Alokasi dengan sumber dana RO harus menyertakan RO',
        );
      }
      const balance = await this.getRoBalance(params.roId);
      if (params.jumlah > balance.sisa_saldo) {
        throw new BadRequestException(
          `Saldo RO ${balance.kode_ro} tidak mencukupi. ` +
            `Sisa saldo Rp ${balance.sisa_saldo.toLocaleString('id-ID')}, ` +
            `alokasi Rp ${params.jumlah.toLocaleString('id-ID')}`,
        );
      }
    } else {
      if (!params.danaOperasionalId) {
        throw new BadRequestException(
          'Alokasi dengan sumber dana Operasional harus menyertakan dana operasional',
        );
      }
      const balance = await this.getOperationalBalance(
        params.danaOperasionalId,
      );
      if (params.jumlah > balance.sisa_saldo) {
        throw new BadRequestException(
          `Saldo dana operasional tidak mencukupi. ` +
            `Sisa saldo Rp ${balance.sisa_saldo.toLocaleString('id-ID')}, ` +
            `alokasi Rp ${params.jumlah.toLocaleString('id-ID')}`,
        );
      }
    }
  }
}
