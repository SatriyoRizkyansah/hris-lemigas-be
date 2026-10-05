import { Module } from '@nestjs/common';
import { RoController } from './ro.controller.js';

@Module({
  controllers: [RoController],
})
export class MasterRoModule {}
