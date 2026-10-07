import { Module } from '@nestjs/common';
import { DanaOperasionalController } from './dana-operasional.controller.js';
import { DanaTransaksiController } from './dana-transaksi.controller.js';

@Module({
  controllers: [DanaOperasionalController, DanaTransaksiController],
})
export class MasterDanaOperasionalModule {}
