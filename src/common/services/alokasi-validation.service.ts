import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma.module.js';
import { SumberDana } from '../enums/hris.enum.js';
import { UnitScopeService } from './unit-scope.service.js';

export interface AlokasiValidationInput {
  pegawaiId: string;
  periodeBulan: number;
  periodeTahun: number;
  sumberDana: SumberDana;
  roId?: string | null;
  danaOperasionalId?: string | null;
  jumlah: number;
}

/**
 * Validasi bisnis alokasi gaji TA:
 * 1. Pegawai harus tipe TA dan aktif.
 * 2. RO/dana operasional harus berada dalam lingkup koordinator unit pegawai.
 * 3. Total alokasi per TA per periode tidak boleh melebihi gaji bulanan.
 * 4. Dana operasional tahunnya harus cocok dengan periode alokasi.
 */
@Injectable()
export class AlokasiValidationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly unitScope: UnitScopeService,
  ) {}

  async validate(input: AlokasiValidationInput, excludeAlokasiId?: string) {
    const pegawai = await this.prisma.pegawai.findUnique({
      where: { id: input.pegawaiId },
    });
    if (!pegawai) {
      throw new BadRequestException('Pegawai tidak ditemukan');
    }
    if (pegawai.tipe_pegawai !== 'TA') {
      throw new BadRequestException(
        `Pegawai ${pegawai.nama} bukan bertipe TA. Alokasi hanya untuk pegawai TA.`,
      );
    }
    if (pegawai.status_aktif !== 'AKTIF') {
      throw new BadRequestException('Pegawai tidak aktif');
    }
    if (!pegawai.unit_kerja_id) {
      throw new BadRequestException(
        'Pegawai TA belum memiliki unit kerja aktif (SK aktif diperlukan)',
      );
    }

    // Root koordinator dari unit pegawai
    const rootKoordinator = await this.unitScope.resolveRootCoordinator(
      pegawai.unit_kerja_id,
    );
    if (!rootKoordinator) {
      throw new BadRequestException(
        'Unit kerja pegawai tidak terhubung ke unit koordinator',
      );
    }

    if (input.sumberDana === SumberDana.RO) {
      if (!input.roId) {
        throw new BadRequestException(
          'Alokasi dengan sumber dana RO harus menyertakan id RO',
        );
      }
      const ro = await this.prisma.ro.findUnique({
        where: { id: input.roId },
      });
      if (!ro) {
        throw new BadRequestException('RO tidak ditemukan');
      }
      if (ro.unit_koordinator_id !== rootKoordinator) {
        throw new BadRequestException(
          `RO ${ro.kode_ro} berada di lingkungan koordinator lain. ` +
            `Dana RO hanya dapat digunakan untuk TA di bawah koordinator yang sama.`,
        );
      }
    } else {
      if (!input.danaOperasionalId) {
        throw new BadRequestException(
          'Alokasi dengan sumber dana Operasional harus menyertakan id dana operasional',
        );
      }
      const dana = await this.prisma.danaOperasional.findUnique({
        where: { id: input.danaOperasionalId },
      });
      if (!dana) {
        throw new BadRequestException('Dana operasional tidak ditemukan');
      }
      if (dana.unit_koordinator_id !== rootKoordinator) {
        throw new BadRequestException(
          'Dana operasional berada di lingkungan koordinator lain',
        );
      }
      if (dana.tahun_fiscal !== input.periodeTahun) {
        throw new BadRequestException(
          `Tahun dana operasional (${dana.tahun_fiscal}) tidak sama dengan ` +
            `periode alokasi (${input.periodeTahun})`,
        );
      }
    }

    // Cek total alokasi per TA per periode ≤ gaji bulanan
    const where: Record<string, unknown> = {
      pegawai_id: input.pegawaiId,
      periode_bulan: input.periodeBulan,
      periode_tahun: input.periodeTahun,
      status: 'AKTIF',
    };
    if (excludeAlokasiId) where.id = { not: excludeAlokasiId };

    const existing = await this.prisma.alokasiGajiTA.aggregate({
      _sum: { jumlah: true },
      where,
    });
    const totalExisting = existing._sum.jumlah ?? 0;

    if (totalExisting + input.jumlah > pegawai.gaji_bulanan) {
      throw new BadRequestException(
        `Total alokasi bulan ${input.periodeBulan}/${input.periodeTahun} ` +
          `(Rp ${(totalExisting + input.jumlah).toLocaleString('id-ID')}) ` +
          `melebihi gaji bulanan Rp ${pegawai.gaji_bulanan.toLocaleString('id-ID')}. ` +
          `Sisa kuota Rp ${Math.max(0, pegawai.gaji_bulanan - totalExisting).toLocaleString('id-ID')}`,
      );
    }

    return { pegawai, rootKoordinator };
  }
}
