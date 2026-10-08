import {
  BadRequestException,
  Body,
  ConflictException,
  Controller,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiConsumes, ApiBody } from '@nestjs/swagger';
import { PrismaService } from '../../prisma.module.js';
import { ApiStandartResponseCreate } from '../../other/scheme_standar.js';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard.js';
import { RolesGuard } from '../../common/guards/roles.guard.js';
import { ApiRoles } from '../../common/decorators/api-roles.decorator.js';
import { CurrentUser } from '../../auth/user.decorator.js';
import type { JwtPayload } from '../../auth/user.decorator.js';
import { Role } from '../../common/enums/role.enum.js';
import { AuditService } from '../../common/services/audit.service.js';
import { FileService } from '../../common/services/file.service.js';
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
    private readonly fileService: FileService,
  ) {}

  @Post()
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data')
  @ApiBody({ type: CreateSkDto })
  @ApiRoles('Tambah SK', [Role.Superadmin])
  @ApiStandartResponseCreate(SkItemDto)
  async create(
    @CurrentUser() user: JwtPayload,
    @Body() body: CreateSkDto,
    @UploadedFile() file?: any,
  ) {
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

    let filePath: string | null = body.file_sk ?? null;
    if (file) {
      filePath = await this.fileService.uploadSk(file as any);
    }

    const isTugasTambahan =
      (body as any).is_tugas_tambahan === true ||
      (body as any).is_tugas_tambahan === 'true';

    const sk = await this.prisma.$transaction(async (tx) => {
      const tanggalEfektif = new Date(body.tanggal_efektif);

      if (!isTugasTambahan) {
        const activeHomebase = await tx.sk.findFirst({
          where: {
            pegawai_id: body.id_pegawai,
            is_homebase: true,
            status_aktif: 'AKTIF',
          },
        });
        if (activeHomebase) {
          const hMin1 = new Date(tanggalEfektif);
          hMin1.setDate(hMin1.getDate() - 1);
          await tx.sk.update({
            where: { id: activeHomebase.id },
            data: { status_aktif: 'NONAKTIF', tanggal_selesai: hMin1 },
          });
        }
      }

      return tx.sk.create({
        data: {
          nomor_sk: body.nomor_sk,
          tanggal_sk: new Date(body.tanggal_sk),
          tanggal_efektif: tanggalEfektif,
          tanggal_selesai: body.tanggal_selesai
            ? new Date(body.tanggal_selesai)
            : null,
          pegawai_id: body.id_pegawai,
          unit_kerja_id: body.id_unit_kerja,
          jabatan: body.jabatan ?? null,
          file_sk: filePath,
          gaji_bulanan: body.gaji_bulanan ?? 0,
          sumber_dana_default:
            (body as any).sumber_dana_default ?? 'OPERASIONAL',
          ro_id_default: (body as any).ro_id_default ?? null,
          dana_operasional_id_default:
            (body as any).dana_operasional_id_default ?? null,
          is_homebase: !isTugasTambahan,
          keterangan: (body as any).keterangan ?? null,
          status_aktif: 'AKTIF',
        },
        include: {
          pegawai: { select: { id: true, nama: true, nip_nik: true } },
          unit_kerja: { select: { id: true, nama_unit: true } },
        },
      });
    });

    await this.audit.log({
      tabel: 'sk',
      recordId: sk.id,
      aksi: AksiAudit.CREATE,
      dilakukanOleh: user.sub,
      dataSesudah: sk,
    });

    return created('Berhasil menambahkan SK', {
      id: sk.id,
      nomor_sk: sk.nomor_sk,
      tanggal_sk: sk.tanggal_sk,
      tanggal_efektif: sk.tanggal_efektif,
      tanggal_selesai: (sk as any).tanggal_selesai ?? null,
      jabatan: (sk as any).jabatan ?? null,
      file_sk: (sk as any).file_sk ?? null,
      gaji_bulanan: (sk as any).gaji_bulanan ?? null,
      sumber_dana_default: (sk as any).sumber_dana_default ?? null,
      ro_id_default: (sk as any).ro_id_default ?? null,
      dana_operasional_id_default:
        (sk as any).dana_operasional_id_default ?? null,
      is_homebase: (sk as any).is_homebase,
      keterangan: (sk as any).keterangan ?? null,
      status_aktif: sk.status_aktif,
      id_pegawai: (sk as any).pegawai?.id ?? null,
      nama_pegawai: (sk as any).pegawai?.nama ?? null,
      nip_nik: (sk as any).pegawai?.nip_nik ?? null,
      id_unit_kerja: (sk as any).unit_kerja?.id ?? null,
      nama_unit_kerja: (sk as any).unit_kerja?.nama_unit ?? null,
      created_at: (sk as any).created_at,
      updated_at: (sk as any).updated_at,
    });
  }
}
