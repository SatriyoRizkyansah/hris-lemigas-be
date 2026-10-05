import {
  BadRequestException,
  Controller,
  Delete,
  NotFoundException,
  Param,
  ParseUUIDPipe,
  UseGuards,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { PrismaService } from '../../prisma.module.js';
import { ApiStandartResponseDelete } from '../../other/scheme_standar.js';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard.js';
import { RolesGuard } from '../../common/guards/roles.guard.js';
import { ApiRoles } from '../../common/decorators/api-roles.decorator.js';
import { CurrentUser } from '../../auth/user.decorator.js';
import type { JwtPayload } from '../../auth/user.decorator.js';
import { Role } from '../../common/enums/role.enum.js';
import { AuditService } from '../../common/services/audit.service.js';
import { AksiAudit } from '../../common/enums/hris.enum.js';
import { deleted } from '../../common/utils/response.util.js';

@ApiTags('Master - Unit Kerja')
@Controller('/api/unit-kerja')
@UseGuards(JwtAuthGuard, RolesGuard)
export class UnitKerjaDeleteController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  @Delete(':id')
  @ApiRoles('Nonaktifkan unit kerja', [Role.Superadmin])
  @ApiStandartResponseDelete()
  async remove(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    const existing = await this.prisma.unitKerja.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException('Unit kerja tidak ditemukan');
    }

    const [childUnits, activePegawai] = await Promise.all([
      this.prisma.unitKerja.count({
        where: { parent_unit_id: id, status_aktif: 'AKTIF' },
      }),
      this.prisma.pegawai.count({
        where: { unit_kerja_id: id, status_aktif: 'AKTIF' },
      }),
    ]);

    if (childUnits > 0) {
      throw new BadRequestException(
        'Unit memiliki sub unit aktif. Nonaktifkan sub unit terlebih dahulu.',
      );
    }
    if (activePegawai > 0) {
      throw new BadRequestException(
        'Unit memiliki pegawai aktif. Pindahkan pegawai terlebih dahulu.',
      );
    }

    const updated = await this.prisma.unitKerja.update({
      where: { id },
      data: { status_aktif: 'NONAKTIF' },
    });

    await this.audit.log({
      tabel: 'unit_kerja',
      recordId: id,
      aksi: AksiAudit.UPDATE,
      dilakukanOleh: user.sub,
      dataSebelum: existing,
      dataSesudah: updated,
    });

    return deleted('Berhasil menonaktifkan unit kerja');
  }
}
