import {
  BadRequestException,
  Body,
  Controller,
  NotFoundException,
  Param,
  ParseUUIDPipe,
  Put,
  UseGuards,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../../prisma.module.js';
import { ApiStandartResponse } from '../../other/scheme_standar.js';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard.js';
import { RolesGuard } from '../../common/guards/roles.guard.js';
import { ApiRoles } from '../../common/decorators/api-roles.decorator.js';
import { CurrentUser } from '../../auth/user.decorator.js';
import type { JwtPayload } from '../../auth/user.decorator.js';
import { Role } from '../../common/enums/role.enum.js';
import { AuditService } from '../../common/services/audit.service.js';
import { AksiAudit } from '../../common/enums/hris.enum.js';
import { ok } from '../../common/utils/response.util.js';
import { UpdateUserDto, UserItemDto } from './users.dto.js';

@ApiTags('Users')
@Controller('/api/users')
@UseGuards(JwtAuthGuard, RolesGuard)
export class UsersPutController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  @Put(':id')
  @ApiRoles('Update user', [Role.Superadmin])
  @ApiStandartResponse(UserItemDto)
  async update(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: UpdateUserDto,
  ) {
    const existing = await this.prisma.user.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('User tidak ditemukan');

    let roleId: string | undefined;
    if (body.role) {
      const role = await this.prisma.role.findUnique({
        where: { kode: body.role },
      });
      if (!role) throw new BadRequestException('Role tidak ditemukan');
      roleId = role.id;
    }

    if (body.id_unit_kerja) {
      const unit = await this.prisma.unitKerja.findUnique({
        where: { id: body.id_unit_kerja },
      });
      if (!unit || unit.status_aktif !== 'AKTIF') {
        throw new BadRequestException('Unit kerja tidak ditemukan');
      }
      if (body.role === Role.Koordinator && unit.tipe_unit !== 'KOORDINATOR') {
        throw new BadRequestException(
          'Role koordinator harus ditugaskan ke unit bertipe KOORDINATOR',
        );
      }
    }

    const updated = await this.prisma.user.update({
      where: { id },
      data: {
        nama: body.nama,
        role_id: roleId,
        unit_kerja_id:
          body.id_unit_kerja !== undefined
            ? body.id_unit_kerja || null
            : undefined,
        status: body.status,
        ...(body.password
          ? { password_hash: await bcrypt.hash(body.password, 10) }
          : {}),
      },
      include: {
        role: { select: { id: true, kode: true, nama: true } },
        unit_kerja: { select: { id: true, nama_unit: true } },
      },
    });

    await this.audit.log({
      tabel: 'user',
      recordId: id,
      aksi: AksiAudit.UPDATE,
      dilakukanOleh: user.sub,
      dataSebelum: {
        nama: existing.nama,
        role_id: existing.role_id,
        unit_kerja_id: existing.unit_kerja_id,
        status: existing.status,
      },
      dataSesudah: {
        nama: updated.nama,
        role_id: updated.role_id,
        unit_kerja_id: updated.unit_kerja_id,
        status: updated.status,
      },
    });

    return ok('Berhasil mengupdate user', this.mapItem(updated));
  }

  private mapItem(item: any): UserItemDto {
    return {
      id: item.id,
      email: item.email,
      nama: item.nama,
      role: item.role?.kode ?? '',
      nama_role: item.role?.nama ?? null,
      id_unit_kerja: item.unit_kerja?.id ?? null,
      nama_unit_kerja: item.unit_kerja?.nama_unit ?? null,
      status: item.status,
      created_at: item.created_at,
      updated_at: item.updated_at,
    };
  }
}
