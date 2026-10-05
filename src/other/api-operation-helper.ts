import { Role, ROLE_LABEL } from '../common/enums/role.enum.js';

/**
 * Helper untuk membuat summary dengan role yang otomatis
 */
export function createApiOperationSummary(
  baseSummary: string,
  roles: Role | Role[],
): string {
  const roleArray = Array.isArray(roles) ? roles : [roles];
  const roleStrings = roleArray.map((role) => ROLE_LABEL[role] ?? role);

  let roleText: string;
  if (roleStrings.length === 1) {
    roleText = roleStrings[0];
  } else if (roleStrings.length === 2) {
    roleText = roleStrings.join(' dan ');
  } else {
    roleText = `${roleStrings.slice(0, -1).join(', ')}, dan ${
      roleStrings[roleStrings.length - 1]
    }`;
  }

  return `${baseSummary} (${roleText})`;
}

/**
 * Helper untuk membuat ApiOperation dengan summary otomatis
 */
export function createApiOperation(
  baseSummary: string,
  operationId: string,
  roles: Role | Role[],
) {
  return {
    summary: createApiOperationSummary(baseSummary, roles),
    operationId,
  };
}
