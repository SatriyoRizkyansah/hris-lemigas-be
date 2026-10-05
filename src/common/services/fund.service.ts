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
   * Saldo RO = plafon - total alokasi aktif.
   */
  async getRoBalance(roId: string) {
    const ro = await this.prisma.ro.findUnique({ where: { id: roId } });
    if (!ro) throw new NotFoundException('RO tidak ditemukan');

    const terpakai = await this.prisma.alokasiGajiTA.aggregate({
      _sum: { jumlah: true },
      where: { ro_id: roId, status: 'AKTIF' },
    });

    const total_terpakai = terpakai._sum.jumlah ?? 0;

    return {
      id: ro.id,
      kode_ro: ro.kode_ro,
      nama_ro: ro.nama_ro,
      total_plafon: ro.total_plafon,
      total_terpakai,
      sisa_saldo: ro.total_plafon - total_terpakai,
    };
  }

  /**
   * Saldo dana operasional = plafon - total alokasi aktif.
   */
  async getOperationalBalance(danaOperasionalId: string) {
    const dana = await this.prisma.danaOperasional.findUnique({
      where: { id: danaOperasionalId },
    });
    if (!dana) throw new NotFoundException('Dana operasional tidak ditemukan');

    const terpakai = await this.prisma.alokasiGajiTA.aggregate({
      _sum: { jumlah: true },
      where: { dana_operasional_id: danaOperasionalId, status: 'AKTIF' },
    });

    const total_terpakai = terpakai._sum.jumlah ?? 0;

    return {
      id: dana.id,
      unit_koordinator_id: dana.unit_koordinator_id,
      tahun_fiscal: dana.tahun_fiscal,
      total_plafon: dana.total_plafon,
      total_terpakai,
      sisa_saldo: dana.total_plafon - total_terpakai,
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
