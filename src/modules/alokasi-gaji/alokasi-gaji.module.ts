import { Module } from '@nestjs/common';
import { AlokasiGetController } from './alokasi-gaji-get.controller.js';
import { AlokasiPostController } from './alokasi-gaji-post.controller.js';
import { AlokasiPutController } from './alokasi-gaji-put.controller.js';
import { AlokasiDeleteController } from './alokasi-gaji-delete.controller.js';
import { AlokasiRekapController } from './alokasi-rekap.controller.js';

@Module({
  controllers: [
    AlokasiGetController,
    AlokasiPostController,
    AlokasiPutController,
    AlokasiDeleteController,
    AlokasiRekapController,
  ],
})
export class AlokasiGajiModule {}
