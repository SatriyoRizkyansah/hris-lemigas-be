import {
  BadRequestException,
  Body,
  ConflictException,
  Controller,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { PrismaService } from '../../prisma.module.js';
import { ApiStandartResponseCreate } from '../../other/scheme_standar.js';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard.js';
import { RolesGuard } from '../../common/guards/roles.guard.js';
import { ApiRoles } from '../../common/decorators/api-roles.decorator.js';
import { CurrentUser } from '../../auth/user.decorator.js';
import type { JwtPayload } from '../../auth/user.decorator.js';
import { Role } from '../../common/enums/role.enum.js';
import { AuditService } from '../../common/services/audit.service.js';
import { AksiAudit, TipeUnit } from '../../common/enums/hris.enum.js';
import { created } from '../../common/utils/response.util.js';
import { CreateUnitKerjaDto, UnitKerjaItemDto } from './unit-kerja.dto.js';

@ApiTags('Master - Unit Kerja')
@Controller('/api/unit-kerja')
@UseGuards(JwtAuthGuard, RolesGuard)
export class UnitKerjaPostController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  @Post()
  @ApiRoles('Tambah unit kerja', [Role.Superadmin])
  @ApiStandartResponseCreate(UnitKerjaItemDto)
  async create(
    @CurrentUser() user: JwtPayload,
    @Body() body: CreateUnitKerjaDto,
  ) {
    const exists = await this.prisma.unitKerja.findUnique({
      where: { kode_unit: body.kode_unit },
    });
    if (exists) {
      throw new ConflictException(
        `Kode unit ${body.kode_unit} sudah terdaftar`,
      );
    }

    // Validasi parent
    if (body.tipe_unit === TipeUnit.SUB_KOORDINATOR) {
      if (!body.id_parent_unit) {
        throw new BadRequestException(
          'Parent unit wajib diisi untuk tipe SUB_KOORDINATOR',
        );
      }
      const parent = await this.prisma.unitKerja.findUnique({
        where: { id: body.id_parent_unit },
      });
      if (!parent) {
        throw new BadRequestException('Parent unit tidak ditemukan');
      }
      if (parent.tipe_unit !== TipeUnit.KOORDINATOR) {
        throw new BadRequestException(
          'Parent unit harus bertipe KOORDINATOR untuk sub koordinator',
        );
      }
    } else if (body.id_parent_unit) {
      const parent = await this.prisma.unitKerja.findUnique({
        where: { id: body.id_parent_unit },
      });
      if (!parent) {
        throw new BadRequestException('Parent unit tidak ditemukan');
      }
    }

    const unit = await this.prisma.unitKerja.create({
      data: {
        kode_unit: body.kode_unit,
        nama_unit: body.nama_unit,
        tipe_unit: body.tipe_unit,
        parent_unit_id: body.id_parent_unit ?? null,
        kepala_unit_id: body.id_kepala_unit ?? null,
        deskripsi: body.deskripsi ?? null,
      },
    });

    await this.audit.log({
      tabel: 'unit_kerja',
      recordId: unit.id,
      aksi: AksiAudit.CREATE,
      dilakukanOleh: user.sub,
      dataSesudah: unit,
    });

    return created('Berhasil menambahkan unit kerja', {
      id: unit.id,
      kode_unit: unit.kode_unit,
      nama_unit: unit.nama_unit,
      tipe_unit: unit.tipe_unit,
      parent_unit_id: unit.parent_unit_id ?? null,
      id_kepala_unit: unit.kepala_unit_id ?? null,
      deskripsi: unit.deskripsi ?? null,
      status_aktif: unit.status_aktif,
    });
  }
}
