import { Module } from '@nestjs/common';
import { ProyekController } from './proyek.controller.js';

@Module({
  controllers: [ProyekController],
})
export class MasterProyekModule {}
