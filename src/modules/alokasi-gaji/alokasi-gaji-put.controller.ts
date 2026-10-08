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
            sk_list: {
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
      throw new BadRequestException(
        'Alokasi yang sudah dibatalkan tidak dapat diubah',
      );
    }

    // Scope koordinator via SK homebase
    if (user.role === Role.Koordinator) {
      if (!user.unitKerjaId) {
        throw new ForbiddenException(
          'Akun koordinator belum memiliki unit kerja',
        );
      }
      const unitId = (existing.pegawai as any).sk_list?.[0]?.unit_kerja_id;
      if (unitId) {
        const inScope = await this.unitScope.isUnitInScope(
          unitId,
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

    const updated = await this.prisma.$transaction(async (tx) => {
      const sameSource =
        existing.sumber_dana === newSumber &&
        (existing.ro_id ?? null) === newRoId &&
        (existing.dana_operasional_id ?? null) === newDanaId;

      const pegawaiForLedger = await tx.pegawai.findUnique({
        where: { id: existing.pegawai_id },
        select: { nama: true },
      });
      const namaKegiatan = `Alokasi gaji TA ${pegawaiForLedger?.nama ?? existing.pegawai_id} periode ${existing.periode_bulan}/${existing.periode_tahun}`;

      if (sameSource) {
        const delta = newJumlah - existing.jumlah;
        if (delta > 0) {
          if (newSumber === 'RO' && newRoId) {
            const ro = await tx.ro.findUnique({ where: { id: newRoId } });
            if (!ro) throw new BadRequestException('RO tidak ditemukan');
            const terpakai = await tx.alokasiGajiTA.aggregate({
              _sum: { jumlah: true },
              where: { ro_id: newRoId, status: 'AKTIF' },
            });
            const sisa = ro.total_plafon - (terpakai._sum.jumlah ?? 0);
            if (delta > sisa)
              throw new BadRequestException(
                `Saldo RO ${ro.kode_ro} tidak mencukupi. Sisa Rp ${sisa.toLocaleString('id-ID')}, delta Rp ${delta.toLocaleString('id-ID')}`,
              );
            await tx.roTransaksi.create({
              data: {
                ro_id: newRoId,
                nama_kegiatan: namaKegiatan + ' (update)',
                tanggal: new Date(),
                debit: delta,
                kredit: 0,
                keterangan: `Update alokasi ${id}`,
              },
            });
          } else if (newSumber === 'OPERASIONAL' && newDanaId) {
            const dana = await tx.danaOperasional.findUnique({
              where: { id: newDanaId },
            });
            if (!dana)
              throw new BadRequestException('Dana operasional tidak ditemukan');
            const terpakai = await tx.alokasiGajiTA.aggregate({
              _sum: { jumlah: true },
              where: { dana_operasional_id: newDanaId, status: 'AKTIF' },
            });
            const sisa = dana.total_plafon - (terpakai._sum.jumlah ?? 0);
            if (delta > sisa)
              throw new BadRequestException(
                `Saldo dana operasional tidak mencukupi. Sisa Rp ${sisa.toLocaleString('id-ID')}, delta Rp ${delta.toLocaleString('id-ID')}`,
              );
            await tx.danaTransaksi.create({
              data: {
                dana_id: newDanaId,
                nama_kegiatan: namaKegiatan + ' (update)',
                tanggal: new Date(),
                debit: delta,
                kredit: 0,
                keterangan: `Update alokasi ${id}`,
              },
            });
          }
        } else if (delta < 0) {
          const kreditAmt = -delta;
          if (newSumber === 'RO' && newRoId) {
            await tx.roTransaksi.create({
              data: {
                ro_id: newRoId,
                nama_kegiatan: namaKegiatan + ' (koreksi)',
                tanggal: new Date(),
                debit: 0,
                kredit: kreditAmt,
                keterangan: `Koreksi alokasi ${id}`,
              },
            });
          } else if (newSumber === 'OPERASIONAL' && newDanaId) {
            await tx.danaTransaksi.create({
              data: {
                dana_id: newDanaId,
                nama_kegiatan: namaKegiatan + ' (koreksi)',
                tanggal: new Date(),
                debit: 0,
                kredit: kreditAmt,
                keterangan: `Koreksi alokasi ${id}`,
              },
            });
          }
        }
      } else {
        // Kembalikan saldo sumber lama (kredit)
        if (existing.sumber_dana === 'RO' && existing.ro_id) {
          await tx.roTransaksi.create({
            data: {
              ro_id: existing.ro_id,
              nama_kegiatan: namaKegiatan + ' (pindah sumber)',
              tanggal: new Date(),
              debit: 0,
              kredit: existing.jumlah,
              keterangan: `Pindah sumber alokasi ${id}`,
            },
          });
        } else if (
          existing.sumber_dana === 'OPERASIONAL' &&
          existing.dana_operasional_id
        ) {
          await tx.danaTransaksi.create({
            data: {
              dana_id: existing.dana_operasional_id,
              nama_kegiatan: namaKegiatan + ' (pindah sumber)',
              tanggal: new Date(),
              debit: 0,
              kredit: existing.jumlah,
              keterangan: `Pindah sumber alokasi ${id}`,
            },
          });
        }
        // Cek saldo sumber baru
        if (newSumber === 'RO' && newRoId) {
          const ro = await tx.ro.findUnique({ where: { id: newRoId } });
          if (!ro) throw new BadRequestException('RO tidak ditemukan');
          const terpakai = await tx.alokasiGajiTA.aggregate({
            _sum: { jumlah: true },
            where: { ro_id: newRoId, status: 'AKTIF' },
          });
          const sisa = ro.total_plafon - (terpakai._sum.jumlah ?? 0);
          if (newJumlah > sisa)
            throw new BadRequestException(
              `Saldo RO ${ro.kode_ro} tidak mencukupi. Sisa Rp ${sisa.toLocaleString('id-ID')}, alokasi Rp ${newJumlah.toLocaleString('id-ID')}`,
            );
          await tx.roTransaksi.create({
            data: {
              ro_id: newRoId,
              nama_kegiatan: namaKegiatan + ' (pindah sumber)',
              tanggal: new Date(),
              debit: newJumlah,
              kredit: 0,
              keterangan: `Pindah sumber alokasi ${id}`,
            },
          });
        } else if (newSumber === 'OPERASIONAL' && newDanaId) {
          const dana = await tx.danaOperasional.findUnique({
            where: { id: newDanaId },
          });
          if (!dana)
            throw new BadRequestException('Dana operasional tidak ditemukan');
          const terpakai = await tx.alokasiGajiTA.aggregate({
            _sum: { jumlah: true },
            where: { dana_operasional_id: newDanaId, status: 'AKTIF' },
          });
          const sisa = dana.total_plafon - (terpakai._sum.jumlah ?? 0);
          if (newJumlah > sisa)
            throw new BadRequestException(
              `Saldo dana operasional tidak mencukupi. Sisa Rp ${sisa.toLocaleString('id-ID')}, alokasi Rp ${newJumlah.toLocaleString('id-ID')}`,
            );
          await tx.danaTransaksi.create({
            data: {
              dana_id: newDanaId,
              nama_kegiatan: namaKegiatan + ' (pindah sumber)',
              tanggal: new Date(),
              debit: newJumlah,
              kredit: 0,
              keterangan: `Pindah sumber alokasi ${id}`,
            },
          });
        }
      }

      const upd = await tx.alokasiGajiTA.update({
        where: { id },
        data: {
          sumber_dana: newSumber,
          ro_id: newSumber === 'RO' ? newRoId : null,
          dana_operasional_id: newSumber === 'OPERASIONAL' ? newDanaId : null,
          jumlah: newJumlah,
          keterangan:
            body.keterangan !== undefined
              ? body.keterangan
              : existing.keterangan,
          status: 'AKTIF',
        },
        include: {
          pegawai: {
            select: {
              id: true,
              nama: true,
              nip_nik: true,
              tipe_pegawai: true,
              sk_list: {
                where: { is_homebase: true, status_aktif: 'AKTIF' },
                select: {
                  gaji_bulanan: true,
                  unit_kerja: { select: { id: true, nama_unit: true } },
                },
                orderBy: { tanggal_efektif: 'desc' },
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
      return upd;
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
      gaji_bulanan: item.pegawai?.sk_list?.[0]?.gaji_bulanan ?? null,
      id_unit_kerja: item.pegawai?.sk_list?.[0]?.unit_kerja?.id ?? null,
      nama_unit_kerja:
        item.pegawai?.sk_list?.[0]?.unit_kerja?.nama_unit ?? null,
      id_ro: item.ro?.id ?? null,
      nama_ro: item.ro ? `${item.ro.kode_ro} - ${item.ro.nama_ro}` : null,
      id_dana_operasional: item.dana_operasional?.id ?? null,
      nama_dibuat_oleh: item.pembuat?.nama ?? null,
      created_at: item.created_at,
      updated_at: item.updated_at,
    };
  }
}
