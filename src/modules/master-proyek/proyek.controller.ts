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
import { FundDistributionService } from '../../common/services/fund-distribution.service.js';
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
    private readonly fundDistribution: FundDistributionService,
  ) {}

  @Get()
  @ApiRoles('Get daftar proyek', [
    Role.Superadmin,
    Role.Koordinator,
    Role.Keuangan,
  ])
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
      sumber_pendanaan: (p as any).sumber_pendanaan ?? null,
      nilai_kontrak: (p as any).nilai_kontrak ?? 0,
      total_direct_cost: (p as any).total_direct_cost ?? 0,
      total_margin: (p as any).total_margin ?? 0,
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
  @ApiRoles('Get detail proyek', [
    Role.Superadmin,
    Role.Koordinator,
    Role.Keuangan,
  ])
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
      sumber_pendanaan: (proyek as any).sumber_pendanaan ?? null,
      nilai_kontrak: (proyek as any).nilai_kontrak ?? 0,
      total_direct_cost: (proyek as any).total_direct_cost ?? 0,
      total_margin: (proyek as any).total_margin ?? 0,
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

    const totalMargin = body.total_margin ?? 0;
    const nilaiKontrak = body.nilai_kontrak ?? 0;
    const directCost = body.total_direct_cost ?? 0;

    if (nilaiKontrak !== directCost + totalMargin) {
      throw new BadRequestException(
        `Nilai kontrak (Rp ${nilaiKontrak.toLocaleString('id-ID')}) harus sama dengan Total Direct Cost (Rp ${directCost.toLocaleString('id-ID')}) + Total Margin (Rp ${totalMargin.toLocaleString('id-ID')}) = Rp ${(directCost + totalMargin).toLocaleString('id-ID')}`,
      );
    }

    const roList = (body as any).ro_list as
      | Array<{
          nama_ro: string;
          kode_ro?: string;
          id_unit_koordinator: string;
          rekening_id?: string;
          plafon: number;
        }>
      | undefined;
    if (roList && roList.length > 0) {
      const sumPlafon = roList.reduce((s, r) => s + Number(r.plafon ?? 0), 0);
      if (sumPlafon !== directCost) {
        throw new BadRequestException(
          `Total plafon RO (Rp ${sumPlafon.toLocaleString('id-ID')}) harus sama dengan Total Direct Cost (Rp ${directCost.toLocaleString('id-ID')})`,
        );
      }
      // validate units exist and are KOORDINATOR
      const unitIds = [...new Set(roList.map((r) => r.id_unit_koordinator))];
      const units = await this.prisma.unitKerja.findMany({
        where: { id: { in: unitIds } },
        select: { id: true, tipe_unit: true },
      });
      const unitMap = new Map(units.map((u) => [u.id, u.tipe_unit]));
      for (const r of roList) {
        if (!unitMap.has(r.id_unit_koordinator)) {
          throw new BadRequestException(
            `Unit koordinator ${r.id_unit_koordinator} tidak ditemukan`,
          );
        }
        if (unitMap.get(r.id_unit_koordinator) !== 'KOORDINATOR') {
          throw new BadRequestException(
            'Unit koordinator harus bertipe KOORDINATOR',
          );
        }
      }
      // validate kode_ro uniqueness if provided
      const kodeRos = roList.map((r) => r.kode_ro).filter(Boolean) as string[];
      if (kodeRos.length > 0) {
        const dup = kodeRos.filter((v, i, a) => a.indexOf(v) !== i);
        if (dup.length > 0)
          throw new BadRequestException(
            `Kode RO duplikat di input: ${dup.join(', ')}`,
          );
        const existingKode = await this.prisma.ro.findMany({
          where: { kode_ro: { in: kodeRos } },
          select: { kode_ro: true },
        });
        if (existingKode.length > 0) {
          throw new BadRequestException(
            `Kode RO sudah terdaftar: ${existingKode.map((r) => r.kode_ro).join(', ')}`,
          );
        }
      }
    }

    // Atomic: INSERT Proyek + bulk RO + distribute margin via PengaturanMargin
    const proyek = await this.prisma.$transaction(async (tx) => {
      const created = await tx.proyek.create({
        data: {
          kode_proyek: body.kode_proyek,
          nama_proyek: body.nama_proyek,
          tahun_fiscal: body.tahun_fiscal,
          sumber_pendanaan: body.sumber_pendanaan ?? null,
          nilai_kontrak: nilaiKontrak,
          total_direct_cost: directCost,
          total_margin: totalMargin,
        } as any,
      });
      if (roList && roList.length > 0) {
        for (let i = 0; i < roList.length; i++) {
          const r = roList[i];
          const kodeRo =
            r.kode_ro?.trim() ||
            `${body.kode_proyek}-RO-${String(i + 1).padStart(2, '0')}`;
          await tx.ro.create({
            data: {
              kode_ro: kodeRo,
              nama_ro: r.nama_ro,
              proyek_id: created.id,
              unit_koordinator_id: r.id_unit_koordinator,
              rekening_id: r.rekening_id ?? null,
              tahun_fiscal: body.tahun_fiscal,
              total_plafon: r.plafon,
            } as any,
          });
        }
      }
      if (totalMargin > 0) {
        await this.fundDistribution.distributeMargin(
          created.id,
          body.tahun_fiscal,
          totalMargin,
          user.sub,
          tx as any,
        );
      }
      return created;
    });

    await this.audit.log({
      tabel: 'proyek',
      recordId: proyek.id,
      aksi: AksiAudit.CREATE,
      dilakukanOleh: user.sub,
      dataSesudah: proyek as any,
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

    const nextNilai =
      body.nilai_kontrak ?? (existing as any).nilai_kontrak ?? 0;
    const nextDirect =
      body.total_direct_cost ?? (existing as any).total_direct_cost ?? 0;
    const nextMargin = body.total_margin ?? (existing as any).total_margin ?? 0;
    if (nextNilai !== nextDirect + nextMargin) {
      throw new BadRequestException(
        `Nilai kontrak (Rp ${nextNilai.toLocaleString('id-ID')}) harus sama dengan Total Direct Cost (Rp ${nextDirect.toLocaleString('id-ID')}) + Total Margin (Rp ${nextMargin.toLocaleString('id-ID')}) = Rp ${(nextDirect + nextMargin).toLocaleString('id-ID')}`,
      );
    }
    // Adendum: if margin increased, distribute delta
    const oldMargin = (existing as any).total_margin ?? 0;
    const deltaMargin = nextMargin - oldMargin;
    if (deltaMargin < 0) {
      throw new BadRequestException(
        'Total margin tidak boleh dikurangi (hanya adendum penambahan yang didukung)',
      );
    }

    const proyek = await this.prisma.$transaction(async (tx) => {
      const updated = await tx.proyek.update({
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
          ...(body.nilai_kontrak !== undefined && {
            nilai_kontrak: body.nilai_kontrak,
          }),
          ...(body.total_direct_cost !== undefined && {
            total_direct_cost: body.total_direct_cost,
          }),
          ...(body.total_margin !== undefined && {
            total_margin: body.total_margin,
          }),
        } as any,
      });
      if (deltaMargin > 0) {
        await this.fundDistribution.distributeMargin(
          id,
          (body.tahun_fiscal ?? (existing as any).tahun_fiscal) as number,
          deltaMargin,
          user.sub,
          tx as any,
        );
      }
      return updated;
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

  @Get(':id/distribusi')
  @ApiRoles('Get distribusi margin proyek', [
    Role.Superadmin,
    Role.Koordinator,
    Role.Keuangan,
  ])
  async getDistribusi(@Param('id', ParseUUIDPipe) id: string) {
    const proyek = await this.prisma.proyek.findUnique({ where: { id } });
    if (!proyek) throw new NotFoundException('Proyek tidak ditemukan');
    const list = await this.prisma.danaTransaksi.findMany({
      where: { proyek_id: id },
      include: {
        dana: {
          select: { id: true, kategori_kamar: true, unit_koordinator_id: true },
        },
        proyek: { select: { id: true, kode_proyek: true, nama_proyek: true } },
      },
      orderBy: [{ tanggal: 'asc' }, { created_at: 'asc' }],
    });
    // enrich with unit name
    const unitIds = [
      ...new Set(
        list.map((r: any) => r.dana?.unit_koordinator_id).filter(Boolean),
      ),
    ];
    const units = unitIds.length
      ? await this.prisma.unitKerja.findMany({
          where: { id: { in: unitIds } },
          select: { id: true, nama_unit: true, kode_unit: true },
        })
      : [];
    const unitMap = new Map(units.map((u) => [u.id, u]));
    const enriched = list.map((r: any) => ({
      ...r,
      dana_kategori: r.dana?.kategori_kamar ?? null,
      unit: r.dana?.unit_koordinator_id
        ? (unitMap.get(r.dana.unit_koordinator_id) ?? null)
        : null,
    }));
    return ok('Berhasil mengambil distribusi margin proyek', enriched);
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
