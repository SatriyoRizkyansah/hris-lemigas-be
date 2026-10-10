import {
  BadRequestException,
  Body,
  ConflictException,
  Controller,
  Get,
  NotFoundException,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Prisma, StatusRekonsiliasi } from '@prisma/client';
import { PrismaService } from '../../prisma.module.js';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard.js';
import { RolesGuard } from '../../common/guards/roles.guard.js';
import { ApiRoles } from '../../common/decorators/api-roles.decorator.js';
import { Role } from '../../common/enums/role.enum.js';
import { CurrentUser } from '../../auth/user.decorator.js';
import type { JwtPayload } from '../../auth/user.decorator.js';
import { AuditService } from '../../common/services/audit.service.js';
import { AksiAudit } from '../../common/enums/hris.enum.js';
import { FundService } from '../../common/services/fund.service.js';
import { created, ok } from '../../common/utils/response.util.js';
import {
  CreateRekonsiliasiBankDto,
  RekonsiliasiQueryDto,
} from './rekonsiliasi-bank.dto.js';

const ROLE_FINANCE = [Role.Superadmin, Role.Keuangan];

@ApiTags('Rekonsiliasi Bank')
@Controller('/api/rekonsiliasi')
@UseGuards(JwtAuthGuard, RolesGuard)
export class RekonsiliasiBankController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly fund: FundService,
    private readonly audit: AuditService,
  ) {}

  @Get('saldo-sistem')
  @ApiRoles('Hitung saldo kas virtual sistem', ROLE_FINANCE)
  async getSaldoSistem(@Query() query: RekonsiliasiQueryDto) {
    const tahunFiscal = query.tahun_fiscal ?? new Date().getFullYear();
    return ok(
      'Berhasil menghitung saldo kas virtual sistem',
      await this.fund.calculateTotalSaldoSistem(tahunFiscal, query.rekening_id),
    );
  }

  @Get()
  @ApiRoles('Get riwayat rekonsiliasi bank', ROLE_FINANCE)
  async findAll(@Query() query: RekonsiliasiQueryDto) {
    const data = await this.prisma.rekonsiliasiBank.findMany({
      where: {
        ...(query.rekening_id ? { rekening_id: query.rekening_id } : {}),
        ...(query.tahun_fiscal ? { tahun_fiscal: query.tahun_fiscal } : {}),
      },
      include: {
        rekening: true,
        pemeriksa: { select: { id: true, nama: true, email: true } },
      },
      orderBy: [{ tanggal_rekonsiliasi: 'desc' }, { created_at: 'desc' }],
    });
    return ok('Berhasil mengambil riwayat rekonsiliasi', data);
  }

  @Post()
  @ApiRoles('Buat rekonsiliasi bank', ROLE_FINANCE)
  async create(
    @Body() dto: CreateRekonsiliasiBankDto,
    @CurrentUser() user: JwtPayload,
  ) {
    const rekening = await this.prisma.masterRekening.findUnique({
      where: { id: dto.rekening_id },
    });
    if (!rekening) throw new NotFoundException('Rekening tidak ditemukan');
    if (rekening.status_aktif !== 'AKTIF') {
      throw new BadRequestException('Rekening tidak aktif');
    }

    const tanggal = dto.tanggal_rekonsiliasi
      ? new Date(`${dto.tanggal_rekonsiliasi}T00:00:00.000Z`)
      : new Date(new Date().toISOString().slice(0, 10) + 'T00:00:00.000Z');
    const tahunFiscal = dto.tahun_fiscal ?? tanggal.getUTCFullYear();
    const saldo = await this.fund.calculateTotalSaldoSistem(
      tahunFiscal,
      rekening.id,
    );
    const selisih = dto.saldo_bank - saldo.total_saldo_sistem;
    const status =
      selisih === 0 ? StatusRekonsiliasi.MATCHED : StatusRekonsiliasi.UNMATCHED;

    if (status === StatusRekonsiliasi.UNMATCHED && !dto.keterangan?.trim()) {
      throw new BadRequestException(
        'Keterangan wajib diisi saat saldo tidak cocok',
      );
    }

    try {
      const data = await this.prisma.rekonsiliasiBank.create({
        data: {
          rekening_id: rekening.id,
          tanggal_rekonsiliasi: tanggal,
          tahun_fiscal: tahunFiscal,
          saldo_sistem: saldo.total_saldo_sistem,
          saldo_bank: dto.saldo_bank,
          selisih,
          status,
          keterangan: dto.keterangan?.trim() || null,
          diperiksa_oleh: user.sub,
        },
        include: {
          rekening: true,
          pemeriksa: { select: { id: true, nama: true, email: true } },
        },
      });
      await this.audit.log({
        tabel: 'rekonsiliasi_bank',
        recordId: data.id,
        aksi: AksiAudit.CREATE,
        dilakukanOleh: user.sub,
        dataSesudah: data,
      });
      return created('Rekonsiliasi bank berhasil disimpan', data);
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException(
          'Rekonsiliasi untuk rekening dan tanggal ini sudah ada',
        );
      }
      throw error;
    }
  }
}
