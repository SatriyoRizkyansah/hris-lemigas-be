import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Put,
  UseGuards,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { PrismaService } from '../../prisma.module.js';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard.js';
import { RolesGuard } from '../../common/guards/roles.guard.js';
import { ApiRoles } from '../../common/decorators/api-roles.decorator.js';
import { Role } from '../../common/enums/role.enum.js';
import { FundService } from '../../common/services/fund.service.js';
import { ok, created, deleted } from '../../common/utils/response.util.js';
import { CreateRoTransaksiDto, UpdateRoTransaksiDto } from './ro.dto.js';

@ApiTags('Master - RO Transaksi')
@Controller('/api/ro/:id/transaksi')
@UseGuards(JwtAuthGuard, RolesGuard)
export class RoTransaksiController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly fund: FundService,
  ) {}

  @Get()
  @ApiRoles('List transaksi RO', [
    Role.Superadmin,
    Role.Koordinator,
    Role.Keuangan,
  ])
  async list(@Param('id', ParseUUIDPipe) id: string) {
    const ledger = await this.fund.getRoLedger(id);
    return ok('Berhasil mengambil transaksi RO', ledger);
  }

  @Post()
  @ApiRoles('Tambah transaksi RO', [Role.Superadmin, Role.Koordinator])
  async create(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: CreateRoTransaksiDto,
  ) {
    const ro = await this.prisma.ro.findUnique({ where: { id } });
    if (!ro) throw new Error('RO tidak ditemukan');
    const item = await this.prisma.roTransaksi.create({
      data: {
        ro_id: id,
        nama_kegiatan: body.nama_kegiatan,
        no_kuitansi: body.no_kuitansi ?? null,
        tanggal: new Date(body.tanggal),
        debit: body.debit ?? 0,
        kredit: body.kredit ?? 0,
        keterangan: body.keterangan ?? null,
      },
    });
    return created('Berhasil menambah transaksi', item);
  }

  @Put(':tid')
  @ApiRoles('Update transaksi RO', [Role.Superadmin, Role.Koordinator])
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('tid', ParseUUIDPipe) tid: string,
    @Body() body: UpdateRoTransaksiDto,
  ) {
    const item = await this.prisma.roTransaksi.update({
      where: { id: tid },
      data: {
        ...(body.nama_kegiatan !== undefined && {
          nama_kegiatan: body.nama_kegiatan,
        }),
        ...(body.no_kuitansi !== undefined && {
          no_kuitansi: body.no_kuitansi,
        }),
        ...(body.tanggal !== undefined && { tanggal: new Date(body.tanggal) }),
        ...(body.debit !== undefined && { debit: body.debit }),
        ...(body.kredit !== undefined && { kredit: body.kredit }),
        ...(body.keterangan !== undefined && { keterangan: body.keterangan }),
      },
    });
    return ok('Berhasil mengupdate transaksi', item);
  }

  @Delete(':tid')
  @ApiRoles('Hapus transaksi RO', [Role.Superadmin, Role.Koordinator])
  async remove(@Param('tid', ParseUUIDPipe) tid: string) {
    await this.prisma.roTransaksi.delete({ where: { id: tid } });
    return deleted('Berhasil menghapus transaksi');
  }
}
