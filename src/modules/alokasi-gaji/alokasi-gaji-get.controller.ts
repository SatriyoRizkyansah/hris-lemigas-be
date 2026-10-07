import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { PrismaService } from '../../prisma.module.js';
import { ApiStandartResponseArrayWithPagination } from '../../other/scheme_standar.js';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard.js';
import { RolesGuard } from '../../common/guards/roles.guard.js';
import { ApiRoles } from '../../common/decorators/api-roles.decorator.js';
import { CurrentUser } from '../../auth/user.decorator.js';
import type { JwtPayload } from '../../auth/user.decorator.js';
import { Role } from '../../common/enums/role.enum.js';
import { UnitScopeService } from '../../common/services/unit-scope.service.js';
import { paginated } from '../../common/utils/response.util.js';
import { AlokasiQueryDto, AlokasiItemDto } from './alokasi-gaji.dto.js';

@ApiTags('Alokasi Gaji TA')
@Controller('/api/alokasi-gaji')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AlokasiGetController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly unitScope: UnitScopeService,
  ) {}

  @Get()
  @ApiRoles('Get daftar alokasi gaji TA', [Role.Superadmin, Role.Koordinator])
  @ApiStandartResponseArrayWithPagination(AlokasiItemDto)
  async getData(
    @CurrentUser() user: JwtPayload,
    @Query() query: AlokasiQueryDto,
  ) {
    const where: Record<string, unknown> = {};
    if (query.id_pegawai) where.pegawai_id = query.id_pegawai;
    if (query.periode_bulan) where.periode_bulan = query.periode_bulan;
    if (query.periode_tahun) where.periode_tahun = query.periode_tahun;
    if (query.sumber_dana) where.sumber_dana = query.sumber_dana;

    if (query.query) {
      where.OR = [
        {
          pegawai: {
            nama: { contains: query.query, mode: 'insensitive' },
          },
        },
        {
          pegawai: {
            nip_nik: { contains: query.query, mode: 'insensitive' },
          },
        },
      ];
    }

    const penempatanFilter = (ids: string[]) => ({
      penempatan_list: {
        some: {
          unit_kerja_id: { in: ids },
          is_homebase: true,
          status_aktif: 'AKTIF' as const,
        },
      },
    });
    // Filter unit: pegawai di unit + anak unit
    if (query.id_unit_kerja) {
      const scopedUnits = await this.unitScope.getScopedUnitIds(
        query.id_unit_kerja,
      );
      where.pegawai = penempatanFilter(scopedUnits);
    }

    // Scope koordinator
    if (user.role === Role.Koordinator) {
      if (!user.unitKerjaId) {
        return paginated(
          'Berhasil mengambil data alokasi gaji TA',
          [],
          query.page,
          query.limit,
          0,
        );
      }
      const scopedUnits = await this.unitScope.getScopedUnitIds(
        user.unitKerjaId,
      );
      const unitFilter = penempatanFilter(scopedUnits);
      where.pegawai = where.pegawai
        ? {
            AND: [where.pegawai as object, unitFilter],
          }
        : unitFilter;
    }

    const [items, total] = await Promise.all([
      this.prisma.alokasiGajiTA.findMany({
        where,
        include: {
          pegawai: {
            select: {
              id: true,
              nama: true,
              nip_nik: true,
              tipe_pegawai: true,
              gaji_bulanan: true,
              penempatan_list: {
                where: { is_homebase: true, status_aktif: 'AKTIF' },
                select: {
                  unit_kerja: { select: { id: true, nama_unit: true } },
                },
                take: 1,
              },
            },
          },
          ro: { select: { id: true, kode_ro: true, nama_ro: true } },
          dana_operasional: {
            select: { id: true, tahun_fiscal: true, unit_koordinator_id: true },
          },
          pembuat: { select: { nama: true } },
        },
        orderBy: [{ periode_tahun: 'desc' }, { periode_bulan: 'desc' }],
        skip: (query.page - 1) * query.limit,
        take: query.limit,
      }),
      this.prisma.alokasiGajiTA.count({ where }),
    ]);

    const data: AlokasiItemDto[] = items.map((item) => this.mapItem(item));
    return paginated(
      'Berhasil mengambil data alokasi gaji TA',
      data,
      query.page,
      query.limit,
      total,
    );
  }

  private mapItem(item: any): AlokasiItemDto {
    return {
      id: item.id,
      periode_bulan: item.periode_bulan,
      periode_tahun: item.periode_tahun,
      sumber_dana: item.sumber_dana,
      jumlah: item.jumlah,
      status: item.status,
      keterangan: item.keterangan ?? null,
      id_pegawai: item.pegawai?.id ?? null,
      nama_pegawai: item.pegawai?.nama ?? null,
      nip_nik: item.pegawai?.nip_nik ?? null,
      tipe_pegawai: item.pegawai?.tipe_pegawai ?? null,
      gaji_bulanan: item.pegawai?.gaji_bulanan ?? null,
      id_unit_kerja: item.pegawai?.penempatan_list?.[0]?.unit_kerja?.id ?? null,
      nama_unit_kerja:
        item.pegawai?.penempatan_list?.[0]?.unit_kerja?.nama_unit ?? null,
      id_ro: item.ro?.id ?? null,
      nama_ro: item.ro ? `${item.ro.kode_ro} - ${item.ro.nama_ro}` : null,
      id_dana_operasional: item.dana_operasional?.id ?? null,
      nama_dibuat_oleh: item.pembuat?.nama ?? null,
      created_at: item.created_at,
      updated_at: item.updated_at,
    };
  }
}
