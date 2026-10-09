import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { IsInt, IsObject, Min, IsOptional } from 'class-validator';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard.js';
import { RolesGuard } from '../../common/guards/roles.guard.js';
import { ApiRoles } from '../../common/decorators/api-roles.decorator.js';
import { CurrentUser } from '../../auth/user.decorator.js';
import type { JwtPayload } from '../../auth/user.decorator.js';
import { Role } from '../../common/enums/role.enum.js';
import { FundDistributionService } from '../../common/services/fund-distribution.service.js';
import { KategoriKamar } from '../../common/enums/hris.enum.js';
import { PrismaService } from '../../prisma.module.js';
import { created } from '../../common/utils/response.util.js';

class DistributeMarginDto {
  @IsInt()
  @Min(2000)
  tahun_fiscal: number;

  @IsInt()
  @Min(1)
  total_margin: number;

  @IsObject()
  mapping_koordinator_id: Record<string, string>;
}

class DistribusiMarginSimpleDto {
  @IsInt()
  @Min(2000)
  tahun_fiscal: number;

  @IsInt()
  @Min(1)
  total_margin: number;

  @IsObject()
  @IsOptional()
  mapping_koordinator_id?: Record<string, string>;
}

@ApiTags('Finance')
@Controller('/api/finance')
@UseGuards(JwtAuthGuard, RolesGuard)
export class FinanceController {
  constructor(
    private readonly fundDistribution: FundDistributionService,
    private readonly prisma: PrismaService,
  ) {}

  @Post('distribute-margin')
  @ApiRoles('Distribusi margin otomatis', [Role.Superadmin])
  async distribute(
    @CurrentUser() user: JwtPayload,
    @Body() body: DistributeMarginDto,
  ) {
    await this.fundDistribution.distributeMargin(
      body.tahun_fiscal,
      body.total_margin,
      body.mapping_koordinator_id as Record<KategoriKamar, string>,
      user.sub,
    );
    return created('Berhasil mendistribusikan margin', {
      tahun_fiscal: body.tahun_fiscal,
      total_margin: body.total_margin,
    });
  }

  @Post('distribusi-margin')
  @ApiRoles('Distribusi margin testing', [Role.Superadmin])
  async distribusiMargin(
    @CurrentUser() user: JwtPayload,
    @Body() body: DistribusiMarginSimpleDto,
  ) {
    // Static mapping for testing: resolve unit IDs by kode_unit
    // P1_PNS_NON_PNS -> KOR-02 (Kepegawaian), P2_KP3/OPS_KP3/MULOS_SPI -> KOR-01 (KP3), OPS_KANTOR -> KOR-03 (Bagian Umum)
    let mapping = body.mapping_koordinator_id as
      Record<KategoriKamar, string> | undefined;
    if (!mapping || Object.keys(mapping).length === 0) {
      const [kor1, kor2, kor3] = await Promise.all([
        this.prisma.unitKerja.findUnique({ where: { kode_unit: 'KOR-01' } }),
        this.prisma.unitKerja.findUnique({ where: { kode_unit: 'KOR-02' } }),
        this.prisma.unitKerja.findUnique({ where: { kode_unit: 'KOR-03' } }),
      ]);
      if (!kor1 || !kor2 || !kor3)
        throw new Error(
          'Unit koordinator KOR-01/KOR-02/KOR-03 tidak ditemukan. Jalankan seeder terlebih dahulu.',
        );
      mapping = {
        P1_PNS_NON_PNS: kor2.id,
        P2_KP3: kor1.id,
        OPS_KANTOR: kor3.id,
        OPS_KP3: kor1.id,
        MULOS_SPI: kor1.id,
      } as Record<KategoriKamar, string>;
    }
    await this.fundDistribution.distributeMargin(
      body.tahun_fiscal,
      body.total_margin,
      mapping as Record<KategoriKamar, string>,
      user.sub,
    );
    return created('Berhasil mendistribusikan margin', {
      tahun_fiscal: body.tahun_fiscal,
      total_margin: body.total_margin,
      mapping,
    });
  }
}
