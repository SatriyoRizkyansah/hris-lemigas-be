import { Module } from '@nestjs/common';
import { DanaOperasionalController } from './dana-operasional.controller.js';

@Module({
  controllers: [DanaOperasionalController],
})
export class MasterDanaOperasionalModule {}
