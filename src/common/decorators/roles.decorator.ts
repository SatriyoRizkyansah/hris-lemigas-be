import { SetMetadata } from '@nestjs/common';
import { Role } from '../enums/role.enum.js';

export const ROLES_KEY = 'roles';

export const Roles = (...roles: Role[]) => SetMetadata(ROLES_KEY, roles);

export function rolesSummary(base: string, roles: Role[]): string {
  if (!roles.length) return base;
  const names = roles.map((r) => {
    switch (r) {
      case Role.Superadmin:
        return 'Superadmin';
      case Role.Koordinator:
        return 'Koordinator';
      case Role.Karyawan:
        return 'Karyawan';
      default:
        return r;
    }
  });
  return `${base} (${names.join(', ')})`;
}
