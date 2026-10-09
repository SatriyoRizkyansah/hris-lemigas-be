import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { IsInt, Min, IsOptional } from 'class-validator';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard.js';
import { RolesGuard } from '../../common/guards/roles.guard.js';
import { ApiRoles } from '../../common/decorators/api-roles.decorator.js';
import { CurrentUser } from '../../auth/user.decorator.js';
import type { JwtPayload } from '../../auth/user.decorator.js';
import { Role } from '../../common/enums/role.enum.js';
import { FundDistributionService } from '../../common/services/fund-distribution.service.js';
import { PrismaService } from '../../prisma.module.js';
import { created } from '../../common/utils/response.util.js';

class DistributeMarginDto {
  @IsInt()
  @Min(2000)
  tahun_fiscal: number;

  @IsInt()
  @Min(1)
  total_margin: number;

  @IsOptional()
  proyek_id?: string;
}

class DistribusiMarginSimpleDto {
  @IsInt()
  @Min(2000)
  tahun_fiscal: number;

  @IsInt()
  @Min(1)
  total_margin: number;

  @IsOptional()
  proyek_id?: string;
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
    // Dynamic: requires proyek_id, uses PengaturanMargin table
    let proyekId = body.proyek_id;
    if (!proyekId) {
      const proyek = await this.prisma.proyek.findFirst({
        where: { tahun_fiscal: body.tahun_fiscal },
        orderBy: { created_at: 'asc' },
      });
      if (!proyek)
        throw new Error(
          'Proyek tidak ditemukan untuk tahun_fiscal tersebut. Sertakan proyek_id.',
        );
      proyekId = proyek.id;
    }
    await this.fundDistribution.distributeMargin(
      proyekId,
      body.tahun_fiscal,
      body.total_margin,
      user.sub,
    );
    return created('Berhasil mendistribusikan margin', {
      tahun_fiscal: body.tahun_fiscal,
      total_margin: body.total_margin,
      proyek_id: proyekId,
    });
  }

  @Post('distribusi-margin')
  @ApiRoles('Distribusi margin testing', [Role.Superadmin])
  async distribusiMargin(
    @CurrentUser() user: JwtPayload,
    @Body() body: DistribusiMarginSimpleDto,
  ) {
    let proyekId = body.proyek_id;
    if (!proyekId) {
      const proyek = await this.prisma.proyek.findFirst({
        where: { tahun_fiscal: body.tahun_fiscal },
        orderBy: { created_at: 'asc' },
      });
      if (!proyek)
        throw new Error(
          'Proyek tidak ditemukan untuk tahun_fiscal tersebut. Sertakan proyek_id.',
        );
      proyekId = proyek.id;
    }
    await this.fundDistribution.distributeMargin(
      proyekId,
      body.tahun_fiscal,
      body.total_margin,
      user.sub,
    );
    return created('Berhasil mendistribusikan margin', {
      tahun_fiscal: body.tahun_fiscal,
      total_margin: body.total_margin,
      proyek_id: proyekId,
    });
  }
}
