import { Module } from '@nestjs/common';
import { FinanceController } from './finance.controller.js';
import { SumberDanaController } from './sumber-dana.controller.js';

@Module({
  controllers: [FinanceController, SumberDanaController],
})
export class FinanceModule {}
