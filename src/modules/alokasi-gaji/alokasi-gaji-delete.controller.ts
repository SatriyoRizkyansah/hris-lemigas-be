import {
  BadRequestException,
  Controller,
  Delete,
  ForbiddenException,
  NotFoundException,
  Param,
  ParseUUIDPipe,
  UseGuards,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { PrismaService } from '../../prisma.module.js';
import { ApiStandartResponse } from '../../other/scheme_standar.js';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard.js';
import { RolesGuard } from '../../common/guards/roles.guard.js';
import { ApiRoles } from '../../common/decorators/api-roles.decorator.js';
import { CurrentUser } from '../../auth/user.decorator.js';
import type { JwtPayload } from '../../auth/user.decorator.js';
import { Role } from '../../common/enums/role.enum.js';
import { AuditService } from '../../common/services/audit.service.js';
import { UnitScopeService } from '../../common/services/unit-scope.service.js';
import { AksiAudit } from '../../common/enums/hris.enum.js';
import { ok } from '../../common/utils/response.util.js';
import { AlokasiItemDto } from './alokasi-gaji.dto.js';

@ApiTags('Alokasi Gaji TA')
@Controller('/api/alokasi-gaji')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AlokasiDeleteController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly unitScope: UnitScopeService,
  ) {}

  @Delete(':id')
  @ApiRoles('Batalkan alokasi gaji TA', [Role.Superadmin, Role.Koordinator])
  @ApiStandartResponse(AlokasiItemDto)
  async cancel(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    const existing = await this.prisma.alokasiGajiTA.findUnique({
      where: { id },
      include: {
        pegawai: {
          select: {
            id: true,
            nama: true,
            nip_nik: true,
            unit_kerja_id: true,
            unit_kerja: { select: { id: true, nama_unit: true } },
          },
        },
      },
    });
    if (!existing) throw new NotFoundException('Alokasi tidak ditemukan');

    if (existing.status !== 'AKTIF') {
      throw new BadRequestException('Alokasi sudah dibatalkan');
    }

    // Scope koordinator
    if (user.role === Role.Koordinator) {
      if (!user.unitKerjaId) {
        throw new ForbiddenException(
          'Akun koordinator belum memiliki unit kerja',
        );
      }
      if (existing.pegawai.unit_kerja_id) {
        const inScope = await this.unitScope.isUnitInScope(
          existing.pegawai.unit_kerja_id,
          user.unitKerjaId,
        );
        if (!inScope) {
          throw new ForbiddenException(
            'Anda hanya dapat membatalkan alokasi untuk TA di lingkungan unit Anda',
          );
        }
      }
    }

    const updated = await this.prisma.alokasiGajiTA.update({
      where: { id },
      data: { status: 'DIBATALKAN' },
      include: {
        pegawai: {
          select: {
            id: true,
            nama: true,
            nip_nik: true,
            tipe_pegawai: true,
            gaji_bulanan: true,
            unit_kerja: { select: { id: true, nama_unit: true } },
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
      recordId: id,
      aksi: AksiAudit.CANCEL,
      dilakukanOleh: user.sub,
      dataSebelum: { status: existing.status, jumlah: existing.jumlah },
      dataSesudah: { status: updated.status },
    });

    return ok('Berhasil membatalkan alokasi. Saldo sumber dana dikembalikan.', {
      id: updated.id,
      status: updated.status,
      jumlah: updated.jumlah,
      periode_bulan: updated.periode_bulan,
      periode_tahun: updated.periode_tahun,
      sumber_dana: updated.sumber_dana,
      nama_pegawai: updated.pegawai?.nama ?? null,
    });
  }
}
