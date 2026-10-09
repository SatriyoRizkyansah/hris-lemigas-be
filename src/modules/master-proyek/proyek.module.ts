import { Module } from '@nestjs/common';
import { ProyekController } from './proyek.controller.js';
import { FundDistributionService } from '../../common/services/fund-distribution.service.js';

@Module({
  controllers: [ProyekController],
  providers: [FundDistributionService],
})
export class MasterProyekModule {}
