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

@ApiTags('Master - Pegawai')
@Controller('/api/pegawai')
@UseGuards(JwtAuthGuard, RolesGuard)
export class PegawaiDeleteController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  @Delete(':id')
  @ApiRoles('Nonaktifkan pegawai', [Role.Superadmin])
  @ApiStandartResponseDelete()
  async remove(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    const existing = await this.prisma.pegawai.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException('Pegawai tidak ditemukan');
    }

    const activeSk = await this.prisma.sk.findFirst({
      where: { pegawai_id: id, status_aktif: 'AKTIF' },
    });
    if (activeSk) {
      throw new BadRequestException(
        'Pegawai masih memiliki SK aktif. Nonaktifkan SK terlebih dahulu.',
      );
    }

    const updated = await this.prisma.pegawai.update({
      where: { id },
      data: { status_aktif: 'NONAKTIF' },
    });

    await this.audit.log({
      tabel: 'pegawai',
      recordId: id,
      aksi: AksiAudit.UPDATE,
      dilakukanOleh: user.sub,
      dataSebelum: existing,
      dataSesudah: updated,
    });

    return deleted('Berhasil menonaktifkan pegawai');
  }
}
