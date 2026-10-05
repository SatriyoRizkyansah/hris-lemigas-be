import {
  BadRequestException,
  Controller,
  ForbiddenException,
  Get,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsOptional, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiTags } from '@nestjs/swagger';
import { PrismaService } from '../../prisma.module.js';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard.js';
import { RolesGuard } from '../../common/guards/roles.guard.js';
import { ApiRoles } from '../../common/decorators/api-roles.decorator.js';
import { CurrentUser } from '../../auth/user.decorator.js';
import type { JwtPayload } from '../../auth/user.decorator.js';
import { Role } from '../../common/enums/role.enum.js';
import { UnitScopeService } from '../../common/services/unit-scope.service.js';
import { FundService } from '../../common/services/fund.service.js';
import { ok } from '../../common/utils/response.util.js';

class DashboardQueryDto {
  @ApiPropertyOptional({ example: 2026 })
  @IsInt()
  @Min(2000)
  @IsOptional()
  @Type(() => Number)
  tahun?: number;
}

@ApiTags('Dashboard')
@Controller('/api/dashboard')
@UseGuards(JwtAuthGuard, RolesGuard)
export class DashboardController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly unitScope: UnitScopeService,
    private readonly fund: FundService,
  ) {}

  @Get('superadmin')
  @ApiRoles('Dashboard superadmin', [Role.Superadmin])
  async getSuperadminDashboard(@Query() query: DashboardQueryDto) {
    const tahun = query.tahun ?? new Date().getFullYear();

    const [
      totalPegawai,
      pegawaiPerTipe,
      totalUnit,
      totalKoordinator,
      totalProyek,
      totalRo,
      koordinators,
    ] = await Promise.all([
      this.prisma.pegawai.count({ where: { status_aktif: 'AKTIF' } }),
      this.prisma.pegawai.groupBy({
        by: ['tipe_pegawai'],
        _count: true,
        where: { status_aktif: 'AKTIF' },
      }),
      this.prisma.unitKerja.count({ where: { status_aktif: 'AKTIF' } }),
      this.prisma.unitKerja.count({
        where: { tipe_unit: 'KOORDINATOR', status_aktif: 'AKTIF' },
      }),
      this.prisma.proyek.count({ where: { tahun_fiscal: tahun } }),
      this.prisma.ro.count({ where: { tahun_fiscal: tahun } }),
      this.prisma.unitKerja.findMany({
        where: { tipe_unit: 'KOORDINATOR', status_aktif: 'AKTIF' },
        select: { id: true, kode_unit: true, nama_unit: true },
        orderBy: { nama_unit: 'asc' },
      }),
    ]);

    const taPerKoordinator: Array<{
      id_unit_koordinator: string;
      nama_unit: string;
      jumlah_ta: number;
    }> = [];
    const budgetPerKoordinator: Array<{
      id_unit_koordinator: string;
      nama_unit: string;
      total_plafon: number;
      total_terpakai: number;
      sisa_saldo: number;
      total_plafon_operasional: number;
      terpakai_operasional: number;
      sisa_operasional: number;
    }> = [];

    for (const koordinator of koordinators) {
      const scopedUnits = await this.unitScope.getScopedUnitIds(koordinator.id);

      const jumlahTa = await this.prisma.pegawai.count({
        where: {
          tipe_pegawai: 'TA',
          status_aktif: 'AKTIF',
          unit_kerja_id: { in: scopedUnits },
        },
      });
      taPerKoordinator.push({
        id_unit_koordinator: koordinator.id,
        nama_unit: koordinator.nama_unit,
        jumlah_ta: jumlahTa,
      });

      const ros = await this.prisma.ro.findMany({
        where: {
          unit_koordinator_id: { in: scopedUnits },
          tahun_fiscal: tahun,
        },
      });
      let totalPlafon = 0;
      let totalTerpakai = 0;
      for (const ro of ros) {
        const balance = await this.fund.getRoBalance(ro.id);
        totalPlafon += balance.total_plafon;
        totalTerpakai += balance.total_terpakai;
      }

      const operasionals = await this.prisma.danaOperasional.findMany({
        where: {
          unit_koordinator_id: { in: scopedUnits },
          tahun_fiscal: tahun,
        },
      });
      let totalPlafonOp = 0;
      let terpakaiOp = 0;
      for (const op of operasionals) {
        const balance = await this.fund.getOperationalBalance(op.id);
        totalPlafonOp += balance.total_plafon;
        terpakaiOp += balance.total_terpakai;
      }

      budgetPerKoordinator.push({
        id_unit_koordinator: koordinator.id,
        nama_unit: koordinator.nama_unit,
        total_plafon: totalPlafon,
        total_terpakai: totalTerpakai,
        sisa_saldo: totalPlafon - totalTerpakai,
        total_plafon_operasional: totalPlafonOp,
        terpakai_operasional: terpakaiOp,
        sisa_operasional: totalPlafonOp - terpakaiOp,
      });
    }

    return ok('Berhasil mengambil dashboard superadmin', {
      tahun,
      total_pegawai_aktif: totalPegawai,
      pegawai_per_tipe: pegawaiPerTipe.map((p) => ({
        tipe: p.tipe_pegawai,
        jumlah: p._count,
      })),
      total_unit: totalUnit,
      total_koordinator: totalKoordinator,
      total_proyek: totalProyek,
      total_ro: totalRo,
      jumlah_ta_per_koordinator: taPerKoordinator,
      budget_per_koordinator: budgetPerKoordinator,
    });
  }

  @Get('koordinator-unit')
  @ApiRoles('Dashboard koordinator untuk unit miliknya', [
    Role.Superadmin,
    Role.Koordinator,
  ])
  async getKoordinatorUnitDashboard(
    @CurrentUser() user: JwtPayload,
    @Query() query: DashboardQueryDto & { id_unit_koordinator?: string },
  ) {
    const tahun = query.tahun ?? new Date().getFullYear();

    let rootUnitId: string | null = null;

    if (user.role === Role.Koordinator) {
      if (!user.unitKerjaId) {
        throw new ForbiddenException(
          'Akun koordinator belum memiliki unit kerja',
        );
      }
      rootUnitId = user.unitKerjaId;
    } else {
      if (!query.id_unit_koordinator) {
        throw new BadRequestException(
          'Superadmin harus menyertakan id_unit_koordinator',
        );
      }
      rootUnitId = query.id_unit_koordinator;
    }

    const rootUnit = await this.prisma.unitKerja.findUnique({
      where: { id: rootUnitId },
    });
    if (!rootUnit)
      throw new BadRequestException('Unit koordinator tidak ditemukan');
    if (rootUnit.tipe_unit !== 'KOORDINATOR') {
      throw new BadRequestException('Unit harus bertipe KOORDINATOR');
    }

    const scopedUnits = await this.unitScope.getScopedUnitIds(rootUnitId);

    const [jumlahPegawai, jumlahTa, jumlahSubUnit] = await Promise.all([
      this.prisma.pegawai.count({
        where: {
          status_aktif: 'AKTIF',
          unit_kerja_id: { in: scopedUnits },
        },
      }),
      this.prisma.pegawai.count({
        where: {
          tipe_pegawai: 'TA',
          status_aktif: 'AKTIF',
          unit_kerja_id: { in: scopedUnits },
        },
      }),
      this.prisma.unitKerja.count({
        where: {
          id: { in: scopedUnits, not: rootUnitId },
          status_aktif: 'AKTIF',
        },
      }),
    ]);

    // Breakdown RO per proyek
    const ros = await this.prisma.ro.findMany({
      where: {
        unit_koordinator_id: { in: scopedUnits },
        tahun_fiscal: tahun,
      },
      include: {
        proyek: { select: { id: true, kode_proyek: true, nama_proyek: true } },
      },
      orderBy: { kode_ro: 'asc' },
    });

    const roBreakdown = [];
    for (const ro of ros) {
      const balance = await this.fund.getRoBalance(ro.id);
      roBreakdown.push({
        id: ro.id,
        kode_ro: ro.kode_ro,
        nama_ro: ro.nama_ro,
        nama_proyek: ro.proyek?.nama_proyek ?? null,
        total_plafon: balance.total_plafon,
        total_terpakai: balance.total_terpakai,
        sisa_saldo: balance.sisa_saldo,
      });
    }

    const operasionals = await this.prisma.danaOperasional.findMany({
      where: {
        unit_koordinator_id: { in: scopedUnits },
        tahun_fiscal: tahun,
      },
    });
    const operasionalBreakdown = [];
    for (const op of operasionals) {
      const balance = await this.fund.getOperationalBalance(op.id);
      operasionalBreakdown.push({
        id: op.id,
        tahun_fiscal: op.tahun_fiscal,
        total_plafon: balance.total_plafon,
        total_terpakai: balance.total_terpakai,
        sisa_saldo: balance.sisa_saldo,
      });
    }

    // Rekap alokasi bulan berjalan
    const now = new Date();
    const alokasiBulanIni = await this.prisma.alokasiGajiTA.aggregate({
      _sum: { jumlah: true },
      _count: true,
      where: {
        status: 'AKTIF',
        periode_bulan: now.getMonth() + 1,
        periode_tahun: now.getFullYear(),
        pegawai: { unit_kerja_id: { in: scopedUnits } },
      },
    });

    return ok('Berhasil mengambil dashboard koordinator', {
      unit: {
        id: rootUnit.id,
        kode_unit: rootUnit.kode_unit,
        nama_unit: rootUnit.nama_unit,
      },
      tahun,
      jumlah_pegawai_aktif: jumlahPegawai,
      jumlah_ta: jumlahTa,
      jumlah_sub_unit: jumlahSubUnit,
      alokasi_bulan_ini: {
        periode_bulan: now.getMonth() + 1,
        periode_tahun: now.getFullYear(),
        jumlah_alokasi: alokasiBulanIni._count,
        total_jumlah: alokasiBulanIni._sum.jumlah ?? 0,
      },
      ro_breakdown: roBreakdown,
      operasional_breakdown: operasionalBreakdown,
    });
  }
}
