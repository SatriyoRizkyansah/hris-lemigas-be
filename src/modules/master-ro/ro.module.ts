import { Module } from '@nestjs/common';
import { RoController } from './ro.controller.js';
import { RoTransaksiController } from './ro-transaksi.controller.js';

@Module({
  controllers: [RoController, RoTransaksiController],
})
export class MasterRoModule {}
