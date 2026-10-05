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
import { AksiAudit } from '../../common/enums/hris.enum.js';
import { created } from '../../common/utils/response.util.js';
import { CreateSkDto, SkItemDto } from './sk.dto.js';

@ApiTags('SK')
@Controller('/api/sk')
@UseGuards(JwtAuthGuard, RolesGuard)
export class SkPostController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  @Post()
  @ApiRoles('Tambah SK', [Role.Superadmin])
  @ApiStandartResponseCreate(SkItemDto)
  async create(@CurrentUser() user: JwtPayload, @Body() body: CreateSkDto) {
    const exists = await this.prisma.sk.findUnique({
      where: { nomor_sk: body.nomor_sk },
    });
    if (exists) {
      throw new ConflictException(`Nomor SK ${body.nomor_sk} sudah terdaftar`);
    }

    const pegawai = await this.prisma.pegawai.findUnique({
      where: { id: body.id_pegawai },
    });
    if (!pegawai) throw new BadRequestException('Pegawai tidak ditemukan');

    const unit = await this.prisma.unitKerja.findUnique({
      where: { id: body.id_unit_kerja },
    });
    if (!unit) throw new BadRequestException('Unit kerja tidak ditemukan');
    if (unit.status_aktif !== 'AKTIF') {
      throw new BadRequestException('Unit kerja tidak aktif');
    }

    // Buat SK (default NONAKTIF — diaktifkan via endpoint activate)
    const sk = await this.prisma.sk.create({
      data: {
        nomor_sk: body.nomor_sk,
        tanggal_sk: new Date(body.tanggal_sk),
        tanggal_efektif: new Date(body.tanggal_efektif),
        tanggal_selesai: body.tanggal_selesai
          ? new Date(body.tanggal_selesai)
          : null,
        pegawai_id: body.id_pegawai,
        unit_kerja_id: body.id_unit_kerja,
        jabatan: body.jabatan ?? null,
        file_sk: body.file_sk ?? null,
        status_aktif: 'NONAKTIF',
      },
      include: {
        pegawai: { select: { id: true, nama: true, nip_nik: true } },
        unit_kerja: { select: { id: true, nama_unit: true } },
      },
    });

    await this.audit.log({
      tabel: 'sk',
      recordId: sk.id,
      aksi: AksiAudit.CREATE,
      dilakukanOleh: user.sub,
      dataSesudah: sk,
    });

    return created(
      'Berhasil menambahkan SK. Gunakan endpoint activate untuk mengaktifkan.',
      {
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
      },
    );
  }
}
