export enum Role {
  Superadmin = 'SUPERADMIN',
  Koordinator = 'KOORDINATOR',
  Karyawan = 'KARYAWAN',
  Keuangan = 'KEUANGAN',
}

export const ROLE_MAP: Record<string, Role> = {
  superadmin: Role.Superadmin,
  koordinator: Role.Koordinator,
  karyawan: Role.Karyawan,
  keuangan: Role.Keuangan,
};

export const ROLE_LABEL: Record<Role, string> = {
  [Role.Superadmin]: 'Superadmin',
  [Role.Koordinator]: 'Koordinator',
  [Role.Karyawan]: 'Karyawan',
  [Role.Keuangan]: 'Keuangan',
};
