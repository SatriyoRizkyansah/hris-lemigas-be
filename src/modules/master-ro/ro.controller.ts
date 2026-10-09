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
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags } from '@nestjs/swagger';
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
import { FileService } from '../../common/services/file.service.js';
import {
  ok,
  created,
  deleted,
  paginated,
} from '../../common/utils/response.util.js';
import { RoQueryDto, CreateRoDto, UpdateRoDto, RoItemDto } from './ro.dto.js';

@ApiTags('Master - RO')
@Controller('/api/ro')
@UseGuards(JwtAuthGuard, RolesGuard)
export class RoController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly fund: FundService,
    private readonly unitScope: UnitScopeService,
    private readonly fileService: FileService,
  ) {}

  @Get()
  @ApiRoles('Get daftar RO', [Role.Superadmin, Role.Koordinator, Role.Keuangan])
  @ApiStandartResponseArrayWithPagination(RoItemDto)
  async getData(@CurrentUser() user: JwtPayload, @Query() query: RoQueryDto) {
    const where: Record<string, unknown> = {};
    if (query.id_proyek) where.proyek_id = query.id_proyek;
    if (query.id_unit_koordinator)
      where.unit_koordinator_id = query.id_unit_koordinator;
    if (query.tahun_fiscal) where.tahun_fiscal = query.tahun_fiscal;
    if (query.query) {
      where.OR = [
        { nama_ro: { contains: query.query, mode: 'insensitive' } },
        { kode_ro: { contains: query.query, mode: 'insensitive' } },
      ];
    }

    // Koordinator/Keuangan: hanya RO milik unit dalam scope (Keuangan read-only monitoring)
    if (user.role === Role.Koordinator || user.role === Role.Keuangan) {
      if (!user.unitKerjaId) {
        return paginated(
          'Berhasil mengambil data RO',
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

    const [ros, total] = await Promise.all([
      this.prisma.ro.findMany({
        where,
        include: {
          proyek: { select: { id: true, nama_proyek: true } },
          unit_koordinator: { select: { id: true, nama_unit: true } },
        },
        orderBy: [{ tahun_fiscal: 'desc' }, { kode_ro: 'asc' }],
        skip: (query.page - 1) * query.limit,
        take: query.limit,
      }),
      this.prisma.ro.count({ where }),
    ]);

    const data = await Promise.all(
      ros.map(async (ro) => {
        const balance = await this.fund.getRoBalance(ro.id);
        return this.mapItem(ro, balance.total_terpakai);
      }),
    );

    return paginated(
      'Berhasil mengambil data RO',
      data,
      query.page,
      query.limit,
      total,
    );
  }

  @Get(':id')
  @ApiRoles('Get detail RO', [Role.Superadmin, Role.Koordinator, Role.Keuangan])
  @ApiStandartResponse(RoItemDto)
  async getDetail(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    const ro = await this.prisma.ro.findUnique({
      where: { id },
      include: {
        proyek: { select: { id: true, nama_proyek: true } },
        unit_koordinator: { select: { id: true, nama_unit: true } },
      },
    });
    if (!ro) throw new NotFoundException('RO tidak ditemukan');

    if (
      (user.role === Role.Koordinator || user.role === Role.Keuangan) &&
      user.unitKerjaId
    ) {
      const inScope = await this.unitScope.isUnitInScope(
        ro.unit_koordinator_id,
        user.unitKerjaId,
      );
      if (!inScope) {
        throw new BadRequestException('Anda tidak memiliki akses ke RO ini');
      }
    }

    const balance = await this.fund.getRoBalance(ro.id);
    const ledger = await this.fund.getRoLedger(ro.id);
    const alokasi = await this.prisma.alokasiGajiTA.findMany({
      where: { ro_id: ro.id, status: 'AKTIF' },
      include: { pegawai: { select: { id: true, nama: true, nip_nik: true } } },
      orderBy: { created_at: 'desc' },
      take: 50,
    });
    return ok('Berhasil mengambil detail RO', {
      ...this.mapItem(ro, balance.total_terpakai),
      alokasi_terpakai: (balance as any).alokasi_terpakai ?? 0,
      trx_debit: (balance as any).trx_debit ?? ledger.total_debit,
      trx_kredit: (balance as any).trx_kredit ?? ledger.total_kredit,
      transaksi_list: ledger.list,
      total_debit: ledger.total_debit,
      total_kredit: ledger.total_kredit,
      saldo_ledger: ledger.saldo_ledger,
      alokasi_list: alokasi,
    });
  }

  @Get(':id/ledger')
  @ApiRoles('Get ledger RO', [Role.Superadmin, Role.Koordinator, Role.Keuangan])
  @ApiStandartResponse()
  async getLedger(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    const ro = await this.prisma.ro.findUnique({ where: { id } });
    if (!ro) throw new NotFoundException('RO tidak ditemukan');
    if (user.role === Role.Koordinator && user.unitKerjaId) {
      const inScope = await this.unitScope.isUnitInScope(
        ro.unit_koordinator_id,
        user.unitKerjaId,
      );
      if (!inScope) {
        throw new BadRequestException('Anda tidak memiliki akses ke RO ini');
      }
    }
    const ledger = await this.fund.getRoLedger(id);
    return ok('Berhasil mengambil ledger RO', ledger);
  }

  @Post(':id/rab')
  @ApiRoles('Upload RAB RO', [Role.Superadmin, Role.Koordinator])
  @UseInterceptors(FileInterceptor('file'))
  async uploadRab(
    @Param('id', ParseUUIDPipe) id: string,
    @UploadedFile() file: any,
  ) {
    const ro = await this.prisma.ro.findUnique({ where: { id } });
    if (!ro) throw new NotFoundException('RO tidak ditemukan');
    const path = await this.fileService.uploadRab({
      originalname: file.originalname,
      buffer: file.buffer,
    });
    if (ro.file_rab) await this.fileService.delete(ro.file_rab);
    const updated = await this.prisma.ro.update({
      where: { id },
      data: { file_rab: path },
    });
    return ok('Berhasil upload RAB', updated);
  }

  @Post()
  @ApiRoles('Tambah RO', [Role.Superadmin])
  @ApiStandartResponseCreate(RoItemDto)
  async create(@CurrentUser() user: JwtPayload, @Body() body: CreateRoDto) {
    const exists = await this.prisma.ro.findUnique({
      where: { kode_ro: body.kode_ro },
    });
    if (exists) {
      throw new ConflictException(`Kode RO ${body.kode_ro} sudah terdaftar`);
    }

    const proyek = await this.prisma.proyek.findUnique({
      where: { id: body.id_proyek },
    });
    if (!proyek) throw new BadRequestException('Proyek tidak ditemukan');

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

    const ro = await this.prisma.ro.create({
      data: {
        kode_ro: body.kode_ro,
        nama_ro: body.nama_ro,
        proyek_id: body.id_proyek,
        unit_koordinator_id: body.id_unit_koordinator,
        tahun_fiscal: body.tahun_fiscal,
        total_plafon: body.total_plafon,
        no_kontrak: (body as any).no_kontrak ?? null,
        pj: (body as any).pj ?? null,
        no_sk: (body as any).no_sk ?? null,
        mulai_sk: (body as any).mulai_sk
          ? new Date((body as any).mulai_sk)
          : null,
        berakhir_sk: (body as any).berakhir_sk
          ? new Date((body as any).berakhir_sk)
          : null,
        status_ro: (body as any).status_ro ?? 'AKTIF',
      },
      include: {
        proyek: { select: { id: true, nama_proyek: true } },
        unit_koordinator: { select: { id: true, nama_unit: true } },
      },
    });

    await this.audit.log({
      tabel: 'ro',
      recordId: ro.id,
      aksi: AksiAudit.CREATE,
      dilakukanOleh: user.sub,
      dataSesudah: ro,
    });

    return created('Berhasil menambahkan RO', this.mapItem(ro, 0));
  }

  @Put(':id')
  @ApiRoles('Update RO', [Role.Superadmin])
  @ApiStandartResponse(RoItemDto)
  async update(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: UpdateRoDto,
  ) {
    const existing = await this.prisma.ro.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('RO tidak ditemukan');

    // Validasi plafon baru tidak kurang dari yang sudah terpakai
    if (body.total_plafon !== undefined) {
      const balance = await this.fund.getRoBalance(id);
      if (body.total_plafon < balance.total_terpakai) {
        throw new BadRequestException(
          `Total plafon baru (Rp ${body.total_plafon.toLocaleString('id-ID')}) ` +
            `tidak boleh kurang dari total terpakai (Rp ${balance.total_terpakai.toLocaleString('id-ID')})`,
        );
      }
    }

    const ro = await this.prisma.ro.update({
      where: { id },
      data: {
        ...(body.nama_ro !== undefined && { nama_ro: body.nama_ro }),
        ...(body.total_plafon !== undefined && {
          total_plafon: body.total_plafon,
        }),
        ...((body as any).no_kontrak !== undefined && {
          no_kontrak: (body as any).no_kontrak,
        }),
        ...((body as any).pj !== undefined && { pj: (body as any).pj }),
        ...((body as any).no_sk !== undefined && {
          no_sk: (body as any).no_sk,
        }),
        ...((body as any).mulai_sk !== undefined && {
          mulai_sk: (body as any).mulai_sk
            ? new Date((body as any).mulai_sk)
            : null,
        }),
        ...((body as any).berakhir_sk !== undefined && {
          berakhir_sk: (body as any).berakhir_sk
            ? new Date((body as any).berakhir_sk)
            : null,
        }),
        ...((body as any).status_ro !== undefined && {
          status_ro: (body as any).status_ro,
        }),
      },
      include: {
        proyek: { select: { id: true, nama_proyek: true } },
        unit_koordinator: { select: { id: true, nama_unit: true } },
      },
    });

    await this.audit.log({
      tabel: 'ro',
      recordId: id,
      aksi: AksiAudit.UPDATE,
      dilakukanOleh: user.sub,
      dataSebelum: existing,
      dataSesudah: ro,
    });

    const balance = await this.fund.getRoBalance(id);
    return ok(
      'Berhasil mengupdate RO',
      this.mapItem(ro, balance.total_terpakai),
    );
  }

  @Delete(':id')
  @ApiRoles('Hapus RO', [Role.Superadmin])
  @ApiStandartResponseDelete()
  async remove(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    const existing = await this.prisma.ro.findUnique({
      where: { id },
      include: { _count: { select: { alokasi_list: true } } },
    });
    if (!existing) throw new NotFoundException('RO tidak ditemukan');

    if (existing._count.alokasi_list > 0) {
      throw new BadRequestException(
        'RO sudah memiliki alokasi gaji TA. RO tidak dapat dihapus.',
      );
    }

    await this.prisma.ro.delete({ where: { id } });

    await this.audit.log({
      tabel: 'ro',
      recordId: id,
      aksi: AksiAudit.DELETE,
      dilakukanOleh: user.sub,
      dataSebelum: existing,
    });

    return deleted('Berhasil menghapus RO');
  }

  private mapItem(ro: any, totalTerpakai: number): RoItemDto {
    return {
      id: ro.id,
      kode_ro: ro.kode_ro,
      nama_ro: ro.nama_ro,
      tahun_fiscal: ro.tahun_fiscal,
      total_plafon: ro.total_plafon,
      total_terpakai: totalTerpakai,
      sisa_saldo: ro.total_plafon - totalTerpakai,
      id_proyek: ro.proyek?.id ?? null,
      nama_proyek: ro.proyek?.nama_proyek ?? null,
      id_unit_koordinator: ro.unit_koordinator?.id ?? null,
      nama_unit_koordinator: ro.unit_koordinator?.nama_unit ?? null,
      no_kontrak: ro.no_kontrak ?? null,
      pj: ro.pj ?? null,
      file_rab: ro.file_rab ?? null,
      status_ro: ro.status_ro ?? 'AKTIF',
      no_sk: ro.no_sk ?? null,
      mulai_sk: ro.mulai_sk ?? null,
      berakhir_sk: ro.berakhir_sk ?? null,
      created_at: ro.created_at,
      updated_at: ro.updated_at,
    } as any;
  }
}
