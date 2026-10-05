import { Module } from '@nestjs/common';
import { SkGetController } from './sk-get.controller.js';
import { SkPostController } from './sk-post.controller.js';
import { SkPutController } from './sk-put.controller.js';
import { SkDeleteController } from './sk-delete.controller.js';

@Module({
  controllers: [
    SkGetController,
    SkPostController,
    SkPutController,
    SkDeleteController,
  ],
})
export class SkModule {}
