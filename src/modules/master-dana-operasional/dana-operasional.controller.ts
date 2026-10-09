import {
  BadRequestException,
  Body,
  ConflictException,
  Controller,
  Delete,
  Get,
  NotFoundException,
  Param,
  ParseUUIDPipe,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsOptional, IsUUID, Min } from 'class-validator';
import { ApiTags } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { PrismaService } from '../../prisma.module.js';
import {
  ApiStandartResponse,
  ApiStandartResponseArrayWithPagination,
  ApiStandartResponseCreate,
  ApiStandartResponseDelete,
} from '../../other/scheme_standar.js';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard.js';
import { RolesGuard } from '../../common/guards/roles.guard.js';
import { ApiRoles } from '../../common/decorators/api-roles.decorator.js';
import { CurrentUser } from '../../auth/user.decorator.js';
import type { JwtPayload } from '../../auth/user.decorator.js';
import { Role } from '../../common/enums/role.enum.js';
import { AuditService } from '../../common/services/audit.service.js';
import { AksiAudit } from '../../common/enums/hris.enum.js';
import { FundService } from '../../common/services/fund.service.js';
import { UnitScopeService } from '../../common/services/unit-scope.service.js';
import { PaginateQuery } from '../../common/dto/paginate-query.dto.js';
import {
  ok,
  created,
  deleted,
  paginated,
} from '../../common/utils/response.util.js';
import {
  CreateDanaOperasionalDto,
  UpdateDanaOperasionalDto,
  DanaOperasionalItemDto,
} from './dana-operasional.dto.js';

class DanaOperasionalQueryDto extends PaginateQuery {
  @ApiPropertyOptional({ description: 'Filter unit koordinator' })
  @IsUUID()
  @IsOptional()
  id_unit_koordinator?: string;

  @ApiPropertyOptional({ example: 2026 })
  @IsInt()
  @Min(2000)
  @IsOptional()
  @Type(() => Number)
  tahun_fiscal?: number;
}

