import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { PrismaService } from './prisma.module.js';

@ApiTags('Health')
@Controller('/api/health')
export class HealthController {
  constructor(private readonly prisma: PrismaService) {}

  @ApiOperation({
    summary: 'api health check',
    operationId: 'healthCheck',
  })
  @Get()
  async health() {
    const dbStatus = await this.prisma.$queryRaw`SELECT 1 AS status`;
    return {
      status: dbStatus ? 'ok' : 'error',
      database: dbStatus ? 'connected' : 'disconnected',
    };
  }
}
