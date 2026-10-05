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
    if (query.id_unit_kerja) where.unit_kerja_id = query.id_unit_kerja;

    // Scope koordinator: hanya unit sendiri + anak unit
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
      where.unit_kerja_id = { in: scopedUnits };
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
    const pegawai = await this.prisma.pegawai.findUnique({
      where: { id },
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
    });

    if (!pegawai) {
      return {
        status: HttpStatus.NOT_FOUND,
        message: 'Pegawai tidak ditemukan',
        data: null,
      };
    }

    // Scope check koordinator
    if (user.role === Role.Koordinator && user.unitKerjaId) {
      const inScope = await this.unitScope.isUnitInScope(
        pegawai.unit_kerja_id ?? '',
        user.unitKerjaId,
      );
      if (!pegawai.unit_kerja_id || !inScope) {
        return {
          status: HttpStatus.FORBIDDEN,
          message: 'Anda tidak memiliki akses ke pegawai ini',
          data: null,
        };
      }
    }

    const riwayat = pegawai.sk_list.map((sk) => ({
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

    return ok('Berhasil mengambil detail pegawai', {
      ...this.mapItem(pegawai),
      riwayat_sk: riwayat,
    });
  }

  private mapItem(item: any): PegawaiItemDto {
    return {
      id: item.id,
      nip_nik: item.nip_nik,
      nama: item.nama,
      tipe_pegawai: item.tipe_pegawai,
      jabatan: item.jabatan ?? null,
      email: item.email ?? null,
      telepon: item.telepon ?? null,
      tanggal_mulai: item.tanggal_mulai,
      status_aktif: item.status_aktif,
      bidang_keahlian: item.bidang_keahlian ?? null,
      kontrak_mulai: item.kontrak_mulai ?? null,
      kontrak_selesai: item.kontrak_selesai ?? null,
      gaji_bulanan: item.gaji_bulanan ?? null,
      unit_kerja: item.unit_kerja
        ? {
            id: item.unit_kerja.id,
            kode_unit: item.unit_kerja.kode_unit,
            nama_unit: item.unit_kerja.nama_unit,
            tipe_unit: item.unit_kerja.tipe_unit,
            parent_unit_id: item.unit_kerja.parent_unit_id ?? null,
            kepala_unit_nama: item.unit_kerja.kepala_unit?.nama ?? null,
          }
        : null,
      created_at: item.created_at,
      updated_at: item.updated_at,
    };
  }
}
