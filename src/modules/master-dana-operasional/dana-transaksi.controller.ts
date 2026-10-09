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
import {
  CreateDanaTransaksiDto,
  UpdateDanaTransaksiDto,
} from './dana-operasional.dto.js';

@ApiTags('Master - Dana Transaksi')
@Controller('/api/dana-operasional/:id/transaksi')
@UseGuards(JwtAuthGuard, RolesGuard)
export class DanaTransaksiController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly fund: FundService,
  ) {}

  @Get()
  @ApiRoles('List transaksi dana', [
    Role.Superadmin,
    Role.Koordinator,
    Role.Keuangan,
  ])
  async list(@Param('id', ParseUUIDPipe) id: string) {
    const ledger = await this.fund.getDanaLedger(id);
    return ok('Berhasil mengambil transaksi dana', ledger);
  }

  @Post()
  @ApiRoles('Tambah transaksi dana', [
    Role.Superadmin,
    Role.Koordinator,
    Role.Keuangan,
  ])
  async create(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: CreateDanaTransaksiDto,
  ) {
    const dana = await this.prisma.danaOperasional.findUnique({
      where: { id },
    });
    if (!dana) throw new Error('Dana operasional tidak ditemukan');
    const item = await this.prisma.danaTransaksi.create({
      data: {
        dana_id: id,
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
  @ApiRoles('Update transaksi dana', [
    Role.Superadmin,
    Role.Koordinator,
    Role.Keuangan,
  ])
  async update(
    @Param('tid', ParseUUIDPipe) tid: string,
    @Body() body: UpdateDanaTransaksiDto,
  ) {
    const item = await this.prisma.danaTransaksi.update({
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
  @ApiRoles('Hapus transaksi dana', [
    Role.Superadmin,
    Role.Koordinator,
    Role.Keuangan,
  ])
  async remove(@Param('tid', ParseUUIDPipe) tid: string) {
    await this.prisma.danaTransaksi.delete({ where: { id: tid } });
    return deleted('Berhasil menghapus transaksi');
  }
}
