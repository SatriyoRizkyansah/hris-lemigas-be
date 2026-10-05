import {
  BadRequestException,
  Body,
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
import { UnitScopeService } from '../../common/services/unit-scope.service.js';
import { AksiAudit, TipeUnit } from '../../common/enums/hris.enum.js';
import { ok } from '../../common/utils/response.util.js';
import { UpdateUnitKerjaDto, UnitKerjaItemDto } from './unit-kerja.dto.js';

@ApiTags('Master - Unit Kerja')
@Controller('/api/unit-kerja')
@UseGuards(JwtAuthGuard, RolesGuard)
export class UnitKerjaPutController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly unitScope: UnitScopeService,
  ) {}

  @Put(':id')
  @ApiRoles('Update unit kerja', [Role.Superadmin])
  @ApiStandartResponse(UnitKerjaItemDto)
  async update(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: UpdateUnitKerjaDto,
  ) {
    const existing = await this.prisma.unitKerja.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException('Unit kerja tidak ditemukan');
    }

    // Cegah parent diri sendiri
    if (body.id_parent_unit === id) {
      throw new BadRequestException(
        'Unit tidak bisa menjadi parent dirinya sendiri',
      );
    }

    // Cek parent baru tidak menjadi anak dari unit ini (hindari cycle)
    if (body.id_parent_unit) {
      const descendants = await this.unitScope.getScopedUnitIds(id);
      if (descendants.includes(body.id_parent_unit)) {
        throw new BadRequestException(
          'Parent unit tidak boleh merupakan anak dari unit ini',
        );
      }
    }

    // Validasi tipe terhadap parent
    const newTipe = body.tipe_unit ?? existing.tipe_unit;
    const newParent = body.id_parent_unit ?? existing.parent_unit_id;
    if (newTipe === TipeUnit.SUB_KOORDINATOR && !newParent) {
      throw new BadRequestException(
        'Parent unit wajib diisi untuk tipe SUB_KOORDINATOR',
      );
    }

    const updated = await this.prisma.unitKerja.update({
      where: { id },
      data: {
        ...(body.nama_unit !== undefined && { nama_unit: body.nama_unit }),
        ...(body.tipe_unit !== undefined && { tipe_unit: body.tipe_unit }),
        ...(body.id_parent_unit !== undefined && {
          parent_unit_id: body.id_parent_unit,
        }),
        ...(body.id_kepala_unit !== undefined && {
          kepala_unit_id: body.id_kepala_unit,
        }),
        ...(body.deskripsi !== undefined && { deskripsi: body.deskripsi }),
        ...(body.status_aktif !== undefined && {
          status_aktif: body.status_aktif,
        }),
      },
    });

    await this.audit.log({
      tabel: 'unit_kerja',
      recordId: id,
      aksi: AksiAudit.UPDATE,
      dilakukanOleh: user.sub,
      dataSebelum: existing,
      dataSesudah: updated,
    });

    return ok('Berhasil mengupdate unit kerja', {
      id: updated.id,
      kode_unit: updated.kode_unit,
      nama_unit: updated.nama_unit,
      tipe_unit: updated.tipe_unit,
      parent_unit_id: updated.parent_unit_id ?? null,
      id_kepala_unit: updated.kepala_unit_id ?? null,
      deskripsi: updated.deskripsi ?? null,
      status_aktif: updated.status_aktif,
    });
  }
}
