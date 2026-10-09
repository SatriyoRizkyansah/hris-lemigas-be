import {
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
      },
      orderBy: { kategori_kamar: 'asc' },
    });
    const data = items.map((i) => ({
      id: i.id,
      kategori_kamar: i.kategori_kamar,
      nama_kamar: i.nama_kamar,
      persentase: i.persentase,
      unit_kerja_id: i.unit_kerja_id,
      nama_unit: (i as any).unit_kerja?.nama_unit ?? null,
      kode_unit: (i as any).unit_kerja?.kode_unit ?? null,
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
    if (!existing) throw new Error('Pengaturan margin tidak ditemukan');
    const updated = await this.prisma.pengaturanMargin.update({
      where: { id },
      data: {
        ...(body.nama_kamar !== undefined && { nama_kamar: body.nama_kamar }),
        ...(body.persentase !== undefined && { persentase: body.persentase }),
        ...(body.unit_kerja_id !== undefined && {
          unit_kerja_id: body.unit_kerja_id,
        }),
      },
    });
    return ok('Berhasil mengupdate pengaturan margin', updated);
  }
}
