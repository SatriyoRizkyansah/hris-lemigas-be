import {
  BadRequestException,
  Body,
  Controller,
  ForbiddenException,
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
import { FundService } from '../../common/services/fund.service.js';
import { AlokasiValidationService } from '../../common/services/alokasi-validation.service.js';
import { UnitScopeService } from '../../common/services/unit-scope.service.js';
import { AksiAudit, SumberDana } from '../../common/enums/hris.enum.js';
import { ok } from '../../common/utils/response.util.js';
import { UpdateAlokasiDto, AlokasiItemDto } from './alokasi-gaji.dto.js';

@ApiTags('Alokasi Gaji TA')
@Controller('/api/alokasi-gaji')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AlokasiPutController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly fund: FundService,
    private readonly validation: AlokasiValidationService,
    private readonly unitScope: UnitScopeService,
  ) {}

  @Put(':id')
  @ApiRoles('Update alokasi gaji TA', [Role.Superadmin, Role.Koordinator])
  @ApiStandartResponse(AlokasiItemDto)
  async update(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: UpdateAlokasiDto,
  ) {
    const existing = await this.prisma.alokasiGajiTA.findUnique({
      where: { id },
      include: {
        pegawai: {
          select: {
            id: true,
            nama: true,
            nip_nik: true,
            unit_kerja_id: true,
            unit_kerja: { select: { id: true, nama_unit: true } },
          },
        },
      },
    });
    if (!existing) throw new NotFoundException('Alokasi tidak ditemukan');

    if (existing.status !== 'AKTIF') {
      throw new BadRequestException(
        'Alokasi yang sudah dibatalkan tidak dapat diubah',
      );
    }

    // Scope koordinator
    if (user.role === Role.Koordinator) {
      if (!user.unitKerjaId) {
        throw new ForbiddenException(
          'Akun koordinator belum memiliki unit kerja',
        );
      }
      if (existing.pegawai.unit_kerja_id) {
        const inScope = await this.unitScope.isUnitInScope(
          existing.pegawai.unit_kerja_id,
          user.unitKerjaId,
        );
        if (!inScope) {
          throw new ForbiddenException(
            'Anda hanya dapat mengubah alokasi untuk TA di lingkungan unit Anda',
          );
        }
      }
    }

    const newSumber = (body.sumber_dana ?? existing.sumber_dana) as SumberDana;
    const newRoId =
      body.id_ro !== undefined ? body.id_ro : (existing.ro_id ?? null);
    const newDanaId =
      body.id_dana_operasional !== undefined
        ? body.id_dana_operasional
        : (existing.dana_operasional_id ?? null);
    const newJumlah = body.jumlah ?? existing.jumlah;

    // Sumber dana konsisten
    if (newSumber === 'RO' && !newRoId) {
      throw new BadRequestException(
        'Alokasi sumber RO harus menyertakan id RO',
      );
    }
    if (newSumber === 'OPERASIONAL' && !newDanaId) {
      throw new BadRequestException(
        'Alokasi sumber Operasional harus menyertakan id dana operasional',
      );
    }

    // Validasi bisnis ulang (kecuali alokasi ini sendiri)
    await this.validation.validate(
      {
        pegawaiId: existing.pegawai_id,
        periodeBulan: existing.periode_bulan,
        periodeTahun: existing.periode_tahun,
        sumberDana: newSumber,
        roId: newRoId,
        danaOperasionalId: newDanaId,
        jumlah: newJumlah,
      },
      id,
    );

    // Validasi saldo: jika sumber berubah, cek saldo sumber baru penuh;
    // jika sumber sama, alokasi lama dilepas dulu (karena masih berstatus AKTIF)
    const sameSource =
      existing.sumber_dana === newSumber &&
      (existing.ro_id ?? null) === newRoId &&
      (existing.dana_operasional_id ?? null) === newDanaId;

    if (sameSource) {
      // Sisa saldo berjalan sudah termasuk alokasi ini; cukup cek delta
      const delta = newJumlah - existing.jumlah;
      if (delta > 0) {
        await this.fund.assertSufficientBalance({
          sumberDana: newSumber,
          roId: newRoId,
          danaOperasionalId: newDanaId,
          jumlah: delta,
        });
      }
    } else {
      // Alokasi ini dinonaktifkan sementara agar saldo sumber baru adil
      await this.prisma.$transaction(async (tx) => {
        await tx.alokasiGajiTA.update({
          where: { id },
          data: { status: 'DIBATALKAN' },
        });

        await this.fund.assertSufficientBalance({
          sumberDana: newSumber,
          roId: newRoId,
          danaOperasionalId: newDanaId,
          jumlah: newJumlah,
        });
      });
    }

    const updated = await this.prisma.alokasiGajiTA.update({
      where: { id },
      data: {
        sumber_dana: newSumber,
        ro_id: newSumber === 'RO' ? newRoId : null,
        dana_operasional_id: newSumber === 'OPERASIONAL' ? newDanaId : null,
        jumlah: newJumlah,
        keterangan:
          body.keterangan !== undefined ? body.keterangan : existing.keterangan,
        status: 'AKTIF',
      },
      include: {
        pegawai: {
          select: {
            id: true,
            nama: true,
            nip_nik: true,
            tipe_pegawai: true,
            gaji_bulanan: true,
            unit_kerja: { select: { id: true, nama_unit: true } },
          },
        },
        ro: { select: { id: true, kode_ro: true, nama_ro: true } },
        dana_operasional: {
          select: { id: true, tahun_fiscal: true, unit_koordinator_id: true },
        },
        pembuat: { select: { nama: true } },
      },
    });

    await this.audit.log({
      tabel: 'alokasi_gaji_ta',
      recordId: id,
      aksi: AksiAudit.UPDATE,
      dilakukanOleh: user.sub,
      dataSebelum: existing,
      dataSesudah: updated,
    });

    return ok('Berhasil mengupdate alokasi gaji TA', this.mapItem(updated));
  }

  private mapItem(item: any): AlokasiItemDto {
    return {
      id: item.id,
      periode_bulan: item.periode_bulan,
      periode_tahun: item.periode_tahun,
      sumber_dana: item.sumber_dana,
      jumlah: item.jumlah,
      status: item.status,
      keterangan: item.keterangan ?? null,
      id_pegawai: item.pegawai?.id ?? null,
      nama_pegawai: item.pegawai?.nama ?? null,
      nip_nik: item.pegawai?.nip_nik ?? null,
      tipe_pegawai: item.pegawai?.tipe_pegawai ?? null,
      gaji_bulanan: item.pegawai?.gaji_bulanan ?? null,
      id_unit_kerja: item.pegawai?.unit_kerja?.id ?? null,
      nama_unit_kerja: item.pegawai?.unit_kerja?.nama_unit ?? null,
      id_ro: item.ro?.id ?? null,
      nama_ro: item.ro ? `${item.ro.kode_ro} - ${item.ro.nama_ro}` : null,
      id_dana_operasional: item.dana_operasional?.id ?? null,
      nama_dibuat_oleh: item.pembuat?.nama ?? null,
      created_at: item.created_at,
      updated_at: item.updated_at,
    };
  }
}
