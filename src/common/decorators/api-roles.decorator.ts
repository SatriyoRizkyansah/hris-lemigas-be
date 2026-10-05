import { applyDecorators } from '@nestjs/common';
import { ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { Roles, rolesSummary } from './roles.decorator.js';
import { Role } from '../enums/role.enum.js';

export function ApiRoles(summary: string, roles: Role[], description?: string) {
  return applyDecorators(
    ApiBearerAuth(),
    ApiOperation({
      summary: rolesSummary(summary, roles),
      ...(description ? { description } : {}),
    }),
    Roles(...roles),
  );
}
