import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { PrismaService } from '../../prisma.module.js';
import {
  ApiStandartResponse,
  ApiStandartResponseArrayWithPagination,
} from '../../other/scheme_standar.js';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard.js';
import { RolesGuard } from '../../common/guards/roles.guard.js';
import { ApiRoles } from '../../common/decorators/api-roles.decorator.js';
import { Role } from '../../common/enums/role.enum.js';
import { paginated, ok } from '../../common/utils/response.util.js';
import { UnitScopeService } from '../../common/services/unit-scope.service.js';
import { CurrentUser } from '../../auth/user.decorator.js';
import type { JwtPayload } from '../../auth/user.decorator.js';
import {
  UnitKerjaQueryDto,
  UnitKerjaItemDto,
  UnitKerjaTreeNodeDto,
} from './unit-kerja.dto.js';

@ApiTags('Master - Unit Kerja')
@Controller('/api/unit-kerja')
@UseGuards(JwtAuthGuard, RolesGuard)
export class UnitKerjaGetController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly unitScope: UnitScopeService,
  ) {}

  @Get()
  @ApiRoles('Get daftar unit kerja', [
    Role.Superadmin,
    Role.Koordinator,
    Role.Keuangan,
  ])
  @ApiStandartResponseArrayWithPagination(UnitKerjaItemDto)
  async getData(
    @CurrentUser() user: JwtPayload,
    @Query() query: UnitKerjaQueryDto,
  ) {
    const where: Record<string, unknown> = { status_aktif: 'AKTIF' };
    if (query.tipe_unit) where.tipe_unit = query.tipe_unit;
    if (query.id_parent_unit) where.parent_unit_id = query.id_parent_unit;
    if (query.query) {
      where.OR = [
        { nama_unit: { contains: query.query, mode: 'insensitive' } },
        { kode_unit: { contains: query.query, mode: 'insensitive' } },
      ];
    }

    // Koordinator/Keuangan: hanya unit dalam scope-nya
    if (user.role === Role.Koordinator || user.role === Role.Keuangan) {
      if (!user.unitKerjaId) {
        return paginated(
          'Berhasil mengambil data unit kerja',
          [],
          query.page,
          query.limit,
          0,
        );
      }
      const scopedUnits = await this.unitScope.getScopedUnitIds(
        user.unitKerjaId,
      );
      where.id = { in: scopedUnits };
    }

    const [units, total] = await Promise.all([
      this.prisma.unitKerja.findMany({
        where,
        include: {
          kepala_unit: { select: { nama: true } },
          _count: {
            select: {
              sk_list: {
                where: { status_aktif: 'AKTIF', is_homebase: true },
              },
              children: { where: { status_aktif: 'AKTIF' } },
            },
          },
        },
        orderBy: [{ tipe_unit: 'asc' }, { nama_unit: 'asc' }],
        skip: (query.page - 1) * query.limit,
        take: query.limit,
      }),
      this.prisma.unitKerja.count({ where }),
    ]);

    const data: UnitKerjaItemDto[] = units.map((u) => ({
      id: u.id,
      kode_unit: u.kode_unit,
      nama_unit: u.nama_unit,
      tipe_unit: u.tipe_unit,
      parent_unit_id: u.parent_unit_id ?? null,
      id_kepala_unit: u.kepala_unit_id ?? null,
      kepala_unit_nama: u.kepala_unit?.nama ?? null,
      deskripsi: u.deskripsi ?? null,
      status_aktif: u.status_aktif,
      jumlah_pegawai_aktif: (u._count as any).sk_list,
      jumlah_sub_unit: u._count.children,
      created_at: u.created_at,
      updated_at: u.updated_at,
    }));

    return paginated(
      'Berhasil mengambil data unit kerja',
      data,
      query.page,
      query.limit,
      total,
    );
  }

  @Get('tree')
  @ApiRoles('Get struktur organisasi (tree)', [
    Role.Superadmin,
    Role.Koordinator,
    Role.Keuangan,
  ])
  @ApiStandartResponse(UnitKerjaTreeNodeDto)
  async getTree(@CurrentUser() user: JwtPayload) {
    const where: Record<string, unknown> = { status_aktif: 'AKTIF' };

    if (user.role === Role.Koordinator) {
      if (!user.unitKerjaId) {
        return ok('Berhasil mengambil struktur organisasi', []);
      }
      const scopedUnits = await this.unitScope.getScopedUnitIds(
        user.unitKerjaId,
      );
      where.id = { in: scopedUnits };
    }

    const units = await this.prisma.unitKerja.findMany({
      where,
      include: {
        kepala_unit: { select: { nama: true } },
        children: {
          where: { status_aktif: 'AKTIF' },
          include: {
            kepala_unit: { select: { nama: true } },
            children: true,
          },
        },
      },
      orderBy: { nama_unit: 'asc' },
    });

    const buildTree = (parentId: string | null): UnitKerjaTreeNodeDto[] =>
      units
        .filter((u) => u.parent_unit_id === parentId)
        .map((u) => ({
          id: u.id,
          kode_unit: u.kode_unit,
          nama_unit: u.nama_unit,
          tipe_unit: u.tipe_unit,
          kepala_unit_nama: u.kepala_unit?.nama ?? null,
          status_aktif: u.status_aktif,
          children: buildTree(u.id),
        }));

    return ok('Berhasil mengambil struktur organisasi', buildTree(null));
  }
}
