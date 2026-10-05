import {
  Controller,
  ForbiddenException,
  Get,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { PrismaService } from '../../prisma.module.js';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard.js';
import { ApiRoles } from '../../common/decorators/api-roles.decorator.js';
import { CurrentUser } from '../../auth/user.decorator.js';
import type { JwtPayload } from '../../auth/user.decorator.js';
import { Role } from '../../common/enums/role.enum.js';
import { ok } from '../../common/utils/response.util.js';
import { PaginateQuery } from '../../common/dto/paginate-query.dto.js';

@ApiTags('My Profile')
@Controller('/api/my')
@UseGuards(JwtAuthGuard)
export class MyProfileController {
  constructor(private readonly prisma: PrismaService) {}

  @Get('profile')
  @ApiRoles('Profil saya (karyawan, koordinator, superadmin)', [
    Role.Superadmin,
    Role.Koordinator,
    Role.Karyawan,
  ])
  async getProfile(@CurrentUser() user: JwtPayload) {
    const userData = await this.prisma.user.findUnique({
      where: { id: user.sub },
      include: {
        role: { select: { kode: true, nama: true } },
        unit_kerja: { select: { id: true, kode_unit: true, nama_unit: true } },
        pegawai: {
          include: {
            unit_kerja: {
              select: { id: true, kode_unit: true, nama_unit: true },
            },
            sk_list: {
              where: { status_aktif: 'AKTIF' },
              orderBy: { created_at: 'desc' },
              take: 1,
            },
          },
        },
      },
    });
    if (!userData) throw new ForbiddenException('User tidak ditemukan');

    const pegawai = userData.pegawai;

    return ok('Berhasil mengambil profil saya', {
      user: {
        id: userData.id,
        email: userData.email,
        nama: userData.nama,
        role: userData.role?.kode ?? null,
        nama_role: userData.role?.nama ?? null,
      },
      pegawai: pegawai
        ? {
            id: pegawai.id,
            nip_nik: pegawai.nip_nik,
            nama: pegawai.nama,
            email: pegawai.email,
            jabatan: pegawai.jabatan,
            tipe_pegawai: pegawai.tipe_pegawai,
            gaji_bulanan: pegawai.gaji_bulanan,
            status_aktif: pegawai.status_aktif,
            unit_kerja: pegawai.unit_kerja
              ? {
                  id: pegawai.unit_kerja.id,
                  kode_unit: pegawai.unit_kerja.kode_unit,
                  nama_unit: pegawai.unit_kerja.nama_unit,
                }
              : null,
            sk_aktif: pegawai.sk_list?.[0]
              ? {
                  id: pegawai.sk_list[0].id,
                  nomor_sk: pegawai.sk_list[0].nomor_sk,
                  jabatan: pegawai.sk_list[0].jabatan,
                  masa_berlaku_mulai: pegawai.sk_list[0].tanggal_efektif,
                  masa_berlaku_akhir: pegawai.sk_list[0].tanggal_selesai,
                }
              : null,
          }
        : null,
    });
  }

  @Get('sk')
  @ApiRoles('Riwayat SK saya', [
    Role.Superadmin,
    Role.Koordinator,
    Role.Karyawan,
  ])
  async getMySk(@CurrentUser() user: JwtPayload) {
    const pegawai = await this.findPegawai(user);
    if (!pegawai) {
      return ok('Berhasil mengambil riwayat SK', []);
    }

    const sks = await this.prisma.sk.findMany({
      where: { pegawai_id: pegawai.id },
      orderBy: [{ tanggal_efektif: 'desc' }, { created_at: 'desc' }],
    });

    return ok(
      'Berhasil mengambil riwayat SK',
      sks.map((sk) => ({
        id: sk.id,
        nomor_sk: sk.nomor_sk,
        jabatan: sk.jabatan,
        masa_berlaku_mulai: sk.tanggal_efektif,
        masa_berlaku_akhir: sk.tanggal_selesai,
        status_aktif: sk.status_aktif,
        created_at: sk.created_at,
      })),
    );
  }

  @Get('alokasi')
  @ApiRoles('Riwayat alokasi gaji saya', [
    Role.Superadmin,
    Role.Koordinator,
    Role.Karyawan,
  ])
  async getMyAlokasi(
    @CurrentUser() user: JwtPayload,
    @Query() query: PaginateQuery,
  ) {
    const pegawai = await this.findPegawai(user);
    if (!pegawai) {
      return ok('Berhasil mengambil riwayat alokasi', []);
    }

    const [items, total] = await Promise.all([
      this.prisma.alokasiGajiTA.findMany({
        where: { pegawai_id: pegawai.id },
        include: {
          ro: { select: { kode_ro: true, nama_ro: true } },
          dana_operasional: { select: { id: true, tahun_fiscal: true } },
        },
        orderBy: [{ periode_tahun: 'desc' }, { periode_bulan: 'desc' }],
        skip: (query.page - 1) * query.limit,
        take: query.limit,
      }),
      this.prisma.alokasiGajiTA.count({ where: { pegawai_id: pegawai.id } }),
    ]);

    return ok('Berhasil mengambil riwayat alokasi', {
      gaji_bulanan: pegawai.gaji_bulanan,
      alokasi: items.map((a) => ({
        id: a.id,
        periode_bulan: a.periode_bulan,
        periode_tahun: a.periode_tahun,
        sumber_dana: a.sumber_dana,
        jumlah: a.jumlah,
        status: a.status,
        keterangan: a.keterangan,
        nama_ro: a.ro ? `${a.ro.kode_ro} - ${a.ro.nama_ro}` : null,
        dana_operasional_id: a.dana_operasional?.id ?? null,
      })),
      pagination: {
        page: query.page,
        limit: query.limit,
        total_datas: total,
        total_pages: Math.ceil(total / query.limit),
      },
    });
  }

  private async findPegawai(user: JwtPayload) {
    return this.prisma.user
      .findUnique({
        where: { id: user.sub },
        select: {
          pegawai: {
            select: { id: true, gaji_bulanan: true, status_aktif: true },
          },
        },
      })
      .then((u) => u?.pegawai ?? null);
  }
}
