import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from '../decorators/roles.decorator.js';
import { Role, ROLE_MAP } from '../enums/role.enum.js';
import { JwtPayload } from '../../auth/user.decorator.js';

@Injectable()
export class RolesGuard implements CanActivate {
  private readonly logger = new Logger(RolesGuard.name);
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<Role[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredRoles || requiredRoles.length === 0) return true;

    const request = context.switchToHttp().getRequest();
    const user = request.user as JwtPayload | undefined;

    if (!user) throw new ForbiddenException('Tidak ada data user pada request');

    const userRole = ROLE_MAP[user.role?.toLowerCase()] ?? (user.role as Role);
    const isAllowed = requiredRoles.includes(userRole);

    if (!isAllowed) {
      this.logger.warn(
        `Akses ditolak: user ${user.email} (role: ${user.role}) ` +
          `tidak memiliki salah satu role: [${requiredRoles.join(', ')}]`,
      );
      throw new ForbiddenException(
        `Akses ditolak. Diperlukan salah satu role: [${requiredRoles.join(', ')}]`,
      );
    }

    return true;
  }
}
