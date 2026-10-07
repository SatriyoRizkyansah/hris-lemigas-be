import {
  Controller,
  Get,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { PrismaService } from '../../prisma.module.js';
import {
  ApiStandartResponseArrayWithPagination,
  ApiStandartResponse,
} from '../../other/scheme_standar.js';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard.js';
import { RolesGuard } from '../../common/guards/roles.guard.js';
import { ApiRoles } from '../../common/decorators/api-roles.decorator.js';
import { CurrentUser } from '../../auth/user.decorator.js';
import type { JwtPayload } from '../../auth/user.decorator.js';
import { Role } from '../../common/enums/role.enum.js';
import { UnitScopeService } from '../../common/services/unit-scope.service.js';
import { paginated, ok } from '../../common/utils/response.util.js';
import {
  PegawaiQueryDto,
  PegawaiItemDto,
  PegawaiDetailDto,
} from './pegawai.dto.js';

@ApiTags('Master - Pegawai')
@Controller('/api/pegawai')
@UseGuards(JwtAuthGuard, RolesGuard)
export class PegawaiGetController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly unitScope: UnitScopeService,
  ) {}

  @Get()
  @ApiRoles('Get daftar pegawai', [Role.Superadmin, Role.Koordinator])
  @ApiStandartResponseArrayWithPagination(PegawaiItemDto)
  async getData(
    @CurrentUser() user: JwtPayload,
    @Query() query: PegawaiQueryDto,
  ) {
    const where: Record<string, unknown> = {};

    if (query.tipe_pegawai) where.tipe_pegawai = query.tipe_pegawai;
    if (query.status_aktif) where.status_aktif = query.status_aktif;
    const penempatanFilter = (ids: string[]) => ({
      penempatan_list: {
        some: {
          unit_kerja_id: { in: ids },
          is_homebase: true,
          status_aktif: 'AKTIF' as const,
        },
      },
    });
    if (query.id_unit_kerja) {
      const scoped = await this.unitScope.getScopedUnitIds(query.id_unit_kerja);
      where.penempatan_list = penempatanFilter(scoped);
    }

    // Scope koordinator: hanya unit sendiri + anak unit (via penempatan homebase)
    if (user.role === Role.Koordinator) {
      if (!user.unitKerjaId) {
        return paginated(
          'Berhasil mengambil data pegawai',
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
      where.penempatan_list = where.penempatan_list
        ? { AND: [where.penempatan_list as object, unitFilter] }
        : unitFilter;
    }

    if (query.query) {
      where.OR = [
        { nama: { contains: query.query, mode: 'insensitive' } },
        { nip_nik: { contains: query.query, mode: 'insensitive' } },
        { email: { contains: query.query, mode: 'insensitive' } },
        { jabatan: { contains: query.query, mode: 'insensitive' } },
      ];
    }

    const [data, total] = await Promise.all([
      this.prisma.pegawai.findMany({
        where,
        include: {
          penempatan_list: {
            where: { is_homebase: true, status_aktif: 'AKTIF' },
            include: {
              unit_kerja: {
                select: {
                  id: true,
                  kode_unit: true,
                  nama_unit: true,
                  tipe_unit: true,
                  parent_unit_id: true,
                  kepala_unit: { select: { nama: true } },
                },
              },
            },
            take: 1,
          },
        },
        orderBy: { nama: 'asc' },
        skip: (query.page - 1) * query.limit,
        take: query.limit,
      }),
      this.prisma.pegawai.count({ where }),
    ]);

    const result = data.map((item) => this.mapItem(item));

    return paginated(
      'Berhasil mengambil data pegawai',
      result,
      query.page,
      query.limit,
      total,
    );
  }

  @Get(':id')
  @ApiRoles('Get detail pegawai', [Role.Superadmin, Role.Koordinator])
  @ApiStandartResponse(PegawaiDetailDto)
  async getDetail(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    const pegawai = (await this.prisma.pegawai.findUnique({
      where: { id },
      include: {
        penempatan_list: {
          orderBy: { tmt: 'desc' },
          include: {
            unit_kerja: {
              select: {
                id: true,
                kode_unit: true,
                nama_unit: true,
                tipe_unit: true,
                parent_unit_id: true,
                kepala_unit: { select: { nama: true } },
              },
            },
          },
        },
        sk_list: {
          orderBy: { tanggal_efektif: 'desc' },
          include: {
            unit_kerja: {
              select: {
                id: true,
                kode_unit: true,
                nama_unit: true,
                tipe_unit: true,
                parent_unit_id: true,
              },
            },
          },
        },
      },
    })) as any;

    if (!pegawai) {
      return {
        status: HttpStatus.NOT_FOUND,
        message: 'Pegawai tidak ditemukan',
        data: null,
      };
    }

    // Scope check koordinator via penempatan homebase
    if (user.role === Role.Koordinator && user.unitKerjaId) {
      const homebase =
        pegawai.penempatan_list?.find(
          (p: any) => p.is_homebase && p.status_aktif === 'AKTIF',
        ) ?? pegawai.penempatan_list?.[0];
      const unitId = homebase?.unit_kerja_id ?? '';
      const inScope = unitId
        ? await this.unitScope.isUnitInScope(unitId, user.unitKerjaId)
        : false;
      if (!unitId || !inScope) {
        return {
          status: HttpStatus.FORBIDDEN,
          message: 'Anda tidak memiliki akses ke pegawai ini',
          data: null,
        };
      }
    }

    const riwayat = pegawai.sk_list.map((sk: any) => ({
      id: sk.id,
      nomor_sk: sk.nomor_sk,
      tanggal_sk: sk.tanggal_sk,
      tanggal_efektif: sk.tanggal_efektif,
      tanggal_selesai: sk.tanggal_selesai,
      jabatan: sk.jabatan,
      file_sk: sk.file_sk,
      status_aktif: sk.status_aktif,
      unit_kerja: sk.unit_kerja
        ? {
            id: sk.unit_kerja.id,
            kode_unit: sk.unit_kerja.kode_unit,
            nama_unit: sk.unit_kerja.nama_unit,
            tipe_unit: sk.unit_kerja.tipe_unit,
            parent_unit_id: sk.unit_kerja.parent_unit_id,
          }
        : undefined,
    }));

    const riwayat_penempatan = (pegawai.penempatan_list ?? []).map(
      (p: any) => ({
        id: p.id,
        pegawai_id: p.pegawai_id,
        unit_kerja: p.unit_kerja
          ? {
              id: p.unit_kerja.id,
              kode_unit: p.unit_kerja.kode_unit,
              nama_unit: p.unit_kerja.nama_unit,
              tipe_unit: p.unit_kerja.tipe_unit,
              parent_unit_id: p.unit_kerja.parent_unit_id ?? null,
              kepala_unit_nama: p.unit_kerja.kepala_unit?.nama ?? null,
            }
          : null,
        jabatan: p.jabatan ?? null,
        tmt: p.tmt,
        tanggal_selesai: p.tanggal_selesai ?? null,
        no_sk: p.no_sk ?? null,
        file_sk: p.file_sk ?? null,
        status_aktif: p.status_aktif,
        is_homebase: p.is_homebase,
        keterangan: p.keterangan ?? null,
        created_at: p.created_at,
      }),
    );

    return ok('Berhasil mengambil detail pegawai', {
      ...this.mapItem(pegawai),
      riwayat_sk: riwayat,
      riwayat_penempatan,
    });
  }

  private mapItem(item: any): PegawaiItemDto {
    const homebase =
      item.penempatan_list?.find(
        (p: any) => p.is_homebase && p.status_aktif === 'AKTIF',
      ) ?? item.penempatan_list?.[0];
    const uk = homebase?.unit_kerja ?? item.unit_kerja ?? null;
    return {
      id: item.id,
      nip_nik: item.nip_nik,
      nama: item.nama,
      tipe_pegawai: item.tipe_pegawai,
      jabatan: homebase?.jabatan ?? item.jabatan ?? null,
      email: item.email ?? null,
      telepon: item.telepon ?? null,
      tanggal_mulai: item.tanggal_mulai,
      status_aktif: item.status_aktif,
      bidang_keahlian: item.bidang_keahlian ?? null,
      kontrak_mulai: item.kontrak_mulai ?? null,
      kontrak_selesai: item.kontrak_selesai ?? null,
      gaji_bulanan: item.gaji_bulanan ?? null,
      ta_kategori: item.ta_kategori ?? 'BIASA',
      unit_kerja: uk
        ? {
            id: uk.id,
            kode_unit: uk.kode_unit,
            nama_unit: uk.nama_unit,
            tipe_unit: uk.tipe_unit,
            parent_unit_id: uk.parent_unit_id ?? null,
            kepala_unit_nama: uk.kepala_unit?.nama ?? null,
          }
        : null,
      created_at: item.created_at,
      updated_at: item.updated_at,
    };
  }
}
