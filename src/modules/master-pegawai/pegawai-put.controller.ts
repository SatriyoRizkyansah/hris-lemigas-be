import {
  Body,
  ConflictException,
  Controller,
  NotFoundException,
  Param,
  ParseUUIDPipe,
  Put,
  UseGuards,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { PrismaService } from '../../prisma.module.js';
import { ApiStandartResponse } from '../../other/scheme_standar.js';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard.js';
import { RolesGuard } from '../../common/guards/roles.guard.js';
import { ApiRoles } from '../../common/decorators/api-roles.decorator.js';
import { CurrentUser } from '../../auth/user.decorator.js';
import type { JwtPayload } from '../../auth/user.decorator.js';
import { Role } from '../../common/enums/role.enum.js';
import { AuditService } from '../../common/services/audit.service.js';
import { AksiAudit } from '../../common/enums/hris.enum.js';
import { ok } from '../../common/utils/response.util.js';
import { UpdatePegawaiDto, PegawaiItemDto } from './pegawai.dto.js';

@ApiTags('Master - Pegawai')
@Controller('/api/pegawai')
@UseGuards(JwtAuthGuard, RolesGuard)
export class PegawaiPutController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  @Put(':id')
  @ApiRoles('Update pegawai', [Role.Superadmin])
  @ApiStandartResponse(PegawaiItemDto)
  async update(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: UpdatePegawaiDto,
  ) {
    const existing = await this.prisma.pegawai.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException('Pegawai tidak ditemukan');
    }

    if (body.email && body.email !== existing.email) {
      const emailExists = await this.prisma.pegawai.findUnique({
        where: { email: body.email },
      });
      if (emailExists) {
        throw new ConflictException(`Email ${body.email} sudah terdaftar`);
      }
    }

    const updated = await this.prisma.pegawai.update({
      where: { id },
      data: {
        ...(body.nama !== undefined && { nama: body.nama }),
        ...(body.tipe_pegawai !== undefined && {
          tipe_pegawai: body.tipe_pegawai,
        }),
        ...(body.jabatan !== undefined && { jabatan: body.jabatan }),
        ...(body.email !== undefined && { email: body.email }),
        ...(body.telepon !== undefined && { telepon: body.telepon }),
        ...(body.status_aktif !== undefined && {
          status_aktif: body.status_aktif,
        }),
        ...(body.bidang_keahlian !== undefined && {
          bidang_keahlian: body.bidang_keahlian,
        }),
        ...(body.kontrak_mulai !== undefined && {
          kontrak_mulai: body.kontrak_mulai
            ? new Date(body.kontrak_mulai)
            : null,
        }),
        ...(body.kontrak_selesai !== undefined && {
          kontrak_selesai: body.kontrak_selesai
            ? new Date(body.kontrak_selesai)
            : null,
        }),
        ...(body.gaji_bulanan !== undefined && {
          gaji_bulanan: body.gaji_bulanan,
        }),
        ...(body.id_unit_kerja !== undefined && {
          unit_kerja_id: body.id_unit_kerja,
        }),
      },
    });

    await this.audit.log({
      tabel: 'pegawai',
      recordId: id,
      aksi: AksiAudit.UPDATE,
      dilakukanOleh: user.sub,
      dataSebelum: existing,
      dataSesudah: updated,
    });

    return ok('Berhasil mengupdate pegawai', updated);
  }
}
