import { Module } from '@nestjs/common';
import { MasterRekeningController } from './master-rekening.controller.js';
import { RekonsiliasiBankController } from './rekonsiliasi-bank.controller.js';

@Module({
  controllers: [MasterRekeningController, RekonsiliasiBankController],
})
export class RekonsiliasiBankModule {}