@ApiTags('Master - Dana Operasional')
@Controller('/api/dana-operasional')
@UseGuards(JwtAuthGuard, RolesGuard)
export class DanaOperasionalController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly fund: FundService,
    private readonly unitScope: UnitScopeService,
  ) {}

  @Get()
  @ApiRoles('Get daftar dana operasional', [
    Role.Superadmin,
    Role.Koordinator,
    Role.Keuangan,
  ])
  @ApiStandartResponseArrayWithPagination(DanaOperasionalItemDto)
  async getData(
    @CurrentUser() user: JwtPayload,
    @Query() query: DanaOperasionalQueryDto,
  ) {
    const where: Record<string, unknown> = {};
    if (query.id_unit_koordinator)
      where.unit_koordinator_id = query.id_unit_koordinator;
    if (query.tahun_fiscal) where.tahun_fiscal = query.tahun_fiscal;

    // Koordinator/Keuangan: hanya dana operasional unit dalam scope
    if (user.role === Role.Koordinator || user.role === Role.Keuangan) {
      if (!user.unitKerjaId) {
        return paginated(
          'Berhasil mengambil data dana operasional',
          [],
          query.page,
          query.limit,
          0,
        );
      }
      const scopedUnits = await this.unitScope.getScopedUnitIds(
        user.unitKerjaId,
      );
      where.unit_koordinator_id = { in: scopedUnits };
    }

    const [items, total] = await Promise.all([
      this.prisma.danaOperasional.findMany({
        where,
        include: {
          unit_koordinator: { select: { id: true, nama_unit: true } },
        },
        orderBy: [{ tahun_fiscal: 'desc' }],
        skip: (query.page - 1) * query.limit,
        take: query.limit,
      }),
      this.prisma.danaOperasional.count({ where }),
    ]);

    const data = await Promise.all(
      items.map(async (item) => {
        const balance = await this.fund.getOperationalBalance(item.id);
        return this.mapItem(item, balance.total_terpakai);
      }),
    );

    return paginated(
      'Berhasil mengambil data dana operasional',
      data,
      query.page,
      query.limit,
      total,
    );
  }

  @Get(':id')
  @ApiRoles('Get detail dana operasional', [
    Role.Superadmin,
    Role.Koordinator,
    Role.Keuangan,
  ])
  @ApiStandartResponse(DanaOperasionalItemDto)
  async getDetail(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    const item = await this.prisma.danaOperasional.findUnique({
      where: { id },
      include: {
        unit_koordinator: { select: { id: true, nama_unit: true } },
      },
    });
    if (!item) throw new NotFoundException('Dana operasional tidak ditemukan');

    if (
      (user.role === Role.Koordinator || user.role === Role.Keuangan) &&
      user.unitKerjaId
    ) {
      const inScope = await this.unitScope.isUnitInScope(
        item.unit_koordinator_id,
        user.unitKerjaId,
      );
      if (!inScope) {
        throw new BadRequestException(
          'Anda tidak memiliki akses ke dana operasional ini',
        );
      }
    }

    const balance = await this.fund.getOperationalBalance(id);
    const ledger = await this.fund.getDanaLedger(id);
    const alokasi = await this.prisma.alokasiGajiTA.findMany({
      where: { dana_operasional_id: id, status: 'AKTIF' },
      include: { pegawai: { select: { id: true, nama: true, nip_nik: true } } },
      orderBy: { created_at: 'desc' },
      take: 50,
    });
    return ok('Berhasil mengambil detail dana operasional', {
      ...this.mapItem(item, balance.total_terpakai),
      transaksi_list: ledger.list,
      total_debit: ledger.total_debit,
      total_kredit: ledger.total_kredit,
      saldo_ledger: ledger.saldo_ledger,
      alokasi_list: alokasi,
    });
  }

  @Get(':id/ledger')
  @ApiRoles('Get ledger Dana Operasional', [
    Role.Superadmin,
    Role.Koordinator,
    Role.Keuangan,
  ])
  @ApiStandartResponse()
  async getLedger(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    const dana = await this.prisma.danaOperasional.findUnique({
      where: { id },
    });
    if (!dana) throw new NotFoundException('Dana operasional tidak ditemukan');
    if (
      (user.role === Role.Koordinator || user.role === Role.Keuangan) &&
      user.unitKerjaId
    ) {
      const inScope = await this.unitScope.isUnitInScope(
        dana.unit_koordinator_id,
        user.unitKerjaId,
      );
      if (!inScope) {
        throw new BadRequestException(
          'Anda tidak memiliki akses ke dana operasional ini',
        );
      }
    }
    const ledger = await this.fund.getDanaLedger(id);
    return ok('Berhasil mengambil ledger dana operasional', ledger);
  }

  @Post()
  @ApiRoles('Tambah dana operasional', [Role.Superadmin])
  @ApiStandartResponseCreate(DanaOperasionalItemDto)
  async create(
    @CurrentUser() user: JwtPayload,
    @Body() body: CreateDanaOperasionalDto,
  ) {
    const unit = await this.prisma.unitKerja.findUnique({
      where: { id: body.id_unit_koordinator },
    });
    if (!unit)
      throw new BadRequestException('Unit koordinator tidak ditemukan');
    if (unit.tipe_unit !== 'KOORDINATOR') {
      throw new BadRequestException(
        'Unit koordinator harus bertipe KOORDINATOR',
      );
    }

    const kategori = (body as any).kategori_kamar ?? 'LAINNYA';
    const exists = await this.prisma.danaOperasional.findUnique({
      where: {
        unit_koordinator_id_tahun_fiscal_kategori_kamar: {
          unit_koordinator_id: body.id_unit_koordinator,
          tahun_fiscal: body.tahun_fiscal,
          kategori_kamar: kategori as any,
        },
      },
    });
    if (exists) {
      throw new ConflictException(
        `Dana operasional untuk unit ${unit.nama_unit} tahun ${body.tahun_fiscal} kategori ${kategori} sudah ada`,
      );
    }

    const item = await this.prisma.danaOperasional.create({
      data: {
        unit_koordinator_id: body.id_unit_koordinator,
        tahun_fiscal: body.tahun_fiscal,
        kategori_kamar: kategori as any,
        total_plafon: body.total_plafon,
      },
      include: {
        unit_koordinator: { select: { id: true, nama_unit: true } },
      },
    });

    await this.audit.log({
      tabel: 'dana_operasional',
      recordId: item.id,
      aksi: AksiAudit.CREATE,
      dilakukanOleh: user.sub,
      dataSesudah: item,
    });

    return created(
      'Berhasil menambahkan dana operasional',
      this.mapItem(item, 0),
    );
  }

  @Put(':id')
  @ApiRoles('Update dana operasional', [Role.Superadmin])
  @ApiStandartResponse(DanaOperasionalItemDto)
  async update(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: UpdateDanaOperasionalDto,
  ) {
    const existing = await this.prisma.danaOperasional.findUnique({
      where: { id },
    });
    if (!existing)
      throw new NotFoundException('Dana operasional tidak ditemukan');

    if (body.total_plafon !== undefined) {
      const balance = await this.fund.getOperationalBalance(id);
      if (body.total_plafon < balance.total_terpakai) {
        throw new BadRequestException(
          `Total plafon baru (Rp ${body.total_plafon.toLocaleString('id-ID')}) ` +
            `tidak boleh kurang dari total terpakai (Rp ${balance.total_terpakai.toLocaleString('id-ID')})`,
        );
      }
    }

    const item = await this.prisma.danaOperasional.update({
      where: { id },
      data: {
        ...(body.total_plafon !== undefined && {
          total_plafon: body.total_plafon,
        }),
      },
      include: {
        unit_koordinator: { select: { id: true, nama_unit: true } },
      },
    });

    await this.audit.log({
      tabel: 'dana_operasional',
      recordId: id,
      aksi: AksiAudit.UPDATE,
      dilakukanOleh: user.sub,
      dataSebelum: existing,
      dataSesudah: item,
    });

    const balance = await this.fund.getOperationalBalance(id);
    return ok(
      'Berhasil mengupdate dana operasional',
      this.mapItem(item, balance.total_terpakai),
    );
  }

  @Delete(':id')
  @ApiRoles('Hapus dana operasional', [Role.Superadmin])
  @ApiStandartResponseDelete()
  async remove(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    const existing = await this.prisma.danaOperasional.findUnique({
      where: { id },
      include: { _count: { select: { alokasi_list: true } } },
    });
    if (!existing)
      throw new NotFoundException('Dana operasional tidak ditemukan');

    if (existing._count.alokasi_list > 0) {
      throw new BadRequestException(
        'Dana operasional sudah memiliki alokasi. Tidak dapat dihapus.',
      );
    }

    await this.prisma.danaOperasional.delete({ where: { id } });

    await this.audit.log({
      tabel: 'dana_operasional',
      recordId: id,
      aksi: AksiAudit.DELETE,
      dilakukanOleh: user.sub,
      dataSebelum: existing,
    });

    return deleted('Berhasil menghapus dana operasional');
  }

  private mapItem(item: any, totalTerpakai: number): DanaOperasionalItemDto {
    return {
      id: item.id,
      tahun_fiscal: item.tahun_fiscal,
      total_plafon: item.total_plafon,
      total_terpakai: totalTerpakai,
      sisa_saldo: item.total_plafon,
      id_unit_koordinator: item.unit_koordinator?.id ?? null,
      nama_unit_koordinator: item.unit_koordinator?.nama_unit ?? null,
      kategori_kamar: item.kategori_kamar ?? 'LAINNYA',
      created_at: item.created_at,
      updated_at: item.updated_at,
    } as any;
  }
}
