import {
  BadRequestException,
  Body,
  ConflictException,
  Controller,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../../prisma.module.js';
import { ApiStandartResponseCreate } from '../../other/scheme_standar.js';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard.js';
import { RolesGuard } from '../../common/guards/roles.guard.js';
import { ApiRoles } from '../../common/decorators/api-roles.decorator.js';
import { CurrentUser } from '../../auth/user.decorator.js';
import type { JwtPayload } from '../../auth/user.decorator.js';
import { Role } from '../../common/enums/role.enum.js';
import { AuditService } from '../../common/services/audit.service.js';
import { AksiAudit } from '../../common/enums/hris.enum.js';
import { created } from '../../common/utils/response.util.js';
import { CreateUserDto, UserItemDto } from './users.dto.js';

@ApiTags('Users')
@Controller('/api/users')
@UseGuards(JwtAuthGuard, RolesGuard)
export class UsersPostController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  @Post()
  @ApiRoles('Buat user baru', [Role.Superadmin])
  @ApiStandartResponseCreate(UserItemDto)
  async create(@CurrentUser() user: JwtPayload, @Body() body: CreateUserDto) {
    const existing = await this.prisma.user.findUnique({
      where: { email: body.email },
    });
    if (existing) throw new ConflictException('Email sudah digunakan');

    const role = await this.prisma.role.findUnique({
      where: { kode: body.role },
    });
    if (!role) throw new BadRequestException('Role tidak ditemukan');

    if (body.id_unit_kerja) {
      const unit = await this.prisma.unitKerja.findUnique({
        where: { id: body.id_unit_kerja },
      });
      if (!unit || unit.status_aktif !== 'AKTIF') {
        throw new BadRequestException('Unit kerja tidak ditemukan');
      }
      if (role.kode === Role.Koordinator && unit.tipe_unit !== 'KOORDINATOR') {
        throw new BadRequestException(
          'Role koordinator harus ditugaskan ke unit bertipe KOORDINATOR',
        );
      }
    }

    const passwordHash = await bcrypt.hash(body.password, 10);

    // Build full role list: default + additional
    const allRoleKodes = Array.from(
      new Set([body.role, ...(body.roles ?? [])]),
    );
    const roleMap = new Map<
      string,
      { id: string; kode: string; nama: string }
    >();
    roleMap.set(role.kode, role);
    for (const kode of allRoleKodes) {
      if (roleMap.has(kode)) continue;
      const r = await this.prisma.role.findUnique({ where: { kode } });
      if (!r) throw new BadRequestException(`Role ${kode} tidak ditemukan`);
      roleMap.set(kode, r);
    }

    const newUser = await this.prisma.user.create({
      data: {
        email: body.email,
        nama: body.nama,
        password_hash: passwordHash,
        role_id: role.id,
        unit_kerja_id: body.id_unit_kerja ?? null,
        status: body.status ?? 'AKTIF',
        created_by: user.sub,
      },
      include: {
        role: { select: { id: true, kode: true, nama: true } },
        unit_kerja: { select: { id: true, nama_unit: true } },
      },
    });

    // Sync UserRole
    for (const [kode, r] of roleMap.entries()) {
      await this.prisma.userRole.upsert({
        where: { user_id_role_id: { user_id: newUser.id, role_id: r.id } },
        update: { is_default: kode === body.role },
        create: {
          user_id: newUser.id,
          role_id: r.id,
          is_default: kode === body.role,
        },
      });
    }

    await this.audit.log({
      tabel: 'user',
      recordId: newUser.id,
      aksi: AksiAudit.CREATE,
      dilakukanOleh: user.sub,
      dataSesudah: {
        email: newUser.email,
        nama: newUser.nama,
        role: role.kode,
        status: newUser.status,
      },
    });

    return created('Berhasil membuat user', this.mapItem(newUser));
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
