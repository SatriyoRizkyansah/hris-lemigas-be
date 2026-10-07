import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();
const PASSWORD = 'password123';

async function main() {
  console.log('🌱 Seeding HRIS LEMIGAS...');

  const passwordHash = await bcrypt.hash(PASSWORD, 10);

  // ─── Roles ─────────────────────────────────────────────────────────────
  const roleSuperadmin = await prisma.role.upsert({
    where: { kode: 'SUPERADMIN' },
    update: {},
    create: {
      kode: 'SUPERADMIN',
      nama: 'Superadmin',
      deskripsi: 'Akses penuh seluruh modul lintas koordinator',
    },
  });
  const roleKoordinator = await prisma.role.upsert({
    where: { kode: 'KOORDINATOR' },
    update: {},
    create: {
      kode: 'KOORDINATOR',
      nama: 'Koordinator',
      deskripsi:
        'Mengelola unit kerja (termasuk sub unit), RO, dana operasional, alokasi gaji TA',
    },
  });
  const roleKaryawan = await prisma.role.upsert({
    where: { kode: 'KARYAWAN' },
    update: {},
    create: {
      kode: 'KARYAWAN',
      nama: 'Karyawan',
      deskripsi: 'Melihat profil, SK, dan alokasi gaji sendiri',
    },
  });

  // ─── Unit Kerja (2 koordinator + 4 sub koordinator) ───────────────────
  const unitKor1 = await prisma.unitKerja.upsert({
    where: { kode_unit: 'KOR-01' },
    update: { nama_unit: 'Unit Koordinator Pengelolaan Wilayah Kerja' },
    create: {
      kode_unit: 'KOR-01',
      nama_unit: 'Unit Koordinator Pengelolaan Wilayah Kerja',
      tipe_unit: 'KOORDINATOR',
    },
  });
  const unitKor2 = await prisma.unitKerja.upsert({
    where: { kode_unit: 'KOR-02' },
    update: { nama_unit: 'Unit Koordinator Pengelolaan Sumber Daya Manusia' },
    create: {
      kode_unit: 'KOR-02',
      nama_unit: 'Unit Koordinator Pengelolaan Sumber Daya Manusia',
      tipe_unit: 'KOORDINATOR',
    },
  });
  const unitKor3 = await prisma.unitKerja.upsert({
    where: { kode_unit: 'KOR-03' },
    update: { nama_unit: 'Koordinator Bagian Umum' },
    create: {
      kode_unit: 'KOR-03',
      nama_unit: 'Koordinator Bagian Umum',
      tipe_unit: 'KOORDINATOR',
    },
  });
  const unitKor4 = await prisma.unitKerja.upsert({
    where: { kode_unit: 'KOR-04' },
    update: { nama_unit: 'Koordinator Pelayanan Jasa' },
    create: {
      kode_unit: 'KOR-04',
      nama_unit: 'Koordinator Pelayanan Jasa',
      tipe_unit: 'KOORDINATOR',
    },
  });
  const unitKor5 = await prisma.unitKerja.upsert({
    where: { kode_unit: 'KOR-05' },
    update: { nama_unit: 'Koordinator Pelayanan Migas' },
    create: {
      kode_unit: 'KOR-05',
      nama_unit: 'Koordinator Pelayanan Migas Minyak dan Gas Bumi',
      tipe_unit: 'KOORDINATOR',
    },
  });
  const unitKor6 = await prisma.unitKerja.upsert({
    where: { kode_unit: 'KOR-06' },
    update: { nama_unit: 'Koordinator Pengolahan Migas' },
    create: {
      kode_unit: 'KOR-06',
      nama_unit: 'Koordinator Pengolahan Migas Minyak dan Gas Bumi',
      tipe_unit: 'KOORDINATOR',
    },
  });
  const unitKor7 = await prisma.unitKerja.upsert({
    where: { kode_unit: 'KOR-07' },
    update: { nama_unit: 'Koordinator Pengolahan Migas' },
    create: {
      kode_unit: 'KOR-07',
      nama_unit: 'Koordinator Pengolahan Migas Minyak dan Gas Bumi',
      tipe_unit: 'KOORDINATOR',
    },
  });
  const unitKor8 = await prisma.unitKerja.upsert({
    where: { kode_unit: 'KOR-08' },
    update: { nama_unit: 'Koordinator Pengembangan Aset' },
    create: {
      kode_unit: 'KOR-08',
      nama_unit: 'Koordinator Pengembangan Aset Minyak dan Gas Bumi',
      tipe_unit: 'KOORDINATOR',
    },
  });

  const unitWK1 = await prisma.unitKerja.upsert({
    where: { kode_unit: 'WK-01' },
    update: { parent_unit_id: unitKor1.id },
    create: {
      kode_unit: 'WK-01',
      nama_unit: 'Sub Koordinator Wilayah Kerja Utara',
      tipe_unit: 'SUB_KOORDINATOR',
      parent_unit_id: unitKor1.id,
    },
  });
  const unitWK2 = await prisma.unitKerja.upsert({
    where: { kode_unit: 'WK-02' },
    update: { parent_unit_id: unitKor1.id },
    create: {
      kode_unit: 'WK-02',
      nama_unit: 'Sub Koordinator Wilayah Kerja Selatan',
      tipe_unit: 'SUB_KOORDINATOR',
      parent_unit_id: unitKor1.id,
    },
  });
  const unitSDM1 = await prisma.unitKerja.upsert({
    where: { kode_unit: 'SDM-01' },
    update: { parent_unit_id: unitKor2.id },
    create: {
      kode_unit: 'SDM-01',
      nama_unit: 'Sub Koordinator Rekrutmen',
      tipe_unit: 'SUB_KOORDINATOR',
      parent_unit_id: unitKor2.id,
    },
  });
  const unitSDM2 = await prisma.unitKerja.upsert({
    where: { kode_unit: 'SDM-02' },
    update: { parent_unit_id: unitKor2.id },
    create: {
      kode_unit: 'SDM-02',
      nama_unit: 'Sub Koordinator Pengembangan',
      tipe_unit: 'SUB_KOORDINATOR',
      parent_unit_id: unitKor2.id,
    },
  });

  const subUmum1 = await prisma.unitKerja.upsert({
    where: { kode_unit: 'UM-01' },
    update: { parent_unit_id: unitKor3.id },
    create: {
      kode_unit: 'UM-01',
      nama_unit: 'Sub Koordinator Pembinaan Aparatur & Pengembangan Kompetensi',
      tipe_unit: 'SUB_KOORDINATOR',
      parent_unit_id: unitKor3.id,
    },
  });
  const subUmum2 = await prisma.unitKerja.upsert({
    where: { kode_unit: 'UM-02' },
    update: { parent_unit_id: unitKor3.id },
    create: {
      kode_unit: 'UM-02',
      nama_unit: 'Sub Koordinator Perencanaan',
      tipe_unit: 'SUB_KOORDINATOR',
      parent_unit_id: unitKor3.id,
    },
  });
  const subSDM1 = await prisma.unitKerja.upsert({
    where: { kode_unit: 'SDM-03' },
    update: { parent_unit_id: unitKor4.id },
    create: {
      kode_unit: 'SDM-03',
      nama_unit: 'Sub Koordinator Rekrutmen',
      tipe_unit: 'SUB_KOORDINATOR',
      parent_unit_id: unitKor4.id,
    },
  });
  const subSDM2 = await prisma.unitKerja.upsert({
    where: { kode_unit: 'SDM-04' },
    update: { parent_unit_id: unitKor4.id },
    create: {
      kode_unit: 'SDM-04',
      nama_unit: 'Sub Koordinator Pengembangan',
      tipe_unit: 'SUB_KOORDINATOR',
      parent_unit_id: unitKor4.id,
    },
  });
  const subWK1 = await prisma.unitKerja.upsert({
    where: { kode_unit: 'WK-03' },
    update: { parent_unit_id: unitKor5.id },
    create: {
      kode_unit: 'WK-03',
      nama_unit: 'Sub Koordinator Wilayah Kerja Utara',
      tipe_unit: 'SUB_KOORDINATOR',
      parent_unit_id: unitKor5.id,
    },
  });
  const subWK2 = await prisma.unitKerja.upsert({
    where: { kode_unit: 'WK-04' },
    update: { parent_unit_id: unitKor5.id },
    create: {
      kode_unit: 'WK-04',
      nama_unit: 'Sub Koordinator Wilayah Kerja Selatan',
      tipe_unit: 'SUB_KOORDINATOR',
      parent_unit_id: unitKor5.id,
    },
  });
  const subKor6 = await prisma.unitKerja.upsert({
    where: { kode_unit: 'KOR-07' },
    update: { parent_unit_id: unitKor6.id },
    create: {
      kode_unit: 'KOR-07',
      nama_unit: 'Sub Koordinator Pengolahan Migas',
      tipe_unit: 'SUB_KOORDINATOR',
      parent_unit_id: unitKor6.id,
    },
  });
  const subKor7 = await prisma.unitKerja.upsert({
    where: { kode_unit: 'KOR-08' },
    update: { parent_unit_id: unitKor7.id },
    create: {
      kode_unit: 'KOR-08',
      nama_unit: 'Sub Koordinator Pengolahan Migas',
      tipe_unit: 'SUB_KOORDINATOR',
      parent_unit_id: unitKor7.id,
    },
  });
  const subKor8 = await prisma.unitKerja.upsert({
    where: { kode_unit: 'KOR-09' },
    update: { parent_unit_id: unitKor8.id },
    create: {
      kode_unit: 'KOR-09',
      nama_unit: 'Sub Koordinator Pengembangan Aset',
      tipe_unit: 'SUB_KOORDINATOR',
      parent_unit_id: unitKor8.id,
    },
  });

  // ─── Pegawai (15: 2 koordinator, 4 sub-koordinator, 5 PNS/ASN/Outsourcing, 4 TA) ─
  const pegawaiData: Array<{
    nip_nik: string;
    nama: string;
    tipe: 'PNS' | 'ASN' | 'OUTSOURCING' | 'TA';
    jabatan: string;
    email: string;
    unitId: string;
    gaji: number;
    bidang?: string;
  }> = [
    {
      nip_nik: '196801011992031001',
      nama: 'Ir. Budi Santoso, M.M.',
      tipe: 'PNS',
      jabatan: 'Koordinator Pengelolaan Wilayah Kerja',
      email: 'budi.santoso@lemigas.esdm.go.id',
      unitId: unitKor1.id,
      gaji: 15000000,
    },
    {
      nip_nik: '197102151998031002',
      nama: 'Dra. Siti Rahayu, M.Si.',
      tipe: 'PNS',
      jabatan: 'Koordinator Pengelolaan SDM',
      email: 'siti.rahayu@lemigas.esdm.go.id',
      unitId: unitKor2.id,
      gaji: 15000000,
    },
    {
      nip_nik: '197503102002031003',
      nama: 'Agus Wijaya, S.T.',
      tipe: 'PNS',
      jabatan: 'Sub Koordinator Wilayah Kerja Utara',
      email: 'agus.wijaya@lemigas.esdm.go.id',
      unitId: unitWK1.id,
      gaji: 10000000,
    },
    {
      nip_nik: '197811022005031004',
      nama: 'Rina Marlina, S.E.',
      tipe: 'PNS',
      jabatan: 'Sub Koordinator Wilayah Kerja Selatan',
      email: 'rina.marlina@lemigas.esdm.go.id',
      unitId: unitWK2.id,
      gaji: 10000000,
    },
    {
      nip_nik: '198002202008031005',
      nama: 'Hendra Gunawan, S.Kom.',
      tipe: 'ASN',
      jabatan: 'Sub Koordinator Rekrutmen',
      email: 'hendra.gunawan@lemigas.esdm.go.id',
      unitId: unitSDM1.id,
      gaji: 9000000,
    },
    {
      nip_nik: '198209152010032006',
      nama: 'Dewi Lestari, S.Psi.',
      tipe: 'ASN',
      jabatan: 'Sub Koordinator Pengembangan',
      email: 'dewi.lestari@lemigas.esdm.go.id',
      unitId: unitSDM2.id,
      gaji: 9000000,
    },
    {
      nip_nik: 'OUT-001',
      nama: 'Rudi Hartono',
      tipe: 'OUTSOURCING',
      jabatan: 'Staf Administrasi Wilayah Utara',
      email: 'rudi.hartono@vendor.co.id',
      unitId: unitWK1.id,
      gaji: 5500000,
    },
    {
      nip_nik: 'OUT-002',
      nama: 'Maya Putri',
      tipe: 'OUTSOURCING',
      jabatan: 'Staf Administrasi Wilayah Selatan',
      email: 'maya.putri@vendor.co.id',
      unitId: unitWK2.id,
      gaji: 5500000,
    },
    {
      nip_nik: 'OUT-003',
      nama: 'Joko Susilo',
      tipe: 'OUTSOURCING',
      jabatan: 'Staf Data Rekrutmen',
      email: 'joko.susilo@vendor.co.id',
      unitId: unitSDM1.id,
      gaji: 5000000,
    },
    {
      nip_nik: 'OUT-004',
      nama: 'Ratna Dewi',
      tipe: 'OUTSOURCING',
      jabatan: 'Staf Administrasi Pengembangan',
      email: 'ratna.dewi@vendor.co.id',
      unitId: unitSDM2.id,
      gaji: 5000000,
    },
    {
      nip_nik: 'TA-001',
      nama: 'Andi Pratama',
      tipe: 'TA',
      jabatan: 'Teknisi Wilayah Utara',
      email: 'andi.pratama@kontrak.co.id',
      unitId: unitWK1.id,
      gaji: 4500000,
      bidang: 'Teknik Perkapalan',
    },
    {
      nip_nik: 'TA-002',
      nama: 'Sari Ningsih',
      tipe: 'TA',
      jabatan: 'Analis Wilayah Selatan',
      email: 'sari.ningsih@kontrak.co.id',
      unitId: unitWK2.id,
      gaji: 5000000,
      bidang: 'Analisis Data Energi',
    },
    {
      nip_nik: 'TA-003',
      nama: 'Bayu Saputra',
      tipe: 'TA',
      jabatan: 'Staf Rekrutmen',
      email: 'bayu.saputra@kontrak.co.id',
      unitId: unitSDM1.id,
      gaji: 4000000,
      bidang: 'Psikologi Industri',
    },
    {
      nip_nik: 'TA-004',
      nama: 'Citra Ayu',
      tipe: 'TA',
      jabatan: 'Staf Pelatihan',
      email: 'citra.ayu@kontrak.co.id',
      unitId: unitSDM2.id,
      gaji: 4200000,
      bidang: 'Andragogi',
    },
  ];

  // Generate additional generic staff to ensure each koordinator has ~20 employees
  const koordinatorUnits = [
    unitKor1,
    unitKor2,
    unitKor3,
    unitKor4,
    unitKor5,
    unitKor6,
    unitKor7,
    unitKor8,
  ];
  koordinatorUnits.forEach((kor, idx) => {
    for (let i = 1; i <= 12; i++) {
      pegawaiData.push({
        nip_nik: `KOR${idx + 1}-${i.toString().padStart(2, '0')}`,
        nama: `Staff Koordinator ${idx + 1} ${i}`,
        tipe: 'PNS',
        jabatan: `Staf Administrasi Koordinator ${idx + 1} ${i}`,
        email: `staff${idx + 1}_${i}@lemigas.esdm.go.id`,
        unitId: kor.id,
        gaji: 12000000,
      });
    }
  });

  const pegawaiMap = new Map<string, string>();
  for (const p of pegawaiData) {
    const existing = await prisma.pegawai.upsert({
      where: { nip_nik: p.nip_nik },
      update: {
        nama: p.nama,
        tipe_pegawai: p.tipe,
        jabatan: p.jabatan,
        email: p.email,
        gaji_bulanan: p.gaji,
        bidang_keahlian: p.bidang ?? null,
      },
      create: {
        nip_nik: p.nip_nik,
        nama: p.nama,
        tipe_pegawai: p.tipe,
        jabatan: p.jabatan,
        email: p.email,
        tanggal_mulai: new Date('2026-01-01'),
        gaji_bulanan: p.gaji,
        bidang_keahlian: p.bidang ?? null,
        ...(p.tipe === 'TA'
          ? {
              kontrak_mulai: new Date('2026-01-01'),
              kontrak_selesai: new Date('2026-12-31'),
            }
          : {}),
      },
    });
    pegawaiMap.set(p.nip_nik, existing.id);
    // homebase penempatan
    const existingPenempatan = await prisma.penempatanPegawai.findFirst({
      where: {
        pegawai_id: existing.id,
        is_homebase: true,
        status_aktif: 'AKTIF',
      },
    });
    if (!existingPenempatan) {
      await prisma.penempatanPegawai.create({
        data: {
          pegawai_id: existing.id,
          unit_kerja_id: p.unitId,
          jabatan: p.jabatan,
          tmt: new Date('2026-01-01'),
          no_sk: `SK/${p.nip_nik}/2026`,
          status_aktif: 'AKTIF',
          is_homebase: true,
          keterangan: 'Homebase',
        },
      });
    } else if (existingPenempatan.unit_kerja_id !== p.unitId) {
      await prisma.penempatanPegawai.update({
        where: { id: existingPenempatan.id },
        data: { unit_kerja_id: p.unitId, jabatan: p.jabatan },
      });
    }
  }

  // ─── SK Aktif (bukti unit kerja & jabatan) ─────────────────────────────
  for (const p of pegawaiData) {
    const pegawaiId = pegawaiMap.get(p.nip_nik)!;
    const nomorSk = `SK/${p.nip_nik}/2026`;
    const existingSk = await prisma.sk.findUnique({
      where: { nomor_sk: nomorSk },
    });
    if (!existingSk) {
      await prisma.sk.create({
        data: {
          nomor_sk: nomorSk,
          tanggal_sk: new Date('2026-01-01'),
          tanggal_efektif: new Date('2026-01-01'),
          tanggal_selesai: p.tipe === 'TA' ? new Date('2026-12-31') : null,
          pegawai_id: pegawaiId,
          unit_kerja_id: p.unitId,
          jabatan: p.jabatan,
          status_aktif: 'AKTIF',
        },
      });
    }
    await prisma.pegawai.update({
      where: { id: pegawaiId },
      data: { jabatan: p.jabatan },
    });
  }

  // ─── Kepala unit ───────────────────────────────────────────────────────
  await prisma.unitKerja.update({
    where: { id: unitKor1.id },
    data: { kepala_unit_id: pegawaiMap.get('196801011992031001') },
  });
  await prisma.unitKerja.update({
    where: { id: unitKor2.id },
    data: { kepala_unit_id: pegawaiMap.get('197102151998031002') },
  });
  await prisma.unitKerja.update({
    where: { id: unitWK1.id },
    data: { kepala_unit_id: pegawaiMap.get('197503102002031003') },
  });
  await prisma.unitKerja.update({
    where: { id: unitWK2.id },
    data: { kepala_unit_id: pegawaiMap.get('197811022005031004') },
  });
  await prisma.unitKerja.update({
    where: { id: unitSDM1.id },
    data: { kepala_unit_id: pegawaiMap.get('198002202008031005') },
  });
  await prisma.unitKerja.update({
    where: { id: unitSDM2.id },
    data: { kepala_unit_id: pegawaiMap.get('198209152010032006') },
  });

  // ─── Users ─────────────────────────────────────────────────────────────
  const userSuperadmin = await prisma.user.upsert({
    where: { email: 'superadmin@lemigas.esdm.go.id' },
    update: { nama: 'Super Admin', role_id: roleSuperadmin.id },
    create: {
      email: 'superadmin@lemigas.esdm.go.id',
      nama: 'Super Admin',
      password_hash: passwordHash,
      role_id: roleSuperadmin.id,
    },
  });
  void userSuperadmin;

  await prisma.user.upsert({
    where: { email: 'budi.santoso@lemigas.esdm.go.id' },
    update: {
      role_id: roleKoordinator.id,
      unit_kerja_id: unitKor1.id,
      pegawai_id: pegawaiMap.get('196801011992031001'),
    },
    create: {
      email: 'budi.santoso@lemigas.esdm.go.id',
      nama: 'Ir. Budi Santoso, M.M.',
      password_hash: passwordHash,
      role_id: roleKoordinator.id,
      unit_kerja_id: unitKor1.id,
      pegawai_id: pegawaiMap.get('196801011992031001'),
    },
  });
  await prisma.user.upsert({
    where: { email: 'siti.rahayu@lemigas.esdm.go.id' },
    update: {
      role_id: roleKoordinator.id,
      unit_kerja_id: unitKor2.id,
      pegawai_id: pegawaiMap.get('197102151998031002'),
    },
    create: {
      email: 'siti.rahayu@lemigas.esdm.go.id',
      nama: 'Dra. Siti Rahayu, M.Si.',
      password_hash: passwordHash,
      role_id: roleKoordinator.id,
      unit_kerja_id: unitKor2.id,
      pegawai_id: pegawaiMap.get('197102151998031002'),
    },
  });
  await prisma.user.upsert({
    where: { email: 'andi.pratama@kontrak.co.id' },
    update: { role_id: roleKaryawan.id, pegawai_id: pegawaiMap.get('TA-001') },
    create: {
      email: 'andi.pratama@kontrak.co.id',
      nama: 'Andi Pratama',
      password_hash: passwordHash,
      role_id: roleKaryawan.id,
      pegawai_id: pegawaiMap.get('TA-001'),
    },
  });
  await prisma.user.upsert({
    where: { email: 'agus.wijaya@lemigas.esdm.go.id' },
    update: {
      role_id: roleKaryawan.id,
      pegawai_id: pegawaiMap.get('197503102002031003'),
    },
    create: {
      email: 'agus.wijaya@lemigas.esdm.go.id',
      nama: 'Agus Wijaya, S.T.',
      password_hash: passwordHash,
      role_id: roleKaryawan.id,
      pegawai_id: pegawaiMap.get('197503102002031003'),
    },
  });

  // ─── Proyek (3) ────────────────────────────────────────────────────────
  const proyek1 = await prisma.proyek.upsert({
    where: { kode_proyek: 'PRJ-2026-01' },
    update: {},
    create: {
      kode_proyek: 'PRJ-2026-01',
      nama_proyek: 'Pengelolaan Wilayah Kerja Blok Migas Utara',
      tahun_fiscal: 2026,
      sumber_pendanaan: 'APBN',
    },
  });
  const proyek2 = await prisma.proyek.upsert({
    where: { kode_proyek: 'PRJ-2026-02' },
    update: {},
    create: {
      kode_proyek: 'PRJ-2026-02',
      nama_proyek: 'Pengelolaan Wilayah Kerja Blok Migas Selatan',
      tahun_fiscal: 2026,
      sumber_pendanaan: 'APBN',
    },
  });
  const proyek3 = await prisma.proyek.upsert({
    where: { kode_proyek: 'PRJ-2026-03' },
    update: {},
    create: {
      kode_proyek: 'PRJ-2026-03',
      nama_proyek: 'Penguatan Kapasitas SDM Migas',
      tahun_fiscal: 2026,
      sumber_pendanaan: 'APBN',
    },
  });

  // ─── RO (5) ────────────────────────────────────────────────────────────
  const ro1 = await prisma.ro.upsert({
    where: { kode_ro: 'RO/2026/01' },
    update: {},
    create: {
      kode_ro: 'RO/2026/01',
      nama_ro: 'Operasional Wilayah Kerja Utara',
      proyek_id: proyek1.id,
      unit_koordinator_id: unitKor1.id,
      tahun_fiscal: 2026,
      total_plafon: 500000000,
    },
  });
  const ro2 = await prisma.ro.upsert({
    where: { kode_ro: 'RO/2026/02' },
    update: {},
    create: {
      kode_ro: 'RO/2026/02',
      nama_ro: 'Operasional Wilayah Kerja Selatan',
      proyek_id: proyek2.id,
      unit_koordinator_id: unitKor1.id,
      tahun_fiscal: 2026,
      total_plafon: 450000000,
    },
  });
  const ro3 = await prisma.ro.upsert({
    where: { kode_ro: 'RO/2026/03' },
    update: {},
    create: {
      kode_ro: 'RO/2026/03',
      nama_ro: 'Rekrutmen & Seleksi',
      proyek_id: proyek3.id,
      unit_koordinator_id: unitKor2.id,
      tahun_fiscal: 2026,
      total_plafon: 300000000,
    },
  });
  const ro4 = await prisma.ro.upsert({
    where: { kode_ro: 'RO/2026/04' },
    update: {},
    create: {
      kode_ro: 'RO/2026/04',
      nama_ro: 'Pelatihan & Pengembangan',
      proyek_id: proyek3.id,
      unit_koordinator_id: unitKor2.id,
      tahun_fiscal: 2026,
      total_plafon: 250000000,
    },
  });
  const ro5 = await prisma.ro.upsert({
    where: { kode_ro: 'RO/2026/05' },
    update: {},
    create: {
      kode_ro: 'RO/2026/05',
      nama_ro: 'Dukungan Teknis Wilayah',
      proyek_id: proyek1.id,
      unit_koordinator_id: unitKor1.id,
      tahun_fiscal: 2026,
      total_plafon: 200000000,
    },
  });

  // ─── Dana Operasional per koordinator ─────────────────────────────────
  await prisma.danaOperasional.upsert({
    where: {
      unit_koordinator_id_tahun_fiscal: {
        unit_koordinator_id: unitKor1.id,
        tahun_fiscal: 2026,
      },
    },
    update: {},
    create: {
      unit_koordinator_id: unitKor1.id,
      tahun_fiscal: 2026,
      total_plafon: 100000000,
    },
  });
  await prisma.danaOperasional.upsert({
    where: {
      unit_koordinator_id_tahun_fiscal: {
        unit_koordinator_id: unitKor2.id,
        tahun_fiscal: 2026,
      },
    },
    update: {},
    create: {
      unit_koordinator_id: unitKor2.id,
      tahun_fiscal: 2026,
      total_plafon: 80000000,
    },
  });

  // ─── Alokasi Gaji TA (5 TA, termasuk satu split 60/40) ────────────────
  const pembuatKor1 = await prisma.user.findUnique({
    where: { email: 'budi.santoso@lemigas.esdm.go.id' },
  });
  const pembuatKor2 = await prisma.user.findUnique({
    where: { email: 'siti.rahayu@lemigas.esdm.go.id' },
  });
  if (!pembuatKor1 || !pembuatKor2)
    throw new Error('User koordinator tidak ditemukan');

  const alokasiSeeding = [
    // TA-001 Andi (unit WK1 → koordinator 1), gaji 4.500.000 — 60% RO + 40% Operasional
    {
      pegawaiId: pegawaiMap.get('TA-001')!,
      bulan: 7,
      tahun: 2026,
      sumber: 'RO' as const,
      roId: ro1.id,
      danaId: null,
      jumlah: 2700000,
      ket: 'Alokasi RO 60%',
      oleh: pembuatKor1.id,
    },
    {
      pegawaiId: pegawaiMap.get('TA-001')!,
      bulan: 7,
      tahun: 2026,
      sumber: 'OPERASIONAL' as const,
      roId: null,
      danaId: (await prisma.danaOperasional.findUnique({
        where: {
          unit_koordinator_id_tahun_fiscal: {
            unit_koordinator_id: unitKor1.id,
            tahun_fiscal: 2026,
          },
        },
      }))!.id,
      jumlah: 1800000,
      ket: 'Alokasi Operasional 40%',
      oleh: pembuatKor1.id,
    },
    // TA-002 Sari (unit WK2 → koordinator 1), gaji 5.000.000 — full RO
    {
      pegawaiId: pegawaiMap.get('TA-002')!,
      bulan: 7,
      tahun: 2026,
      sumber: 'RO' as const,
      roId: ro2.id,
      danaId: null,
      jumlah: 5000000,
      ket: 'Alokasi RO penuh',
      oleh: pembuatKor1.id,
    },
    // TA-003 Bayu (unit SDM1 → koordinator 2), gaji 4.000.000 — full RO
    {
      pegawaiId: pegawaiMap.get('TA-003')!,
      bulan: 7,
      tahun: 2026,
      sumber: 'RO' as const,
      roId: ro3.id,
      danaId: null,
      jumlah: 4000000,
      ket: 'Alokasi RO penuh',
      oleh: pembuatKor2.id,
    },
    // TA-004 Citra (unit SDM2 → koordinator 2), gaji 4.200.000 — full RO
    {
      pegawaiId: pegawaiMap.get('TA-004')!,
      bulan: 7,
      tahun: 2026,
      sumber: 'RO' as const,
      roId: ro4.id,
      danaId: null,
      jumlah: 4200000,
      ket: 'Alokasi RO penuh',
      oleh: pembuatKor2.id,
    },
    // TA-005 Fajar (unit WK1 → koordinator 1), gaji 3.800.000 — full Operasional
    {
      pegawaiId: pegawaiMap.get('TA-005')!,
      bulan: 7,
      tahun: 2026,
      sumber: 'OPERASIONAL' as const,
      roId: null,
      danaId: (await prisma.danaOperasional.findUnique({
        where: {
          unit_koordinator_id_tahun_fiscal: {
            unit_koordinator_id: unitKor1.id,
            tahun_fiscal: 2026,
          },
        },
      }))!.id,
      jumlah: 3800000,
      ket: 'Alokasi Operasional penuh',
      oleh: pembuatKor1.id,
    },
  ];

  for (const a of alokasiSeeding) {
    const existing = await prisma.alokasiGajiTA.findFirst({
      where: {
        pegawai_id: a.pegawaiId,
        periode_bulan: a.bulan,
        periode_tahun: a.tahun,
        sumber_dana: a.sumber,
        jumlah: a.jumlah,
      },
    });
    if (!existing) {
      await prisma.alokasiGajiTA.create({
        data: {
          pegawai_id: a.pegawaiId,
          periode_bulan: a.bulan,
          periode_tahun: a.tahun,
          sumber_dana: a.sumber,
          ro_id: a.roId,
          dana_operasional_id: a.danaId,
          jumlah: a.jumlah,
          status: 'AKTIF',
          keterangan: a.ket,
          dibuat_oleh: a.oleh,
        },
      });
    }
  }

  console.log('✅ Seeding HRIS LEMIGAS selesai');
  console.log('─'.repeat(50));
  console.log('Akun demo (password: password123 / PASSWORD_BYPASS):');
  console.log('  • superadmin@lemigas.esdm.go.id (Superadmin)');
  console.log('  • budi.santoso@lemigas.esdm.go.id (Koordinator Unit KOR-01)');
  console.log('  • siti.rahayu@lemigas.esdm.go.id (Koordinator Unit KOR-02)');
  console.log('  • andi.pratama@kontrak.co.id (Karyawan/TA)');
  console.log('  • agus.wijaya@lemigas.esdm.go.id (Karyawan/PNS)');
  console.log('─'.repeat(50));
}

main()
  .catch((e) => {
    console.error('❌ Seed gagal:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
