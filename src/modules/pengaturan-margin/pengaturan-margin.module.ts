import { Module } from '@nestjs/common';
import { PengaturanMarginController } from './pengaturan-margin.controller.js';

@Module({
  controllers: [PengaturanMarginController],
})
export class PengaturanMarginModule {}
