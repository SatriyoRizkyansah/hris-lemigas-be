import { Module } from '@nestjs/common';
import { MyProfileController } from './my-profile.controller.js';

@Module({
  controllers: [MyProfileController],
})
export class MyProfileModule {}
