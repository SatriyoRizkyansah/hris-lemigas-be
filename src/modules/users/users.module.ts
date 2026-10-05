import { Module } from '@nestjs/common';
import { UsersGetController } from './users-get.controller.js';
import { UsersPostController } from './users-post.controller.js';
import { UsersPutController } from './users-put.controller.js';

@Module({
  controllers: [UsersGetController, UsersPostController, UsersPutController],
})
export class UsersModule {}
