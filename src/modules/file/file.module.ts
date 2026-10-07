import { Module } from '@nestjs/common';
import { FileController } from './file.controller.js';

@Module({
  controllers: [FileController],
})
export class FileModule {}
