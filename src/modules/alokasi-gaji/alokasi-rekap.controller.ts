import {
  Controller,
  ForbiddenException,
  Get,
  Query,
  Res,
  UseGuards,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import { PrismaService } from '../../prisma.module.js';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard.js';
import { RolesGuard } from '../../common/guards/roles.guard.js';
import { ApiRoles } from '../../common/decorators/api-roles.decorator.js';
import { CurrentUser } from '../../auth/user.decorator.js';
import type { JwtPayload } from '../../auth/user.decorator.js';
import { Role } from '../../common/enums/role.enum.js';
import { UnitScopeService } from '../../common/services/unit-scope.service.js';
import { ok } from '../../common/utils/response.util.js';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsOptional, IsUUID, Max, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { RekapItemDto } from './alokasi-gaji.dto.js';

class RekapQueryDto {
  @ApiPropertyOptional({ example: 1, minimum: 1, maximum: 12 })
  @IsInt()
  @Min(1)
  @Max(12)
  @Type(() => Number)
  periode_bulan: number;

  @ApiPropertyOptional({ example: 2026 })
  @IsInt()
  @Min(2000)
  @Type(() => Number)
  periode_tahun: number;

  @ApiPropertyOptional({ description: 'Filter unit (termasuk anak unit)' })
  @IsUUID()
  @IsOptional()
  id_unit_kerja?: string;
}

@ApiTags('Alokasi Gaji TA')
@Controller('/api/alokasi-gaji/rekap')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AlokasiRekapController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly unitScope: UnitScopeService,
  ) {}

  @Get()
  @ApiRoles('Rekap alokasi gaji TA bulanan', [
    Role.Superadmin,
    Role.Koordinator,
  ])
  async getRekap(
    @CurrentUser() user: JwtPayload,
    @Query() query: RekapQueryDto,
  ) {
    const { periode_bulan, periode_tahun, id_unit_kerja } = query;

    const unitIds = await this.resolveUnitFilter(user, id_unit_kerja);

    const pegawais = await this.prisma.pegawai.findMany({
      where: {
        tipe_pegawai: 'TA',
        status_aktif: 'AKTIF',
        ...(unitIds && unitIds.length > 0
          ? {
              penempatan_list: {
                some: {
                  unit_kerja_id: { in: unitIds },
                  is_homebase: true,
                  status_aktif: 'AKTIF',
                },
              },
            }
          : {}),
      },
      include: {
        penempatan_list: {
          where: { is_homebase: true, status_aktif: 'AKTIF' },
          select: { unit_kerja: { select: { id: true, nama_unit: true } } },
          take: 1,
        },
        alokasi_list: {
          where: {
            periode_bulan,
            periode_tahun,
            status: 'AKTIF',
          },
          include: {
            ro: { select: { id: true, kode_ro: true, nama_ro: true } },
            dana_operasional: { select: { id: true } },
          },
        },
      },
      orderBy: { nama: 'asc' },
    });

    const data: RekapItemDto[] = pegawais.map((pegawai: any) => {
      const total_alokasi = pegawai.alokasi_list.reduce(
        (acc: number, a: any) => acc + a.jumlah,
        0,
      );
      const alokasi_ro = pegawai.alokasi_list
        .filter((a: any) => a.sumber_dana === 'RO')
        .reduce((acc: number, a: any) => acc + a.jumlah, 0);
      const alokasi_operasional = pegawai.alokasi_list
        .filter((a: any) => a.sumber_dana === 'OPERASIONAL')
        .reduce((acc: number, a: any) => acc + a.jumlah, 0);
      const uk = pegawai.penempatan_list?.[0]?.unit_kerja ?? null;

      return {
        id_pegawai: pegawai.id,
        nama_pegawai: pegawai.nama,
        nip_nik: pegawai.nip_nik,
        nama_unit_kerja: uk?.nama_unit ?? null,
        gaji_bulanan: pegawai.gaji_bulanan,
        total_alokasi,
        alokasi_ro,
        alokasi_operasional,
        sisa_gaji: pegawai.gaji_bulanan - total_alokasi,
        detail: pegawai.alokasi_list.map((a: any) => ({
          id: a.id,
          periode_bulan: a.periode_bulan,
          periode_tahun: a.periode_tahun,
          sumber_dana: a.sumber_dana,
          jumlah: a.jumlah,
          status: a.status,
          keterangan: a.keterangan ?? null,
          id_pegawai: pegawai.id,
          nama_pegawai: pegawai.nama,
          nip_nik: pegawai.nip_nik,
          id_unit_kerja: uk?.id ?? null,
          nama_unit_kerja: uk?.nama_unit ?? null,
          id_ro: a.ro?.id ?? null,
          nama_ro: a.ro ? `${a.ro.kode_ro} - ${a.ro.nama_ro}` : null,
          id_dana_operasional: a.dana_operasional?.id ?? null,
        })),
      };
    });

    return ok(
      `Berhasil mengambil rekap alokasi bulan ${periode_bulan}/${periode_tahun}`,
      data,
    );
  }

  @Get('export')
  @ApiRoles('Export rekap alokasi gaji TA ke Excel', [
    Role.Superadmin,
    Role.Koordinator,
  ])
  async exportRekap(
    @CurrentUser() user: JwtPayload,
    @Query() query: RekapQueryDto,
    @Res() res: Response,
  ) {
    const { periode_bulan, periode_tahun, id_unit_kerja } = query;
    const unitIds = await this.resolveUnitFilter(user, id_unit_kerja);

    const pegawais = await this.prisma.pegawai.findMany({
      where: {
        tipe_pegawai: 'TA',
        status_aktif: 'AKTIF',
        ...(unitIds && unitIds.length > 0
          ? {
              penempatan_list: {
                some: {
                  unit_kerja_id: { in: unitIds },
                  is_homebase: true,
                  status_aktif: 'AKTIF',
                },
              },
            }
          : {}),
      },
      include: {
        penempatan_list: {
          where: { is_homebase: true, status_aktif: 'AKTIF' },
          select: { unit_kerja: { select: { nama_unit: true } } },
          take: 1,
        },
        alokasi_list: {
          where: { periode_bulan, periode_tahun, status: 'AKTIF' },
          include: {
            ro: { select: { kode_ro: true, nama_ro: true } },
          },
        },
      },
      orderBy: { nama: 'asc' },
    });

    const ExcelJS = (await import('exceljs')).default;
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Rekap Gaji TA');

    sheet.mergeCells('A1', 'H1');
    const titleCell = sheet.getCell('A1');
    titleCell.value = `REKAPITULASI ALOKASI GAJI TA - BULAN ${periode_bulan}/${periode_tahun}`;
    titleCell.font = { bold: true, size: 14 };
    titleCell.alignment = { horizontal: 'center' };

    sheet.columns = [
      { key: 'no', width: 6 },
      { key: 'nip_nik', width: 20 },
      { key: 'nama', width: 30 },
      { key: 'unit', width: 30 },
      { key: 'gaji', width: 16 },
      { key: 'alokasi_ro', width: 16 },
      { key: 'alokasi_operasional', width: 18 },
      { key: 'total', width: 16 },
      { key: 'sisa', width: 16 },
    ];

    const headerRow = sheet.getRow(3);
    headerRow.values = [
      'No',
      'NIP/NIK',
      'Nama',
      'Unit Kerja',
      'Gaji Bulanan',
      'Alokasi RO',
      'Alokasi Operasional',
      'Total Alokasi',
      'Sisa Gaji',
    ];
    headerRow.font = { bold: true };
    headerRow.alignment = { horizontal: 'center', vertical: 'middle' };
    headerRow.eachCell((cell) => {
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFD9E1F2' },
      };
      cell.border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' },
      };
    });

    let no = 1;
    let grandTotal = 0;
    for (const pegawai of pegawais) {
      const total_alokasi = pegawai.alokasi_list.reduce(
        (acc, a) => acc + a.jumlah,
        0,
      );
      const alokasi_ro = pegawai.alokasi_list
        .filter((a) => a.sumber_dana === 'RO')
        .reduce((acc, a) => acc + a.jumlah, 0);
      const alokasi_operasional = pegawai.alokasi_list
        .filter((a) => a.sumber_dana === 'OPERASIONAL')
        .reduce((acc, a) => acc + a.jumlah, 0);
      grandTotal += total_alokasi;

      sheet.addRow({
        no: no++,
        nip_nik: pegawai.nip_nik,
        nama: pegawai.nama,
        unit:
          (pegawai as any).penempatan_list?.[0]?.unit_kerja?.nama_unit ?? '-',
        gaji: pegawai.gaji_bulanan,
        alokasi_ro,
        alokasi_operasional,
        total: total_alokasi,
        sisa: pegawai.gaji_bulanan - total_alokasi,
      });
    }

    const totalRow = sheet.addRow({
      nama: 'TOTAL',
      gaji: pegawais.reduce((acc, p) => acc + p.gaji_bulanan, 0),
      alokasi_ro: pegawais.reduce(
        (acc, p) =>
          acc +
          p.alokasi_list
            .filter((a) => a.sumber_dana === 'RO')
            .reduce((s, a) => s + a.jumlah, 0),
        0,
      ),
      alokasi_operasional: pegawais.reduce(
        (acc, p) =>
          acc +
          p.alokasi_list
            .filter((a) => a.sumber_dana === 'OPERASIONAL')
            .reduce((s, a) => s + a.jumlah, 0),
        0,
      ),
      total: grandTotal,
    });
    totalRow.font = { bold: true };

    // Format Rupiah
    for (const row of sheet.getRows(4, sheet.rowCount - 3) ?? []) {
      for (const col of [5, 6, 7, 8, 9]) {
        const cell = row.getCell(col);
        if (cell.value !== null && cell.value !== undefined) {
          cell.numFmt = '"Rp" #,##0';
        }
      }
    }

    const buffer = await workbook.xlsx.writeBuffer();
    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="rekap-gaji-ta-${periode_bulan}-${periode_tahun}.xlsx"`,
    );
    res.end(buffer);
  }

  private async resolveUnitFilter(
    user: JwtPayload,
    idUnitKerja?: string,
  ): Promise<string[] | null> {
    if (user.role === Role.Koordinator) {
      if (!user.unitKerjaId) {
        throw new ForbiddenException(
          'Akun koordinator belum memiliki unit kerja',
        );
      }
      const scoped = await this.unitScope.getScopedUnitIds(user.unitKerjaId);
      if (idUnitKerja) {
        if (!scoped.includes(idUnitKerja)) {
          throw new ForbiddenException(
            'Unit yang diminta di luar lingkup Anda',
          );
        }
        return this.unitScope.getScopedUnitIds(idUnitKerja);
      }
      return scoped;
    }

    if (idUnitKerja) {
      return this.unitScope.getScopedUnitIds(idUnitKerja);
    }
    return null;
  }
}
