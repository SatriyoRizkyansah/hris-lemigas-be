import {
  Body,
  Controller,
  Delete,
  Get,
  HttpStatus,
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
import { CurrentUser } from '../../auth/user.decorator.js';
import type { JwtPayload } from '../../auth/user.decorator.js';
import { Role } from '../../common/enums/role.enum.js';
import { UnitScopeService } from '../../common/services/unit-scope.service.js';
import { ok } from '../../common/utils/response.util.js';
import { CreatePenempatanDto, UpdatePenempatanDto } from './pegawai.dto.js';

@ApiTags('Master - Pegawai Penempatan')
@Controller('/api/pegawai')
@UseGuards(JwtAuthGuard, RolesGuard)
export class PegawaiPenempatanController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly unitScope: UnitScopeService,
  ) {}

  private async assertScope(
    user: JwtPayload,
    unitKerjaId: string,
  ): Promise<boolean> {
    if (user.role === Role.Superadmin) return true;
    if (!user.unitKerjaId) return false;
    return this.unitScope.isUnitInScope(unitKerjaId, user.unitKerjaId);
  }

  @Get(':id/penempatan')
  @ApiRoles('Get riwayat penempatan pegawai', [
    Role.Superadmin,
    Role.Koordinator,
  ])
  async getPenempatan(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    const pegawai = await this.prisma.pegawai.findUnique({ where: { id } });
    if (!pegawai)
      return {
        status: HttpStatus.NOT_FOUND,
        message: 'Pegawai tidak ditemukan',
        data: null,
      };

    // scope check via homebase
    if (user.role === Role.Koordinator && user.unitKerjaId) {
      const hb = await this.prisma.penempatanPegawai.findFirst({
        where: { pegawai_id: id, is_homebase: true, status_aktif: 'AKTIF' },
      });
      if (!hb || !(await this.assertScope(user, hb.unit_kerja_id))) {
        return {
          status: HttpStatus.FORBIDDEN,
          message: 'Tidak ada akses',
          data: null,
        };
      }
    }

    const list = await this.prisma.penempatanPegawai.findMany({
      where: { pegawai_id: id },
      include: {
        unit_kerja: {
          select: {
            id: true,
            kode_unit: true,
            nama_unit: true,
            tipe_unit: true,
            parent_unit_id: true,
          },
        },
      },
      orderBy: { tmt: 'desc' },
    });
    return ok('Berhasil mengambil riwayat penempatan', list);
  }

  @Post(':id/penempatan')
  @ApiRoles('Tambah penempatan pegawai', [Role.Superadmin, Role.Koordinator])
  async createPenempatan(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CreatePenempatanDto,
  ) {
    const pegawai = await this.prisma.pegawai.findUnique({ where: { id } });
    if (!pegawai)
      return {
        status: HttpStatus.NOT_FOUND,
        message: 'Pegawai tidak ditemukan',
        data: null,
      };

    if (!(await this.assertScope(user, dto.unit_kerja_id))) {
      return {
        status: HttpStatus.FORBIDDEN,
        message: 'Tidak ada akses ke unit tersebut',
        data: null,
      };
    }

    // if is_homebase true, deactivate old homebase
    if (dto.is_homebase !== false) {
      await this.prisma.penempatanPegawai.updateMany({
        where: { pegawai_id: id, is_homebase: true, status_aktif: 'AKTIF' },
        data: {
          is_homebase: false,
          status_aktif: 'NONAKTIF',
          tanggal_selesai: new Date(),
        },
      });
    }

    const created = await this.prisma.penempatanPegawai.create({
      data: {
        pegawai_id: id,
        unit_kerja_id: dto.unit_kerja_id,
        jabatan: dto.jabatan ?? pegawai.jabatan ?? null,
        tmt: new Date(dto.tmt),
        tanggal_selesai: dto.tanggal_selesai
          ? new Date(dto.tanggal_selesai)
          : null,
        no_sk: dto.no_sk ?? null,
        keterangan: dto.keterangan ?? null,
        is_homebase: dto.is_homebase !== false,
        status_aktif: 'AKTIF',
      },
      include: { unit_kerja: true },
    });

    if (dto.jabatan) {
      await this.prisma.pegawai.update({
        where: { id },
        data: { jabatan: dto.jabatan },
      });
    }

    return ok('Penempatan berhasil ditambahkan', created);
  }

  @Put('penempatan/:penempatanId')
  @ApiRoles('Update penempatan pegawai', [Role.Superadmin, Role.Koordinator])
  async updatePenempatan(
    @CurrentUser() user: JwtPayload,
    @Param('penempatanId', ParseUUIDPipe) penempatanId: string,
    @Body() dto: UpdatePenempatanDto,
  ) {
    const existing = await this.prisma.penempatanPegawai.findUnique({
      where: { id: penempatanId },
    });
    if (!existing)
      return {
        status: HttpStatus.NOT_FOUND,
        message: 'Penempatan tidak ditemukan',
        data: null,
      };

    const targetUnit = dto.unit_kerja_id ?? existing.unit_kerja_id;
    if (!(await this.assertScope(user, targetUnit))) {
      return {
        status: HttpStatus.FORBIDDEN,
        message: 'Tidak ada akses ke unit tersebut',
        data: null,
      };
    }

    // handle homebase switch
    if (dto.is_homebase === true && !existing.is_homebase) {
      await this.prisma.penempatanPegawai.updateMany({
        where: {
          pegawai_id: existing.pegawai_id,
          is_homebase: true,
          status_aktif: 'AKTIF',
        },
        data: {
          is_homebase: false,
          status_aktif: 'NONAKTIF',
          tanggal_selesai: new Date(),
        },
      });
    }

    const updated = await this.prisma.penempatanPegawai.update({
      where: { id: penempatanId },
      data: {
        unit_kerja_id: dto.unit_kerja_id ?? undefined,
        jabatan: dto.jabatan ?? undefined,
        tmt: dto.tmt ? new Date(dto.tmt) : undefined,
        tanggal_selesai: dto.tanggal_selesai
          ? new Date(dto.tanggal_selesai)
          : dto.tanggal_selesai === null
            ? null
            : undefined,
        no_sk: dto.no_sk ?? undefined,
        keterangan: dto.keterangan ?? undefined,
        status_aktif: dto.status_aktif ?? undefined,
        is_homebase: dto.is_homebase ?? undefined,
      } as any,
      include: { unit_kerja: true },
    });

    return ok('Penempatan berhasil diperbarui', updated);
  }

  @Delete('penempatan/:penempatanId')
  @ApiRoles('Hapus penempatan pegawai', [Role.Superadmin])
  async deletePenempatan(
    @Param('penempatanId', ParseUUIDPipe) penempatanId: string,
  ) {
    const existing = await this.prisma.penempatanPegawai.findUnique({
      where: { id: penempatanId },
    });
    if (!existing)
      return {
        status: HttpStatus.NOT_FOUND,
        message: 'Penempatan tidak ditemukan',
        data: null,
      };

    // prevent delete if only one homebase left
    const count = await this.prisma.penempatanPegawai.count({
      where: { pegawai_id: existing.pegawai_id },
    });
    if (count <= 1) {
      return {
        status: HttpStatus.BAD_REQUEST,
        message: 'Tidak bisa hapus penempatan terakhir',
        data: null,
      };
    }

    await this.prisma.penempatanPegawai.delete({ where: { id: penempatanId } });
    return ok('Penempatan berhasil dihapus', null);
  }
}
