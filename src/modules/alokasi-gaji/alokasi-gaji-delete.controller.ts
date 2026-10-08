import {
  BadRequestException,
  Controller,
  Delete,
  ForbiddenException,
  NotFoundException,
  Param,
  ParseUUIDPipe,
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
import { AksiAudit } from '../../common/enums/hris.enum.js';
import { ok } from '../../common/utils/response.util.js';
import { AlokasiItemDto } from './alokasi-gaji.dto.js';

@ApiTags('Alokasi Gaji TA')
@Controller('/api/alokasi-gaji')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AlokasiDeleteController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly unitScope: UnitScopeService,
  ) {}

  @Delete(':id')
  @ApiRoles('Batalkan alokasi gaji TA', [Role.Superadmin, Role.Koordinator])
  @ApiStandartResponse(AlokasiItemDto)
  async cancel(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    const existing = await this.prisma.alokasiGajiTA.findUnique({
      where: { id },
      include: {
        pegawai: {
          select: {
            id: true,
            nama: true,
            nip_nik: true,
            penempatan_list: {
              where: { is_homebase: true, status_aktif: 'AKTIF' },
              select: { unit_kerja_id: true },
              take: 1,
            },
          },
        },
      },
    });
    if (!existing) throw new NotFoundException('Alokasi tidak ditemukan');

    if (existing.status !== 'AKTIF') {
      throw new BadRequestException('Alokasi sudah dibatalkan');
    }

    // Scope koordinator via penempatan
    if (user.role === Role.Koordinator) {
      if (!user.unitKerjaId) {
        throw new ForbiddenException(
          'Akun koordinator belum memiliki unit kerja',
        );
      }
      const unitId = (existing.pegawai as any).penempatan_list?.[0]
        ?.unit_kerja_id;
      if (unitId) {
        const inScope = await this.unitScope.isUnitInScope(
          unitId,
          user.unitKerjaId,
        );
        if (!inScope) {
          throw new ForbiddenException(
            'Anda hanya dapat membatalkan alokasi untuk TA di lingkungan unit Anda',
          );
        }
      }
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      const upd = await tx.alokasiGajiTA.update({
        where: { id },
        data: { status: 'DIBATALKAN' },
        include: {
          pegawai: {
            select: {
              id: true,
              nama: true,
              nip_nik: true,
              tipe_pegawai: true,
              penempatan_list: {
                where: { is_homebase: true, status_aktif: 'AKTIF' },
                select: {
                  unit_kerja: { select: { id: true, nama_unit: true } },
                },
                take: 1,
              },
              sk_list: {
                where: { status_aktif: 'AKTIF' },
                select: { gaji_bulanan: true },
                take: 1,
              },
            },
          },
          ro: { select: { id: true, kode_ro: true, nama_ro: true } },
          dana_operasional: {
            select: { id: true, tahun_fiscal: true, unit_koordinator_id: true },
          },
          pembuat: { select: { nama: true } },
        },
      });
      const namaKegiatan = `Refund alokasi gaji TA ${upd.pegawai?.nama ?? upd.pegawai_id} periode ${upd.periode_bulan}/${upd.periode_tahun}`;
      if (upd.sumber_dana === 'RO' && upd.ro_id) {
        await tx.roTransaksi.create({
          data: {
            ro_id: upd.ro_id,
            nama_kegiatan: namaKegiatan,
            tanggal: new Date(),
            debit: 0,
            kredit: upd.jumlah,
            keterangan: `Cancel alokasi ${id}`,
          },
        });
      } else if (upd.sumber_dana === 'OPERASIONAL' && upd.dana_operasional_id) {
        await tx.danaTransaksi.create({
          data: {
            dana_id: upd.dana_operasional_id,
            nama_kegiatan: namaKegiatan,
            tanggal: new Date(),
            debit: 0,
            kredit: upd.jumlah,
            keterangan: `Cancel alokasi ${id}`,
          },
        });
      }
      return upd;
    });

    await this.audit.log({
      tabel: 'alokasi_gaji_ta',
      recordId: id,
      aksi: AksiAudit.CANCEL,
      dilakukanOleh: user.sub,
      dataSebelum: { status: existing.status, jumlah: existing.jumlah },
      dataSesudah: { status: updated.status },
    });

    return ok('Berhasil membatalkan alokasi. Saldo sumber dana dikembalikan.', {
      id: updated.id,
      status: updated.status,
      jumlah: updated.jumlah,
      periode_bulan: updated.periode_bulan,
      periode_tahun: updated.periode_tahun,
      sumber_dana: updated.sumber_dana,
      nama_pegawai: updated.pegawai?.nama ?? null,
    });
  }
}
