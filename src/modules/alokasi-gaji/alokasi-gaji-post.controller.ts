import {
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
  @ApiRoles('Buat alokasi gaji TA', [Role.Superadmin, Role.Koordinator])
  @ApiStandartResponseCreate(AlokasiItemDto)
  async create(
    @CurrentUser() user: JwtPayload,
    @Body() body: CreateAlokasiDto,
  ) {
    // Scope koordinator: pegawai harus dalam lingkup unit miliknya
    if (user.role === Role.Koordinator) {
      if (!user.unitKerjaId) {
        throw new ForbiddenException(
          'Akun koordinator belum memiliki unit kerja',
        );
      }
      const penempatan = await this.prisma.penempatanPegawai.findFirst({
        where: {
          pegawai_id: body.id_pegawai,
          is_homebase: true,
          status_aktif: 'AKTIF',
        },
      });
      if (!penempatan) {
        throw new ForbiddenException('Pegawai tidak memiliki penempatan aktif');
      }
      const inScope = await this.unitScope.isUnitInScope(
        penempatan.unit_kerja_id,
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

    // Validasi saldo sumber dana
    await this.fund.assertSufficientBalance({
      sumberDana: body.sumber_dana,
      roId: body.id_ro ?? null,
      danaOperasionalId: body.id_dana_operasional ?? null,
      jumlah: body.jumlah,
    });

    const alokasi = await this.prisma.alokasiGajiTA.create({
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
      include: {
        pegawai: {
          select: {
            id: true,
            nama: true,
            nip_nik: true,
            tipe_pegawai: true,
            gaji_bulanan: true,
            penempatan_list: {
              where: { is_homebase: true, status_aktif: 'AKTIF' },
              select: { unit_kerja: { select: { id: true, nama_unit: true } } },
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
      gaji_bulanan: item.pegawai?.gaji_bulanan ?? null,
      id_unit_kerja: item.pegawai?.penempatan_list?.[0]?.unit_kerja?.id ?? null,
      nama_unit_kerja:
        item.pegawai?.penempatan_list?.[0]?.unit_kerja?.nama_unit ?? null,
      id_ro: item.ro?.id ?? null,
      nama_ro: item.ro ? `${item.ro.kode_ro} - ${item.ro.nama_ro}` : null,
      id_dana_operasional: item.dana_operasional?.id ?? null,
      nama_dibuat_oleh: item.pembuat?.nama ?? null,
      created_at: item.created_at,
      updated_at: item.updated_at,
    };
  }
}
