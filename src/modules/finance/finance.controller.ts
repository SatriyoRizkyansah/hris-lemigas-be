import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { IsInt, IsObject, IsString, Min } from 'class-validator';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard.js';
import { RolesGuard } from '../../common/guards/roles.guard.js';
import { ApiRoles } from '../../common/decorators/api-roles.decorator.js';
import { CurrentUser } from '../../auth/user.decorator.js';
import type { JwtPayload } from '../../auth/user.decorator.js';
import { Role } from '../../common/enums/role.enum.js';
import { FundDistributionService } from '../../common/services/fund-distribution.service.js';
import { KategoriKamar } from '../../common/enums/hris.enum.js';
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

@ApiTags('Finance')
@Controller('/api/finance')
@UseGuards(JwtAuthGuard, RolesGuard)
export class FinanceController {
  constructor(private readonly fundDistribution: FundDistributionService) {}

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
}
