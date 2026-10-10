import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Put,
  UseGuards,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { PrismaService } from '../../prisma.module.js';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard.js';
import { RolesGuard } from '../../common/guards/roles.guard.js';
import { ApiRoles } from '../../common/decorators/api-roles.decorator.js';
import { Role } from '../../common/enums/role.enum.js';
import { ok } from '../../common/utils/response.util.js';
import { UpdatePengaturanMarginDto } from './pengaturan-margin.dto.js';

@ApiTags('Master - Pengaturan Margin')
@Controller('/api/pengaturan-margin')
@UseGuards(JwtAuthGuard, RolesGuard)
export class PengaturanMarginController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  @ApiRoles('Get daftar pengaturan margin', [
    Role.Superadmin,
    Role.Koordinator,
    Role.Keuangan,
  ])
  async getData() {
    const items = await this.prisma.pengaturanMargin.findMany({
      include: {
        unit_kerja: { select: { id: true, kode_unit: true, nama_unit: true } },
        rekening: {
          select: {
            id: true,
            nama_bank: true,
            nama_rekening: true,
            nomor_rekening: true,
            status_aktif: true,
          },
        },
      },
      orderBy: { kategori_kamar: 'asc' },
    });
    const data = items.map((i) => ({
      id: i.id,
      kategori_kamar: i.kategori_kamar,
      nama_kamar: i.nama_kamar,
      persentase: i.persentase,
      unit_kerja_id: i.unit_kerja_id,
      nama_unit: i.unit_kerja?.nama_unit ?? null,
      kode_unit: i.unit_kerja?.kode_unit ?? null,
      rekening_id: i.rekening_id,
      nama_rekening: i.rekening?.nama_rekening ?? null,
      nama_bank: i.rekening?.nama_bank ?? null,
      nomor_rekening: i.rekening?.nomor_rekening ?? null,
    }));
    const total = data.reduce((s, x) => s + x.persentase, 0);
    return ok('Berhasil mengambil pengaturan margin', {
      list: data,
      total_persentase: total,
    });
  }

  @Put(':id')
  @ApiRoles('Update pengaturan margin', [Role.Superadmin])
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: UpdatePengaturanMarginDto,
  ) {
    const existing = await this.prisma.pengaturanMargin.findUnique({
      where: { id },
    });
    if (!existing)
      throw new BadRequestException('Pengaturan margin tidak ditemukan');
    if (body.rekening_id !== undefined) {
      const rekening = await this.prisma.masterRekening.findUnique({
        where: { id: body.rekening_id },
        select: { id: true, status_aktif: true },
      });
      if (!rekening || rekening.status_aktif !== 'AKTIF') {
        throw new BadRequestException(
          'Rekening harus terdaftar dan berstatus aktif',
        );
      }
      const wallets = await this.prisma.danaOperasional.findMany({
        where: {
          unit_koordinator_id: body.unit_kerja_id ?? existing.unit_kerja_id,
          kategori_kamar: existing.kategori_kamar,
          rekening_id: { not: null },
        },
        select: { rekening_id: true },
      });
      if (wallets.some((wallet) => wallet.rekening_id !== body.rekening_id)) {
        throw new BadRequestException(
          'Wallet kategori/unit ini sudah terhubung ke rekening berbeda. Samakan rekening wallet terlebih dahulu agar saldo tidak salah direkonsiliasi.',
        );
      }
    }
    const updated = await this.prisma.$transaction(async (tx) => {
      const result = await tx.pengaturanMargin.update({
        where: { id },
        data: {
          ...(body.nama_kamar !== undefined && { nama_kamar: body.nama_kamar }),
          ...(body.persentase !== undefined && { persentase: body.persentase }),
          ...(body.unit_kerja_id !== undefined && {
            unit_kerja_id: body.unit_kerja_id,
          }),
          ...(body.rekening_id !== undefined && {
            rekening_id: body.rekening_id,
          }),
        },
        include: {
          rekening: {
            select: {
              id: true,
              nama_bank: true,
              nama_rekening: true,
              nomor_rekening: true,
            },
          },
        },
      });
      if (body.rekening_id !== undefined) {
        await tx.danaOperasional.updateMany({
          where: {
            unit_koordinator_id: body.unit_kerja_id ?? existing.unit_kerja_id,
            kategori_kamar: existing.kategori_kamar,
            rekening_id: null,
          },
          data: { rekening_id: body.rekening_id },
        });
      }
      return result;
    });
    return ok('Berhasil mengupdate pengaturan margin', updated);
  }
}
