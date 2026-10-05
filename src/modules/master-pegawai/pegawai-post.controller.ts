import {
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
import { CreatePegawaiDto, PegawaiItemDto } from './pegawai.dto.js';

@ApiTags('Master - Pegawai')
@Controller('/api/pegawai')
@UseGuards(JwtAuthGuard, RolesGuard)
export class PegawaiPostController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  @Post()
  @ApiRoles('Tambah pegawai', [Role.Superadmin])
  @ApiStandartResponseCreate(PegawaiItemDto)
  async create(
    @CurrentUser() user: JwtPayload,
    @Body() body: CreatePegawaiDto,
  ) {
    const exists = await this.prisma.pegawai.findUnique({
      where: { nip_nik: body.nip_nik },
    });
    if (exists) {
      throw new ConflictException(`NIP/NIK ${body.nip_nik} sudah terdaftar`);
    }

    if (body.email) {
      const emailExists = await this.prisma.pegawai.findUnique({
        where: { email: body.email },
      });
      if (emailExists) {
        throw new ConflictException(`Email ${body.email} sudah terdaftar`);
      }
    }

    const pegawai = await this.prisma.pegawai.create({
      data: {
        nip_nik: body.nip_nik,
        nama: body.nama,
        tipe_pegawai: body.tipe_pegawai,
        jabatan: body.jabatan ?? null,
        email: body.email ?? null,
        telepon: body.telepon ?? null,
        tanggal_mulai: new Date(body.tanggal_mulai),
        status_aktif: body.status_aktif ?? 'AKTIF',
        bidang_keahlian: body.bidang_keahlian ?? null,
        kontrak_mulai: body.kontrak_mulai ? new Date(body.kontrak_mulai) : null,
        kontrak_selesai: body.kontrak_selesai
          ? new Date(body.kontrak_selesai)
          : null,
        gaji_bulanan: body.gaji_bulanan ?? 0,
        unit_kerja_id: body.id_unit_kerja ?? null,
      },
    });

    await this.audit.log({
      tabel: 'pegawai',
      recordId: pegawai.id,
      aksi: AksiAudit.CREATE,
      dilakukanOleh: user.sub,
      dataSesudah: pegawai,
    });

    return created('Berhasil menambahkan pegawai', pegawai);
  }
}
