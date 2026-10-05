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
import {
  ok,
  created,
  deleted,
  paginated,
} from '../../common/utils/response.util.js';
import {
  ProyekQueryDto,
  CreateProyekDto,
  UpdateProyekDto,
  ProyekItemDto,
} from './proyek.dto.js';

@ApiTags('Master - Proyek')
@Controller('/api/proyek')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ProyekController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  @Get()
  @ApiRoles('Get daftar proyek', [Role.Superadmin, Role.Koordinator])
  @ApiStandartResponseArrayWithPagination(ProyekItemDto)
  async getData(@Query() query: ProyekQueryDto) {
    const where: Record<string, unknown> = {};
    if (query.tahun_fiscal) where.tahun_fiscal = query.tahun_fiscal;
    if (query.query) {
      where.OR = [
        { nama_proyek: { contains: query.query, mode: 'insensitive' } },
        { kode_proyek: { contains: query.query, mode: 'insensitive' } },
      ];
    }

    const [proyeks, total] = await Promise.all([
      this.prisma.proyek.findMany({
        where,
        include: {
          _count: { select: { ro_list: true } },
          ro_list: { select: { total_plafon: true } },
        },
        orderBy: [{ tahun_fiscal: 'desc' }, { nama_proyek: 'asc' }],
        skip: (query.page - 1) * query.limit,
        take: query.limit,
      }),
      this.prisma.proyek.count({ where }),
    ]);

    const data: ProyekItemDto[] = proyeks.map((p) => ({
      id: p.id,
      kode_proyek: p.kode_proyek,
      nama_proyek: p.nama_proyek,
      tahun_fiscal: p.tahun_fiscal,
      sumber_pendanaan: p.sumber_pendanaan ?? null,
      jumlah_ro: p._count.ro_list,
      total_plafon_ro: p.ro_list.reduce((acc, ro) => acc + ro.total_plafon, 0),
      created_at: p.created_at,
      updated_at: p.updated_at,
    }));

    return paginated(
      'Berhasil mengambil data proyek',
      data,
      query.page,
      query.limit,
      total,
    );
  }

  @Get(':id')
  @ApiRoles('Get detail proyek', [Role.Superadmin, Role.Koordinator])
  @ApiStandartResponse(ProyekItemDto)
  async getDetail(@Param('id', ParseUUIDPipe) id: string) {
    const proyek = await this.prisma.proyek.findUnique({
      where: { id },
      include: {
        _count: { select: { ro_list: true } },
        ro_list: { select: { total_plafon: true } },
      },
    });
    if (!proyek) throw new NotFoundException('Proyek tidak ditemukan');

    return ok('Berhasil mengambil detail proyek', {
      id: proyek.id,
      kode_proyek: proyek.kode_proyek,
      nama_proyek: proyek.nama_proyek,
      tahun_fiscal: proyek.tahun_fiscal,
      sumber_pendanaan: proyek.sumber_pendanaan ?? null,
      jumlah_ro: proyek._count.ro_list,
      total_plafon_ro: proyek.ro_list.reduce(
        (acc, ro) => acc + ro.total_plafon,
        0,
      ),
      created_at: proyek.created_at,
      updated_at: proyek.updated_at,
    });
  }

  @Post()
  @ApiRoles('Tambah proyek', [Role.Superadmin])
  @ApiStandartResponseCreate(ProyekItemDto)
  async create(@CurrentUser() user: JwtPayload, @Body() body: CreateProyekDto) {
    const exists = await this.prisma.proyek.findUnique({
      where: { kode_proyek: body.kode_proyek },
    });
    if (exists) {
      throw new ConflictException(
        `Kode proyek ${body.kode_proyek} sudah terdaftar`,
      );
    }

    const proyek = await this.prisma.proyek.create({
      data: {
        kode_proyek: body.kode_proyek,
        nama_proyek: body.nama_proyek,
        tahun_fiscal: body.tahun_fiscal,
        sumber_pendanaan: body.sumber_pendanaan ?? null,
      },
    });

    await this.audit.log({
      tabel: 'proyek',
      recordId: proyek.id,
      aksi: AksiAudit.CREATE,
      dilakukanOleh: user.sub,
      dataSesudah: proyek,
    });

    return created('Berhasil menambahkan proyek', proyek);
  }

  @Put(':id')
  @ApiRoles('Update proyek', [Role.Superadmin])
  @ApiStandartResponse(ProyekItemDto)
  async update(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: UpdateProyekDto,
  ) {
    const existing = await this.prisma.proyek.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Proyek tidak ditemukan');

    const proyek = await this.prisma.proyek.update({
      where: { id },
      data: {
        ...(body.nama_proyek !== undefined && {
          nama_proyek: body.nama_proyek,
        }),
        ...(body.tahun_fiscal !== undefined && {
          tahun_fiscal: body.tahun_fiscal,
        }),
        ...(body.sumber_pendanaan !== undefined && {
          sumber_pendanaan: body.sumber_pendanaan,
        }),
      },
    });

    await this.audit.log({
      tabel: 'proyek',
      recordId: id,
      aksi: AksiAudit.UPDATE,
      dilakukanOleh: user.sub,
      dataSebelum: existing,
      dataSesudah: proyek,
    });

    return ok('Berhasil mengupdate proyek', proyek);
  }

  @Delete(':id')
  @ApiRoles('Hapus proyek', [Role.Superadmin])
  @ApiStandartResponseDelete()
  async remove(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    const existing = await this.prisma.proyek.findUnique({
      where: { id },
      include: { _count: { select: { ro_list: true } } },
    });
    if (!existing) throw new NotFoundException('Proyek tidak ditemukan');

    if (existing._count.ro_list > 0) {
      throw new BadRequestException(
        'Proyek masih memiliki RO terkait. Hapus RO terlebih dahulu.',
      );
    }

    await this.prisma.proyek.delete({ where: { id } });

    await this.audit.log({
      tabel: 'proyek',
      recordId: id,
      aksi: AksiAudit.DELETE,
      dilakukanOleh: user.sub,
      dataSebelum: existing,
    });

    return deleted('Berhasil menghapus proyek');
  }
}
