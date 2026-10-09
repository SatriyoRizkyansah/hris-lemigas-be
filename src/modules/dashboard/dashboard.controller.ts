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

// ─── DTOs ────────────────────────────────────────────────────────────────────

class DashboardQueryDto {
  @ApiPropertyOptional({ example: 2026 })
  @IsInt()
  @Min(2000)
  @IsOptional()
  @Type(() => Number)
  tahun?: number;
}

class KoordinatorDashboardQueryDto {
  @ApiPropertyOptional({ example: 2026 })
  @IsInt()
  @Min(2000)
  @IsOptional()
  @Type(() => Number)
  tahun?: number;

  @ApiPropertyOptional({
    description: 'UUID unit koordinator (wajib untuk Superadmin)',
  })
  @IsOptional()
  id_unit_koordinator?: string;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const BULAN_LABEL = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'Mei',
  'Jun',
  'Jul',
  'Ags',
  'Sep',
  'Okt',
  'Nov',
  'Des',
];

/**
 * Buat array skeleton 12 bulan untuk tahun tertentu,
 * setiap item berisi { bulan, label, total_jumlah: 0 }.
 */
function build12MonthSkeleton(tahun: number) {
  return Array.from({ length: 12 }, (_, i) => ({
    bulan: i + 1,
    tahun,
    label: BULAN_LABEL[i],
    total_jumlah: 0,
    jumlah_alokasi: 0,
  }));
}

// ─── Controller ──────────────────────────────────────────────────────────────

