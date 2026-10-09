import {
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Query,
  UseGuards,
} from '@nestjs/common';
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
import { SkQueryDto, SkItemDto } from './sk.dto.js';

@ApiTags('SK')
@Controller('/api/sk')
@UseGuards(JwtAuthGuard, RolesGuard)
export class SkGetController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly unitScope: UnitScopeService,
  ) {}

  @Get()
  @ApiRoles('Get daftar SK', [Role.Superadmin, Role.Koordinator, Role.Keuangan])
  @ApiStandartResponseArrayWithPagination(SkItemDto)
  async getData(@CurrentUser() user: JwtPayload, @Query() query: SkQueryDto) {
    const where: Record<string, unknown> = {};
    if (query.id_pegawai) where.pegawai_id = query.id_pegawai;
    if (query.id_unit_kerja) where.unit_kerja_id = query.id_unit_kerja;
    if (query.status_aktif) where.status_aktif = query.status_aktif;
    if (query.query) {
      where.OR = [
        { nomor_sk: { contains: query.query, mode: 'insensitive' } },
        { jabatan: { contains: query.query, mode: 'insensitive' } },
        { pegawai: { nama: { contains: query.query, mode: 'insensitive' } } },
      ];
    }

    // Koordinator/Keuangan: hanya SK untuk pegawai/unit dalam scope
    if (user.role === Role.Koordinator || user.role === Role.Keuangan) {
      if (!user.unitKerjaId) {
        return paginated(
          'Berhasil mengambil data SK',
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

    const [items, total] = await Promise.all([
      this.prisma.sk.findMany({
        where,
        include: {
          pegawai: { select: { id: true, nama: true, nip_nik: true } },
          unit_kerja: { select: { id: true, nama_unit: true } },
        },
        orderBy: { tanggal_efektif: 'desc' },
        skip: (query.page - 1) * query.limit,
        take: query.limit,
      }),
      this.prisma.sk.count({ where }),
    ]);

    const data: SkItemDto[] = items.map((sk) => this.mapItem(sk));
    return paginated(
      'Berhasil mengambil data SK',
      data,
      query.page,
      query.limit,
      total,
    );
  }

  @Get('expiring-soon')
  @ApiRoles('SK hampir habis (30 hari)', [
    Role.Superadmin,
    Role.Koordinator,
    Role.Keuangan,
  ])
  @ApiStandartResponseArrayWithPagination(SkItemDto)
  async getExpiringSoon(
    @CurrentUser() user: JwtPayload,
    @Query() query: SkQueryDto,
  ) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const in30 = new Date(today);
    in30.setDate(in30.getDate() + 30);

    const where: Record<string, unknown> = {
      status_aktif: 'AKTIF',
      tanggal_selesai: { gte: today, lte: in30 },
    };
    if (query.id_pegawai) where.pegawai_id = query.id_pegawai;
    if (query.id_unit_kerja) where.unit_kerja_id = query.id_unit_kerja;
    if (query.query) {
      where.OR = [
        { nomor_sk: { contains: query.query, mode: 'insensitive' } },
        { pegawai: { nama: { contains: query.query, mode: 'insensitive' } } },
      ];
    }
    if (user.role === Role.Koordinator || user.role === Role.Keuangan) {
      if (!user.unitKerjaId)
        return paginated(
          'Berhasil mengambil SK expiring soon',
          [],
          query.page,
          query.limit,
          0,
        );
      const scopedUnits = await this.unitScope.getScopedUnitIds(
        user.unitKerjaId,
      );
      where.unit_kerja_id = { in: scopedUnits };
    }

    const [items, total] = await Promise.all([
      this.prisma.sk.findMany({
        where,
        include: {
          pegawai: { select: { id: true, nama: true, nip_nik: true } },
          unit_kerja: { select: { id: true, nama_unit: true } },
        },
        orderBy: { tanggal_selesai: 'asc' },
        skip: (query.page - 1) * query.limit,
        take: query.limit,
      }),
      this.prisma.sk.count({ where }),
    ]);
    return paginated(
      'Berhasil mengambil SK yang hampir habis',
      items.map((sk) => this.mapItem(sk)),
      query.page,
      query.limit,
      total,
    );
  }

  @Get('pegawai/:pegawaiId')
  @ApiRoles('Get riwayat SK pegawai', [
    Role.Superadmin,
    Role.Koordinator,
    Role.Keuangan,
  ])
  @ApiStandartResponseArrayWithPagination(SkItemDto)
  async getRiwayat(
    @CurrentUser() user: JwtPayload,
    @Param('pegawaiId', ParseUUIDPipe) pegawaiId: string,
    @Query() query: SkQueryDto,
  ) {
    const pegawai = await this.prisma.pegawai.findUnique({
      where: { id: pegawaiId },
      include: {
        sk_list: {
          where: { is_homebase: true, status_aktif: 'AKTIF' },
          select: { unit_kerja_id: true },
          take: 1,
        },
      },
    });
    if (!pegawai) {
      return paginated('Pegawai tidak ditemukan', [], 1, query.limit, 0);
    }

    if (user.role === Role.Koordinator && user.unitKerjaId) {
      const unitId = (pegawai as any).sk_list?.[0]?.unit_kerja_id;
      if (unitId) {
        const inScope = await this.unitScope.isUnitInScope(
          unitId,
          user.unitKerjaId,
        );
        if (!inScope) {
          return paginated(
            'Anda tidak memiliki akses ke pegawai ini',
            [],
            1,
            query.limit,
            0,
          );
        }
      }
    }

    const [items, total] = await Promise.all([
      this.prisma.sk.findMany({
        where: { pegawai_id: pegawaiId },
        include: {
          pegawai: { select: { id: true, nama: true, nip_nik: true } },
          unit_kerja: { select: { id: true, nama_unit: true } },
        },
        orderBy: { tanggal_efektif: 'desc' },
        skip: (query.page - 1) * query.limit,
        take: query.limit,
      }),
      this.prisma.sk.count({ where: { pegawai_id: pegawaiId } }),
    ]);

    const data: SkItemDto[] = items.map((sk) => this.mapItem(sk));
    return paginated(
      'Berhasil mengambil riwayat SK',
      data,
      query.page,
      query.limit,
      total,
    );
  }

  private mapItem(sk: any): SkItemDto {
    return {
      id: sk.id,
      nomor_sk: sk.nomor_sk,
      tanggal_sk: sk.tanggal_sk,
      tanggal_efektif: sk.tanggal_efektif,
      tanggal_selesai: sk.tanggal_selesai ?? null,
      jabatan: sk.jabatan ?? null,
      file_sk: sk.file_sk ?? null,
      gaji_bulanan: sk.gaji_bulanan ?? 0,
      sumber_dana_default: sk.sumber_dana_default ?? null,
      ro_id_default: sk.ro_id_default ?? null,
      dana_operasional_id_default: sk.dana_operasional_id_default ?? null,
      is_homebase: sk.is_homebase ?? true,
      keterangan: sk.keterangan ?? null,
      status_aktif: sk.status_aktif,
      id_pegawai: sk.pegawai?.id ?? null,
      nama_pegawai: sk.pegawai?.nama ?? null,
      nip_nik: sk.pegawai?.nip_nik ?? null,
      id_unit_kerja: sk.unit_kerja?.id ?? null,
      nama_unit_kerja: sk.unit_kerja?.nama_unit ?? null,
      created_at: sk.created_at,
      updated_at: sk.updated_at,
    };
  }
}
