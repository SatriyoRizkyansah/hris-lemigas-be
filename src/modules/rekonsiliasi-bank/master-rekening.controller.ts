import {
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
  UseGuards,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma.module.js';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard.js';
import { RolesGuard } from '../../common/guards/roles.guard.js';
import { ApiRoles } from '../../common/decorators/api-roles.decorator.js';
import { Role } from '../../common/enums/role.enum.js';
import { CurrentUser } from '../../auth/user.decorator.js';
import type { JwtPayload } from '../../auth/user.decorator.js';
import { AuditService } from '../../common/services/audit.service.js';
import { AksiAudit } from '../../common/enums/hris.enum.js';
import { created, deleted, ok } from '../../common/utils/response.util.js';
import {
  CreateMasterRekeningDto,
  UpdateMasterRekeningDto,
} from './rekonsiliasi-bank.dto.js';

@ApiTags('Master - Rekening Bank')
@Controller('/api/master-rekening')
@UseGuards(JwtAuthGuard, RolesGuard)
export class MasterRekeningController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  @Get()
  @ApiRoles('Get daftar rekening bank', [Role.Superadmin, Role.Keuangan])
  async findAll() {
    const data = await this.prisma.masterRekening.findMany({
      orderBy: [
        { status_aktif: 'asc' },
        { nama_bank: 'asc' },
        { nama_rekening: 'asc' },
      ],
    });
    return ok('Berhasil mengambil data rekening', data);
  }

  @Get(':id')
  @ApiRoles('Get detail rekening bank', [Role.Superadmin, Role.Keuangan])
  async findOne(@Param('id', ParseUUIDPipe) id: string) {
    const data = await this.prisma.masterRekening.findUnique({ where: { id } });
    if (!data) throw new NotFoundException('Rekening tidak ditemukan');
    return ok('Berhasil mengambil detail rekening', data);
  }

  @Post()
  @ApiRoles('Buat rekening bank', [Role.Superadmin, Role.Keuangan])
  async create(
    @Body() dto: CreateMasterRekeningDto,
    @CurrentUser() user: JwtPayload,
  ) {
    try {
      const data = await this.prisma.masterRekening.create({ data: dto });
      await this.audit.log({
        tabel: 'master_rekening',
        recordId: data.id,
        aksi: AksiAudit.CREATE,
        dilakukanOleh: user.sub,
        dataSesudah: data,
      });
      return created('Rekening berhasil dibuat', data);
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException('Nomor rekening sudah terdaftar');
      }
      throw error;
    }
  }

  @Put(':id')
  @ApiRoles('Ubah rekening bank', [Role.Superadmin, Role.Keuangan])
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateMasterRekeningDto,
    @CurrentUser() user: JwtPayload,
  ) {
    const before = await this.prisma.masterRekening.findUnique({
      where: { id },
    });
    if (!before) throw new NotFoundException('Rekening tidak ditemukan');
    const { status_aktif, ...rekeningData } = dto;
    try {
      const data = await this.prisma.masterRekening.update({
        where: { id },
        data: {
          ...rekeningData,
          ...(status_aktif === undefined
            ? {}
            : { status_aktif: status_aktif ? 'AKTIF' : 'NONAKTIF' }),
        },
      });
      await this.audit.log({
        tabel: 'master_rekening',
        recordId: id,
        aksi: AksiAudit.UPDATE,
        dilakukanOleh: user.sub,
        dataSebelum: before,
        dataSesudah: data,
      });
      return ok('Rekening berhasil diperbarui', data);
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException('Nomor rekening sudah terdaftar');
      }
      throw error;
    }
  }

  @Delete(':id')
  @ApiRoles('Hapus rekening bank', [Role.Superadmin])
  async remove(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: JwtPayload,
  ) {
    const data = await this.prisma.masterRekening.findUnique({ where: { id } });
    if (!data) throw new NotFoundException('Rekening tidak ditemukan');
    const [rekonsiliasiCount, roCount, danaOperasionalCount] =
      await Promise.all([
        this.prisma.rekonsiliasiBank.count({ where: { rekening_id: id } }),
        this.prisma.ro.count({ where: { rekening_id: id } }),
        this.prisma.danaOperasional.count({ where: { rekening_id: id } }),
      ]);
    if (rekonsiliasiCount || roCount || danaOperasionalCount) {
      throw new ConflictException(
        'Rekening masih dipakai riwayat rekonsiliasi atau sumber dana dan tidak dapat dihapus',
      );
    }
    await this.prisma.masterRekening.delete({ where: { id } });
    await this.audit.log({
      tabel: 'master_rekening',
      recordId: id,
      aksi: AksiAudit.DELETE,
      dilakukanOleh: user.sub,
      dataSebelum: data,
    });
    return deleted('Rekening berhasil dihapus');
  }
}
