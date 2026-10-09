import {
  BadRequestException,
  Body,
  ForbiddenException,
  Controller,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { PrismaService } from '../../prisma.module.js';
import { ApiStandartResponseCreate } from '../../other/scheme_standar.js';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard.js';
import { RolesGuard } from '../../common/guards/roles.guard.js';
import { ApiRoles } from '../../common/decorators/api-roles.decorator.js';
import { CurrentUser } from '../../auth/user.decorator.js';
import type { JwtPayload } from '../../auth/user.decorator.js';
import { Role } from '../../common/enums/role.enum.js';
import { AuditService } from '../../common/services/audit.service.js';
import { FundService } from '../../common/services/fund.service.js';
import { AlokasiValidationService } from '../../common/services/alokasi-validation.service.js';
import { UnitScopeService } from '../../common/services/unit-scope.service.js';
import { AksiAudit } from '../../common/enums/hris.enum.js';
import { created } from '../../common/utils/response.util.js';
import { CreateAlokasiDto, AlokasiItemDto } from './alokasi-gaji.dto.js';

@ApiTags('Alokasi Gaji TA')
@Controller('/api/alokasi-gaji')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AlokasiPostController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly fund: FundService,
    private readonly validation: AlokasiValidationService,
    private readonly unitScope: UnitScopeService,
  ) {}

  @Post()
  @ApiRoles('Buat alokasi gaji TA', [
    Role.Superadmin,
    Role.Koordinator,
    Role.Keuangan,
  ])
  @ApiStandartResponseCreate(AlokasiItemDto)
  async create(
    @CurrentUser() user: JwtPayload,
    @Body() body: CreateAlokasiDto,
  ) {
    // Scope koordinator/keuangan: pegawai harus dalam lingkup unit miliknya
    if (user.role === Role.Koordinator || user.role === Role.Keuangan) {
      if (!user.unitKerjaId) {
        throw new ForbiddenException(
          'Akun koordinator/keuangan belum memiliki unit kerja',
        );
      }
      const skHomebase = await this.prisma.sk.findFirst({
        where: {
          pegawai_id: body.id_pegawai,
          is_homebase: true,
          status_aktif: 'AKTIF',
        },
      });
      if (!skHomebase) {
        throw new ForbiddenException(
          'Pegawai tidak memiliki SK homebase aktif',
        );
      }
      const inScope = await this.unitScope.isUnitInScope(
        skHomebase.unit_kerja_id,
        user.unitKerjaId,
      );
      if (!inScope) {
        throw new ForbiddenException(
          'Anda hanya dapat mengalokasikan gaji untuk TA di lingkungan unit Anda',
        );
      }
    }

    // Validasi bisnis (tipe TA, kepemilikan RO/dana, total ≤ gaji)
    await this.validation.validate({
      pegawaiId: body.id_pegawai,
      periodeBulan: body.periode_bulan,
      periodeTahun: body.periode_tahun,
      sumberDana: body.sumber_dana,
      roId: body.id_ro ?? null,
      danaOperasionalId: body.id_dana_operasional ?? null,
      jumlah: body.jumlah,
    });

    // Atomic create + ledger debit via $transaction
    const alokasi = await this.prisma.$transaction(async (tx) => {
      // Re-validate balance inside transaction: spec total_plafon >= jumlah
      if (body.sumber_dana === 'RO') {
        if (!body.id_ro)
          throw new BadRequestException('RO wajib diisi untuk sumber RO');
        const ro = await tx.ro.findUnique({ where: { id: body.id_ro } });
        if (!ro) throw new BadRequestException('RO tidak ditemukan');
        if (body.jumlah > ro.total_plafon) {
          throw new BadRequestException(
            `Saldo RO ${ro.kode_ro} tidak mencukupi. Sisa Rp ${ro.total_plafon.toLocaleString('id-ID')}, alokasi Rp ${body.jumlah.toLocaleString('id-ID')}`,
          );
        }
      } else {
        if (!body.id_dana_operasional)
          throw new BadRequestException('Dana operasional wajib diisi');
        const dana = await tx.danaOperasional.findUnique({
          where: { id: body.id_dana_operasional },
        });
        if (!dana)
          throw new BadRequestException('Dana operasional tidak ditemukan');
        if (body.jumlah > dana.total_plafon) {
          throw new BadRequestException(
            `Saldo dana operasional tidak mencukupi. Sisa Rp ${dana.total_plafon.toLocaleString('id-ID')}, alokasi Rp ${body.jumlah.toLocaleString('id-ID')}`,
          );
        }
      }

      const created = await tx.alokasiGajiTA.create({
        data: {
          pegawai_id: body.id_pegawai,
          periode_bulan: body.periode_bulan,
          periode_tahun: body.periode_tahun,
          sumber_dana: body.sumber_dana,
          ro_id: body.id_ro ?? null,
          dana_operasional_id: body.id_dana_operasional ?? null,
          jumlah: body.jumlah,
          keterangan: body.keterangan ?? null,
          dibuat_oleh: user.sub,
        },
      });

      const pegawaiForLedger = await tx.pegawai.findUnique({
        where: { id: body.id_pegawai },
        select: { nama: true },
      });
      const namaKegiatan = `Alokasi gaji TA ${pegawaiForLedger?.nama ?? body.id_pegawai} periode ${body.periode_bulan}/${body.periode_tahun}`;

      if (body.sumber_dana === 'RO' && body.id_ro) {
        await tx.ro.update({
          where: { id: body.id_ro },
          data: { total_plafon: { decrement: body.jumlah } },
        });
        await tx.roTransaksi.create({
          data: {
            ro_id: body.id_ro,
            nama_kegiatan: `Pembayaran Gaji TA - ${pegawaiForLedger?.nama ?? body.id_pegawai}`,
            tanggal: new Date(),
            debit: 0,
            kredit: body.jumlah,
            keterangan: body.keterangan ?? `Alokasi ${created.id}`,
          },
        });
      } else if (
        body.sumber_dana === 'OPERASIONAL' &&
        body.id_dana_operasional
      ) {
        await tx.danaOperasional.update({
          where: { id: body.id_dana_operasional },
          data: { total_plafon: { decrement: body.jumlah } },
        });
        await tx.danaTransaksi.create({
          data: {
            dana_id: body.id_dana_operasional,
            nama_kegiatan: `Pembayaran Gaji TA - ${pegawaiForLedger?.nama ?? body.id_pegawai}`,
            tanggal: new Date(),
            debit: 0,
            kredit: body.jumlah,
            keterangan: body.keterangan ?? `Alokasi ${created.id}`,
          },
        });
      }

      return tx.alokasiGajiTA.findUnique({
        where: { id: created.id },
        include: {
          pegawai: {
            select: {
              id: true,
              nama: true,
              nip_nik: true,
              tipe_pegawai: true,
              sk_list: {
                where: { is_homebase: true, status_aktif: 'AKTIF' },
                select: {
                  gaji_bulanan: true,
                  unit_kerja: { select: { id: true, nama_unit: true } },
                },
                orderBy: { tanggal_efektif: 'desc' },
                take: 1,
              },
            },
          },
          ro: { select: { id: true, kode_ro: true, nama_ro: true } },
          dana_operasional: {
            select: { id: true, tahun_fiscal: true, unit_koordinator_id: true },
          },
          pembuat: { select: { nama: true } },
        },
      });
    });

    if (!alokasi) throw new BadRequestException('Gagal membuat alokasi');

    await this.audit.log({
      tabel: 'alokasi_gaji_ta',
      recordId: alokasi.id,
      aksi: AksiAudit.CREATE,
      dilakukanOleh: user.sub,
      dataSesudah: alokasi,
    });

    return created('Berhasil membuat alokasi gaji TA', this.mapItem(alokasi));
  }

  private mapItem(item: any): AlokasiItemDto {
    return {
      id: item.id,
      periode_bulan: item.periode_bulan,
      periode_tahun: item.periode_tahun,
      sumber_dana: item.sumber_dana,
      jumlah: item.jumlah,
      status: item.status,
      keterangan: item.keterangan ?? null,
      id_pegawai: item.pegawai?.id ?? null,
      nama_pegawai: item.pegawai?.nama ?? null,
      nip_nik: item.pegawai?.nip_nik ?? null,
      tipe_pegawai: item.pegawai?.tipe_pegawai ?? null,
      gaji_bulanan: item.pegawai?.sk_list?.[0]?.gaji_bulanan ?? null,
      id_unit_kerja: item.pegawai?.sk_list?.[0]?.unit_kerja?.id ?? null,
      nama_unit_kerja:
        item.pegawai?.sk_list?.[0]?.unit_kerja?.nama_unit ?? null,
      id_ro: item.ro?.id ?? null,
      nama_ro: item.ro ? `${item.ro.kode_ro} - ${item.ro.nama_ro}` : null,
      id_dana_operasional: item.dana_operasional?.id ?? null,
      nama_dibuat_oleh: item.pembuat?.nama ?? null,
      created_at: item.created_at,
      updated_at: item.updated_at,
    };
  }
}
