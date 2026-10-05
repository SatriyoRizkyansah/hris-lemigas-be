export enum Role {
  Superadmin = 'SUPERADMIN',
  Koordinator = 'KOORDINATOR',
  Karyawan = 'KARYAWAN',
}

export const ROLE_MAP: Record<string, Role> = {
  superadmin: Role.Superadmin,
  koordinator: Role.Koordinator,
  karyawan: Role.Karyawan,
};

export const ROLE_LABEL: Record<Role, string> = {
  [Role.Superadmin]: 'Superadmin',
  [Role.Koordinator]: 'Koordinator',
  [Role.Karyawan]: 'Karyawan',
};
