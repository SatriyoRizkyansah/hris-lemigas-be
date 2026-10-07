// Mirror of prisma enums
export enum StatusAktif {
  AKTIF = 'AKTIF',
  NONAKTIF = 'NONAKTIF',
}

export enum TipePegawai {
  PNS = 'PNS',
  ASN = 'ASN',
  OUTSOURCING = 'OUTSOURCING',
  TA = 'TA',
}

export enum TaKategori {
  BIASA = 'BIASA',
  RO = 'RO',
}

export enum StatusRo {
  AKTIF = 'AKTIF',
  NONAKTIF = 'NONAKTIF',
  SELESAI = 'SELESAI',
}

export enum TipeUnit {
  KOORDINATOR = 'KOORDINATOR',
  SUB_KOORDINATOR = 'SUB_KOORDINATOR',
}

export enum SumberDana {
  RO = 'RO',
  OPERASIONAL = 'OPERASIONAL',
}

export enum StatusAlokasi {
  AKTIF = 'AKTIF',
  DIBATALKAN = 'DIBATALKAN',
}

export enum AksiAudit {
  CREATE = 'CREATE',
  UPDATE = 'UPDATE',
  DELETE = 'DELETE',
  ACTIVATE = 'ACTIVATE',
  CANCEL = 'CANCEL',
}