@ApiTags('Dashboard')
@Controller('/api/dashboard')
@UseGuards(JwtAuthGuard, RolesGuard)
export class DashboardController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly unitScope: UnitScopeService,
    private readonly fund: FundService,
  ) {}

  // ── 1. SUPERADMIN DASHBOARD ────────────────────────────────────────────────

  @Get('superadmin')
  @ApiRoles('Dashboard superadmin', [Role.Superadmin, Role.Keuangan])
  async getSuperadminDashboard(@Query() query: DashboardQueryDto) {
    const tahun = query.tahun ?? new Date().getFullYear();

    // Parallel base queries
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

    // Monthly alokasi trend (12 bulan seluruh koordinator)
    const alokasiTrend12 = await this.prisma.alokasiGajiTA.groupBy({
      by: ['periode_bulan', 'periode_tahun'],
      _sum: { jumlah: true },
      _count: true,
      where: {
        status: 'AKTIF',
        periode_tahun: tahun,
      },
    });

    const monthlyTrend = build12MonthSkeleton(tahun);
    for (const item of alokasiTrend12) {
      const idx = item.periode_bulan - 1;
      if (idx >= 0 && idx < 12) {
        monthlyTrend[idx].total_jumlah = item._sum.jumlah ?? 0;
        monthlyTrend[idx].jumlah_alokasi = item._count;
      }
    }

    // Per-koordinator budget + TA
    const taPerKoordinator: Array<{
      id_unit_koordinator: string;
      nama_unit: string;
      jumlah_ta: number;
    }> = [];

    const budgetPerKoordinator: Array<{
      id_unit_koordinator: string;
      nama_unit: string;
      jumlah_ta: number;
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
          sk_list: {
            some: {
              unit_kerja_id: { in: scopedUnits },
              is_homebase: true,
              status_aktif: 'AKTIF',
            },
          },
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
        jumlah_ta: jumlahTa,
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
      monthly_trend: monthlyTrend,
    });
  }

  // ── 2. KOORDINATOR UNIT DASHBOARD ─────────────────────────────────────────

  @Get('koordinator-unit')
  @ApiRoles('Dashboard koordinator untuk unit miliknya', [
    Role.Superadmin,
    Role.Koordinator,
  ])
  async getKoordinatorUnitDashboard(
    @CurrentUser() user: JwtPayload,
    @Query() query: KoordinatorDashboardQueryDto,
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
          sk_list: {
            some: {
              unit_kerja_id: { in: scopedUnits },
              is_homebase: true,
              status_aktif: 'AKTIF',
            },
          },
        },
      }),
      this.prisma.pegawai.count({
        where: {
          tipe_pegawai: 'TA',
          status_aktif: 'AKTIF',
          sk_list: {
            some: {
              unit_kerja_id: { in: scopedUnits },
              is_homebase: true,
              status_aktif: 'AKTIF',
            },
          },
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
        pct_terpakai:
          balance.total_plafon > 0
            ? Math.round((balance.total_terpakai / balance.total_plafon) * 100)
            : 0,
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
        pct_terpakai:
          balance.total_plafon > 0
            ? Math.round((balance.total_terpakai / balance.total_plafon) * 100)
            : 0,
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
        pegawai: {
          sk_list: {
            some: {
              unit_kerja_id: { in: scopedUnits },
              is_homebase: true,
              status_aktif: 'AKTIF',
            },
          },
        },
      },
    });

    // Monthly trend 12 bulan untuk unit ini
    const alokasiTrend12 = await this.prisma.alokasiGajiTA.groupBy({
      by: ['periode_bulan', 'periode_tahun'],
      _sum: { jumlah: true },
      _count: true,
      where: {
        status: 'AKTIF',
        periode_tahun: tahun,
        pegawai: {
          sk_list: {
            some: {
              unit_kerja_id: { in: scopedUnits },
              is_homebase: true,
              status_aktif: 'AKTIF',
            },
          },
        },
      },
    });

    const monthlyTrend = build12MonthSkeleton(tahun);
    for (const item of alokasiTrend12) {
      const idx = item.periode_bulan - 1;
      if (idx >= 0 && idx < 12) {
        monthlyTrend[idx].total_jumlah = item._sum.jumlah ?? 0;
        monthlyTrend[idx].jumlah_alokasi = item._count;
      }
    }

    // Daftar TA aktif dalam unit beserta alokasi bulan ini
    const taAktif = await this.prisma.pegawai.findMany({
      where: {
        tipe_pegawai: 'TA',
        status_aktif: 'AKTIF',
        sk_list: {
          some: {
            unit_kerja_id: { in: scopedUnits },
            is_homebase: true,
            status_aktif: 'AKTIF',
          },
        },
      },
      select: {
        id: true,
        nama: true,
        bidang_keahlian: true,
        kontrak_selesai: true,
        alokasi_list: {
          where: {
            status: 'AKTIF',
            periode_bulan: now.getMonth() + 1,
            periode_tahun: now.getFullYear(),
          },
          select: {
            jumlah: true,
            sumber_dana: true,
          },
        },
        sk_list: {
          where: {
            unit_kerja_id: { in: scopedUnits },
            is_homebase: true,
            status_aktif: 'AKTIF',
          },
          select: {
            gaji_bulanan: true,
            unit_kerja: { select: { nama_unit: true } },
          },
          take: 1,
        },
      },
      orderBy: { nama: 'asc' },
    });

    const taList = taAktif.map((ta) => {
      const totalAlokasi = ta.alokasi_list.reduce((s, a) => s + a.jumlah, 0);
      const sk = ta.sk_list[0];
      return {
        id: ta.id,
        nama: ta.nama,
        bidang_keahlian: ta.bidang_keahlian,
        kontrak_selesai: ta.kontrak_selesai,
        nama_unit: sk?.unit_kerja?.nama_unit ?? null,
        gaji_bulanan: sk?.gaji_bulanan ?? 0,
        total_alokasi_bulan_ini: totalAlokasi,
        sumber_dana_list: ta.alokasi_list.map((a) => a.sumber_dana),
      };
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
      monthly_trend: monthlyTrend,
      ta_list: taList,
    });
  }

  // ── 3. SK EXPIRING SOON ────────────────────────────────────────────────────

  @Get('sk-expiring-soon')
  @ApiRoles('SK yang masa berlakunya hampir habis (30 hari)', [
    Role.Superadmin,
    Role.Keuangan,
  ])
  async getSkExpiringSoon() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const in30Days = new Date(today);
    in30Days.setDate(in30Days.getDate() + 30);

    const skList = await this.prisma.sk.findMany({
      where: {
        status_aktif: 'AKTIF',
        tanggal_selesai: {
          gte: today,
          lte: in30Days,
        },
      },
      include: {
        pegawai: {
          select: {
            id: true,
            nama: true,
            tipe_pegawai: true,
            nip_nik: true,
          },
        },
        unit_kerja: {
          select: {
            id: true,
            nama_unit: true,
            kode_unit: true,
          },
        },
      },
      orderBy: { tanggal_selesai: 'asc' },
    });

    const result = skList.map((sk) => {
      const tanggalSelesai = sk.tanggal_selesai!;
      const diffMs = new Date(tanggalSelesai).getTime() - today.getTime();
      const sisaHari = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

      return {
        id: sk.id,
        nomor_sk: sk.nomor_sk,
        tanggal_selesai: sk.tanggal_selesai,
        sisa_hari: sisaHari,
        pegawai: sk.pegawai,
        unit_kerja: sk.unit_kerja,
      };
    });

    return ok('Berhasil mengambil daftar SK yang akan berakhir', {
      total: result.length,
      sk_list: result,
    });
  }
}
