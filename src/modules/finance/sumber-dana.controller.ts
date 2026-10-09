import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { IsOptional, IsUUID } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { PrismaService } from '../../prisma.module.js';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard.js';
import { RolesGuard } from '../../common/guards/roles.guard.js';
import { ApiRoles } from '../../common/decorators/api-roles.decorator.js';
import { CurrentUser } from '../../auth/user.decorator.js';
import type { JwtPayload } from '../../auth/user.decorator.js';
import { Role } from '../../common/enums/role.enum.js';
import { UnitScopeService } from '../../common/services/unit-scope.service.js';
import { ok } from '../../common/utils/response.util.js';

class SumberDanaQueryDto {
  @ApiPropertyOptional({
    description: 'Filter by unit_kerja_id (koordinator scope)',
  })
  @IsUUID()
  @IsOptional()
  unit_kerja_id?: string;

  @ApiPropertyOptional({ example: 2026 })
  @IsOptional()
  tahun_fiscal?: number;
}

@ApiTags('Sumber Dana')
@Controller('/api/sumber-dana')
@UseGuards(JwtAuthGuard, RolesGuard)
export class SumberDanaController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly unitScope: UnitScopeService,
  ) {}

  @Get('available')
  @ApiRoles('Get available funding sources scoped by unit', [
    Role.Superadmin,
    Role.Koordinator,
    Role.Keuangan,
  ])
  async getAvailable(
    @CurrentUser() user: JwtPayload,
    @Query() query: SumberDanaQueryDto,
  ) {
    // Resolve scope: KOORDINATOR/KEUANGAN scoped to own unit, SUPERADMIN can pass unit_kerja_id or see all
    let scopedUnitIds: string[] | null = null;

    if (user.role === Role.Koordinator || user.role === Role.Keuangan) {
      if (!user.unitKerjaId) {
        return ok('Sumber dana tersedia', { ro: [], danaOperasional: [] });
      }
      scopedUnitIds = await this.unitScope.getScopedUnitIds(user.unitKerjaId);
    } else if (query.unit_kerja_id) {
      scopedUnitIds = await this.unitScope.getScopedUnitIds(
        query.unit_kerja_id,
      );
    }

    const roWhere: Record<string, unknown> = { status_ro: 'AKTIF' };
    const danaWhere: Record<string, unknown> = {};

    if (scopedUnitIds) {
      roWhere.unit_koordinator_id = { in: scopedUnitIds };
      danaWhere.unit_koordinator_id = { in: scopedUnitIds };
    }
    if (query.tahun_fiscal) {
      roWhere.tahun_fiscal = query.tahun_fiscal;
      danaWhere.tahun_fiscal = query.tahun_fiscal;
    }

    const [roList, danaList] = await Promise.all([
      this.prisma.ro.findMany({
        where: roWhere,
        select: {
          id: true,
          kode_ro: true,
          nama_ro: true,
          tahun_fiscal: true,
          total_plafon: true,
          unit_koordinator_id: true,
          unit_koordinator: { select: { nama_unit: true } },
        },
        orderBy: { kode_ro: 'asc' },
      }),
      this.prisma.danaOperasional.findMany({
        where: danaWhere,
        select: {
          id: true,
          tahun_fiscal: true,
          total_plafon: true,
          kategori_kamar: true,
          unit_koordinator_id: true,
          unit_koordinator: { select: { nama_unit: true } },
        },
        orderBy: [{ tahun_fiscal: 'desc' }, { kategori_kamar: 'asc' }],
      }),
    ]);

    return ok('Berhasil mengambil sumber dana tersedia', {
      ro: roList.map((r) => ({
        id: r.id,
        kode_ro: r.kode_ro,
        nama_ro: r.nama_ro,
        tahun_fiscal: r.tahun_fiscal,
        total_plafon: r.total_plafon,
        unit_koordinator_id: r.unit_koordinator_id,
        nama_unit: (r as any).unit_koordinator?.nama_unit ?? null,
        group: 'Direct Cost (RO)',
      })),
      danaOperasional: danaList.map((d) => ({
        id: d.id,
        tahun_fiscal: d.tahun_fiscal,
        total_plafon: d.total_plafon,
        kategori_kamar: (d as any).kategori_kamar,
        unit_koordinator_id: d.unit_koordinator_id,
        nama_unit: (d as any).unit_koordinator?.nama_unit ?? null,
        group: 'Margin Operasional',
      })),
    });
  }
}
