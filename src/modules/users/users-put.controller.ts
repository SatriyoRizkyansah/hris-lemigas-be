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
    let targetRoleKode: string | undefined;
    if (body.role) {
      const role = await this.prisma.role.findUnique({
        where: { kode: body.role },
      });
      if (!role) throw new BadRequestException('Role tidak ditemukan');
      roleId = role.id;
      targetRoleKode = role.kode;
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
        userRoles: { include: { role: true } },
      },
    });

    // Sync roles if provided
    if (body.roles || body.role) {
      const existingRoles = await this.prisma.userRole.findMany({
        where: { user_id: id },
        include: { role: true },
      });
      const defaultKode =
        targetRoleKode ??
        existingRoles.find((ur) => ur.is_default)?.role.kode ??
        updated.role.kode;
      let desiredKodes: string[];
      if (body.roles) {
        desiredKodes = Array.from(new Set([defaultKode, ...body.roles]));
      } else if (body.role) {
        desiredKodes = Array.from(
          new Set([defaultKode, ...existingRoles.map((ur) => ur.role.kode)]),
        );
      } else {
        desiredKodes = [];
      }
      // Ensure all desired roles exist
      const desiredRoleMap = new Map<string, { id: string; kode: string }>();
      for (const kode of desiredKodes) {
        const r = await this.prisma.role.findUnique({ where: { kode } });
        if (!r) throw new BadRequestException(`Role ${kode} tidak ditemukan`);
        desiredRoleMap.set(kode, r);
      }
      // Remove roles not in desired
      const desiredIds = new Set(
        Array.from(desiredRoleMap.values()).map((r) => r.id),
      );
      for (const ur of existingRoles) {
        if (!desiredIds.has(ur.role_id)) {
          await this.prisma.userRole.delete({ where: { id: ur.id } });
        }
      }
      // Upsert desired
      for (const [kode, r] of desiredRoleMap.entries()) {
        await this.prisma.userRole.upsert({
          where: { user_id_role_id: { user_id: id, role_id: r.id } },
          update: { is_default: kode === defaultKode },
          create: {
            user_id: id,
            role_id: r.id,
            is_default: kode === defaultKode,
          },
        });
      }
      // Ensure only one default
      await this.prisma.userRole.updateMany({
        where: {
          user_id: id,
          role_id: { not: desiredRoleMap.get(defaultKode)!.id },
        },
        data: { is_default: false },
      });
    }

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
    const roles: string[] = item.userRoles?.length
      ? item.userRoles.map((ur: any) => ur.role?.kode ?? '').filter(Boolean)
      : [item.role?.kode ?? ''].filter(Boolean);
    const rolesDetail =
      item.userRoles?.map((ur: any) => ur.role).filter(Boolean) ??
      (item.role ? [item.role] : []);
    return {
      id: item.id,
      email: item.email,
      nama: item.nama,
      role: item.role?.kode ?? '',
      nama_role: item.role?.nama ?? null,
      roles,
      roles_detail: rolesDetail,
      id_unit_kerja: item.unit_kerja?.id ?? null,
      nama_unit_kerja: item.unit_kerja?.nama_unit ?? null,
      status: item.status,
      created_at: item.created_at,
      updated_at: item.updated_at,
    };
  }
}
