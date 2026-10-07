import { Module } from '@nestjs/common';
import { PegawaiGetController } from './pegawai-get.controller.js';
import { PegawaiPostController } from './pegawai-post.controller.js';
import { PegawaiPutController } from './pegawai-put.controller.js';
import { PegawaiDeleteController } from './pegawai-delete.controller.js';
import { PegawaiPenempatanController } from './pegawai-penempatan.controller.js';

@Module({
  controllers: [
    PegawaiPenempatanController,
    PegawaiGetController,
    PegawaiPostController,
    PegawaiPutController,
    PegawaiDeleteController,
  ],
})
export class MasterPegawaiModule {}
