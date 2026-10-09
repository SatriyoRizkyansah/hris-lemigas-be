import { Controller, Post, Body, Get, UseGuards } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiOkResponse,
} from '@nestjs/swagger';
import { AuthService } from './auth.service.js';
import { LoginDto, LoginUserDto } from './dto/auth.dto.js';
import { JwtAuthGuard } from './jwt-auth.guard.js';
import { CurrentUser } from './user.decorator.js';
import type { JwtPayload } from './user.decorator.js';

@ApiTags('Auth')
@Controller('/api/auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  @ApiOperation({
    summary: 'Login user dan dapatkan JWT token',
    operationId: 'loginUser',
  })
  @ApiOkResponse({ type: LoginUserDto })
  async login(@Body() dto: LoginDto): Promise<LoginUserDto> {
    return this.authService.login(dto);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Dapatkan data user dari token JWT',
    operationId: 'getCurrentUser',
  })
  async getMe(@CurrentUser() user: JwtPayload) {
    return {
      id: user.sub,
      email: user.email,
      nama: user.nama,
      role: user.role,
      roles: user.roles ?? [user.role],
      unitKerjaId: user.unitKerjaId ?? null,
    };
  }
}
