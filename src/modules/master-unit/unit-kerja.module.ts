import { Module } from '@nestjs/common';
import { UnitKerjaGetController } from './unit-kerja-get.controller.js';
import { UnitKerjaPostController } from './unit-kerja-post.controller.js';
import { UnitKerjaPutController } from './unit-kerja-put.controller.js';
import { UnitKerjaDeleteController } from './unit-kerja-delete.controller.js';

@Module({
  controllers: [
    UnitKerjaGetController,
    UnitKerjaPostController,
    UnitKerjaPutController,
    UnitKerjaDeleteController,
  ],
})
export class MasterUnitKerjaModule {}
