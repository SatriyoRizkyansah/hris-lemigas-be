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
   * Saldo RO: total_plafon sudah di-decrement saat alokasi (spec fase 2).
   * sisa = total_plafon (remaining), terpakai = alokasi aktif (1:1 dengan kredit).
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
    const total_terpakai = alokasi_terpakai;

    return {
      id: ro.id,
      kode_ro: ro.kode_ro,
      nama_ro: ro.nama_ro,
      total_plafon: ro.total_plafon,
      total_terpakai,
      sisa_saldo: ro.total_plafon,
      alokasi_terpakai,
      trx_debit,
      trx_kredit,
    };
  }

  /**
   * Saldo dana operasional: total_plafon adalah saldo tersimpan setelah alokasi
   * dan distribusi. Transaksi debit mengurangi saldo; transaksi kredit menambahnya.
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
    // total_plafon menjadi batas dana; alokasi tidak dijumlahkan lagi karena
    // alokasi sudah mengurangi saldo tersimpan pada saat dibuat.
    const total_terpakai = Math.max(0, trx_debit - trx_kredit);
    const sisa_saldo = dana.total_plafon - total_terpakai;

    return {
      id: dana.id,
      unit_koordinator_id: dana.unit_koordinator_id,
      tahun_fiscal: dana.tahun_fiscal,
      total_plafon: dana.total_plafon,
      total_terpakai,
      sisa_saldo,
      alokasi_terpakai,
      trx_debit,
      trx_kredit,
    };
  }

  async getRoLedger(roId: string) {
    const list = await this.prisma.roTransaksi.findMany({
      where: { ro_id: roId },
      orderBy: [{ tanggal: 'asc' }, { created_at: 'asc' }],
    });
    const total_debit = list.reduce(
      (s: number, r: { debit: number }) => s + r.debit,
      0,
    );
    const total_kredit = list.reduce(
      (s: number, r: { kredit: number }) => s + r.kredit,
      0,
    );
    let running = 0;
    const withSaldo = list.map((r: { debit: number; kredit: number }) => {
      running += r.debit - r.kredit;
      return { ...r, saldo: running };
    });
    return {
      list: withSaldo,
      total_debit,
      total_kredit,
      saldo_ledger: total_debit - total_kredit,
    };
  }

  async getDanaLedger(danaId: string) {
    const list = await this.prisma.danaTransaksi.findMany({
      where: { dana_id: danaId },
      include: {
        proyek: { select: { id: true, kode_proyek: true, nama_proyek: true } },
      },
      orderBy: [{ tanggal: 'asc' }, { created_at: 'asc' }],
    });
    const total_debit = list.reduce(
      (s: number, r: { debit: number }) => s + r.debit,
      0,
    );
    const total_kredit = list.reduce(
      (s: number, r: { kredit: number }) => s + r.kredit,
      0,
    );
    let running = 0;
    const withSaldo = list.map((r: { debit: number; kredit: number }) => {
      running += r.debit - r.kredit;
      return { ...r, saldo: running };
    });
    return {
      list: withSaldo,
      total_debit,
      total_kredit,
      saldo_ledger: total_debit - total_kredit,
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

  /**
   * Kas virtual global untuk rekonsiliasi fase 1.
   * RO aktif memakai plafon tersisa. Dana operasional memakai plafon dikurangi
   * mutasi debit neto, karena alokasi sudah mengubah plafon tersimpan.
   */
  async calculateTotalSaldoSistem(tahunFiscal: number, rekeningId?: string) {
    const rekeningFilter = rekeningId ? { rekening_id: rekeningId } : {};
    const [roAgg, danaList] = await Promise.all([
      this.prisma.ro.aggregate({
        _sum: { total_plafon: true },
        where: {
          tahun_fiscal: tahunFiscal,
          status_ro: 'AKTIF',
          ...rekeningFilter,
        },
      }),
      this.prisma.danaOperasional.findMany({
        where: { tahun_fiscal: tahunFiscal, ...rekeningFilter },
        select: {
          id: true,
          total_plafon: true,
          transaksi_list: {
            select: { debit: true, kredit: true },
          },
        },
      }),
    ]);

    const saldo_ro = roAgg._sum.total_plafon ?? 0;
    const saldo_dana_operasional = danaList.reduce((total, dana) => {
      const mutasi_neto = dana.transaksi_list.reduce(
        (sum, transaksi) => sum + transaksi.debit - transaksi.kredit,
        0,
      );
      return total + dana.total_plafon - Math.max(0, mutasi_neto);
    }, 0);

    return {
      tahun_fiscal: tahunFiscal,
      rekening_id: rekeningId ?? null,
      saldo_ro,
      saldo_dana_operasional,
      total_saldo_sistem: saldo_ro + saldo_dana_operasional,
    };
  }
}
