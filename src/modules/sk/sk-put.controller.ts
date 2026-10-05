import {
  BadRequestException,
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
import { UpdateSkDto, ActivateSkDto, SkItemDto } from './sk.dto.js';

@ApiTags('SK')
@Controller('/api/sk')
@UseGuards(JwtAuthGuard, RolesGuard)
export class SkPutController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  @Put(':id')
  @ApiRoles('Update SK', [Role.Superadmin])
  @ApiStandartResponse(SkItemDto)
  async update(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: UpdateSkDto,
  ) {
    const existing = await this.prisma.sk.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('SK tidak ditemukan');

    if (body.nomor_sk && body.nomor_sk !== existing.nomor_sk) {
      const nomorExists = await this.prisma.sk.findUnique({
        where: { nomor_sk: body.nomor_sk },
      });
      if (nomorExists) {
        throw new ConflictException(
          `Nomor SK ${body.nomor_sk} sudah terdaftar`,
        );
      }
    }

    if (body.id_unit_kerja) {
      const unit = await this.prisma.unitKerja.findUnique({
        where: { id: body.id_unit_kerja },
      });
      if (!unit) throw new BadRequestException('Unit kerja tidak ditemukan');
    }

    const sk = await this.prisma.sk.update({
      where: { id },
      data: {
        ...(body.nomor_sk !== undefined && { nomor_sk: body.nomor_sk }),
        ...(body.tanggal_sk !== undefined && {
          tanggal_sk: new Date(body.tanggal_sk),
        }),
        ...(body.tanggal_efektif !== undefined && {
          tanggal_efektif: new Date(body.tanggal_efektif),
        }),
        ...(body.tanggal_selesai !== undefined && {
          tanggal_selesai: body.tanggal_selesai
            ? new Date(body.tanggal_selesai)
            : null,
        }),
        ...(body.id_unit_kerja !== undefined && {
          unit_kerja_id: body.id_unit_kerja,
        }),
        ...(body.jabatan !== undefined && { jabatan: body.jabatan }),
        ...(body.file_sk !== undefined && { file_sk: body.file_sk }),
      },
      include: {
        pegawai: { select: { id: true, nama: true, nip_nik: true } },
        unit_kerja: { select: { id: true, nama_unit: true } },
      },
    });

    await this.audit.log({
      tabel: 'sk',
      recordId: id,
      aksi: AksiAudit.UPDATE,
      dilakukanOleh: user.sub,
      dataSebelum: existing,
      dataSesudah: sk,
    });

    return ok('Berhasil mengupdate SK', this.mapItem(sk));
  }

  @Put(':id/activate')
  @ApiRoles('Aktifkan/nonaktifkan SK', [Role.Superadmin])
  @ApiStandartResponse(SkItemDto)
  async activate(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: ActivateSkDto,
  ) {
    const sk = await this.prisma.sk.findUnique({
      where: { id },
      include: {
        pegawai: { select: { id: true, nama: true, nip_nik: true } },
        unit_kerja: { select: { id: true, nama_unit: true } },
      },
    });
    if (!sk) throw new NotFoundException('SK tidak ditemukan');

    const result = await this.prisma.$transaction(async (tx) => {
      if (body.status) {
        // Nonaktifkan SK aktif lain milik pegawai yang sama
        await tx.sk.updateMany({
          where: {
            pegawai_id: sk.pegawai_id,
            id: { not: id },
            status_aktif: 'AKTIF',
          },
          data: { status_aktif: 'NONAKTIF' },
        });

        const updated = await tx.sk.update({
          where: { id },
          data: { status_aktif: 'AKTIF' },
          include: {
            pegawai: { select: { id: true, nama: true, nip_nik: true } },
            unit_kerja: { select: { id: true, nama_unit: true } },
          },
        });

        // Sinkronkan unit kerja & jabatan pegawai
        await tx.pegawai.update({
          where: { id: sk.pegawai_id },
          data: {
            unit_kerja_id: sk.unit_kerja_id,
            jabatan: sk.jabatan ?? undefined,
          },
        });

        return updated;
      }

      // Nonaktifkan SK ini saja
      return tx.sk.update({
        where: { id },
        data: { status_aktif: 'NONAKTIF' },
        include: {
          pegawai: { select: { id: true, nama: true, nip_nik: true } },
          unit_kerja: { select: { id: true, nama_unit: true } },
        },
      });
    });

    await this.audit.log({
      tabel: 'sk',
      recordId: id,
      aksi: body.status ? AksiAudit.ACTIVATE : AksiAudit.UPDATE,
      dilakukanOleh: user.sub,
      dataSebelum: { status_aktif: sk.status_aktif },
      dataSesudah: { status_aktif: result.status_aktif },
    });

    return ok(
      body.status ? 'Berhasil mengaktifkan SK' : 'Berhasil menonaktifkan SK',
      this.mapItem(result),
    );
  }

  private mapItem(sk: any): SkItemDto {
    return {
      id: sk.id,
      nomor_sk: sk.nomor_sk,
      tanggal_sk: sk.tanggal_sk,
      tanggal_efektif: sk.tanggal_efektif,
      tanggal_selesai: sk.tanggal_selesai ?? null,
      jabatan: sk.jabatan ?? null,
      file_sk: sk.file_sk ?? null,
      status_aktif: sk.status_aktif,
      id_pegawai: sk.pegawai?.id ?? null,
      nama_pegawai: sk.pegawai?.nama ?? null,
      nip_nik: sk.pegawai?.nip_nik ?? null,
      id_unit_kerja: sk.unit_kerja?.id ?? null,
      nama_unit_kerja: sk.unit_kerja?.nama_unit ?? null,
      created_at: sk.created_at,
      updated_at: sk.updated_at,
    };
  }
}
