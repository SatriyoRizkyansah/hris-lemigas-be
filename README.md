# HRIS LEMIGAS — Backend

Backend HRIS LEMIGAS berbasis **NestJS 12 + Prisma 6 + PostgreSQL**. Mengelola pegawai, unit kerja dinamis (koordinator / sub-koordinator), SK, RO, dana operasional, dan alokasi gaji Tenaga Ahli (TA) sesuai `docs/MASTER_PLAN.md`.

## Fitur

| Modul             | Endpoint                                                       | Keterangan                                                                                          |
| ----------------- | -------------------------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| Auth              | `/api/auth`                                                    | Login JWT, `/me`                                                                                    |
| Master Pegawai    | `/api/pegawai`                                                 | CRUD pegawai (PNS/ASN/Outsourcing/TA), soft delete                                                  |
| Master Unit Kerja | `/api/unit-kerja`                                              | CRUD unit dinamis + `/tree` hierarki                                                                |
| Master Proyek     | `/api/proyek`                                                  | CRUD proyek + jumlah RO                                                                             |
| Master RO         | `/api/ro`                                                      | CRUD RO + saldo (plafon − terpakai)                                                                 |
| Dana Operasional  | `/api/dana-operasional`                                        | CRUD pool operasional per koordinator per tahun                                                     |
| SK                | `/api/sk`                                                      | CRUD SK; aktivasi SK baru otomatis menonaktifkan SK lama & sinkron `unit_kerja` + `jabatan` pegawai |
| Alokasi Gaji TA   | `/api/alokasi-gaji`                                            | CRUD alokasi (RO / Operasional), pembatalan, `/rekap` + `/rekap/export` Excel bulanan               |
| Dashboard         | `/api/dashboard/superadmin`, `/api/dashboard/koordinator-unit` | Ringkasan pegawai, TA, budget per koordinator                                                       |
| Users             | `/api/users`                                                   | CRUD user + role + unit (superadmin)                                                                |
| My Profile        | `/api/my/profile`, `/api/my/sk`, `/api/my/alokasi`             | Profil, riwayat SK & alokasi untuk semua role                                                       |

## Aturan Bisnis (RO & Dana Operasional)

1. **RO (Rencana Operasional)** — dibuat koordinator, terikat pada proyek + tahun fiscal. Saldo sisa = `total_plafon − Σ alokasi AKTIF`. `total_plafon` tidak boleh kurang dari yang sudah terpakai.
2. **Dana Operasional** — satu pool per koordinator per tahun fiscal (`@@unique([unit_koordinator_id, tahun_fiscal])`).
3. **Alokasi Gaji TA** — per TA per periode (bulan/tahun):
   - Total alokasi **≤ `gaji_bulanan`** TA (boleh split sumber, contoh 60% RO + 40% Operasional).
   - **RO hanya boleh membayar TA di lingkungan koordinator yang sama** (`ro.unit_koordinator_id` = akar unit koordinator TA).
   - **Dana operasional hanya dari koordinator yang sama**, `tahun_fiscal` harus sama dengan periode alokasi.
   - Pembatalan alokasi otomatis mengembalikan saldo sumber dana.
4. **SK** — satu SK aktif per pegawai. Mengaktifkan SK baru otomatis menonaktifkan SK aktif sebelumnya (tetap tersimpan sebagai riwayat) dan memperbarui `unit_kerja_id` + `jabatan` pegawai. Pegawai wajib memiliki unit kerja aktif (via SK) agar alokasi gaji dapat dibuat.
5. **Audit trail** — semua perubahan (create/update/delete/activate/cancel) dicatat ke `audit_log` beserta data sebelum & sesudah, di dalam transaksi.

## Role

| Role          | Akses                                                                              |
| ------------- | ---------------------------------------------------------------------------------- |
| `SUPERADMIN`  | CRUD penuh lintas koordinator, dashboard semua unit                                |
| `KOORDINATOR` | Kelola unit miliknya + sub unit, RO, dana operasional, alokasi TA di lingkungannya |
| `KARYAWAN`    | Profil, riwayat SK, riwayat alokasi sendiri (read-only)                            |

## Project Setup

```bash
# 1. Install dependencies
npm install

# 2. Siapkan file .env (contoh .env.example)
DATABASE_URL="postgresql://user:pass@localhost:5432/hris_lemigas"
JWT_SECRET=isi-secret-random
JWT_EXPIRES_IN=7d
PASSWORD_BYPASS=devByPass
PORT=3001

# 3. Generate Prisma client + migration + seed
npm run prisma:generate
npx prisma migrate dev --name init_hris
npm run prisma:seed

# 4. Jalankan dev server
npm run start:dev
```

- Swagger: `http://localhost:3001/api/webapp-docs`
- Health check: `http://localhost:3001/api/health`

## Akun Demo (hasil seed)

| Email                             | Role        | Keterangan                               |
| --------------------------------- | ----------- | ---------------------------------------- |
| `superadmin@lemigas.esdm.go.id`   | Superadmin  | Akses penuh                              |
| `budi.santoso@lemigas.esdm.go.id` | Koordinator | Unit KOR-01 (Wilayah Kerja) + 2 sub unit |
| `siti.rahayu@lemigas.esdm.go.id`  | Koordinator | Unit KOR-02 (SDM) + 2 sub unit           |
| `andi.pratama@kontrak.co.id`      | Karyawan    | TA, unit WK-01                           |
| `agus.wijaya@lemigas.esdm.go.id`  | Karyawan    | PNS, unit WK-01                          |

Password semua akun: `password123`. Di lingkungan dev, password apa pun yang sama dengan isi `PASSWORD_BYPASS` (default `devByPass`) juga diterima.

Seed berisi: 2 unit koordinator + 4 sub koordinator, 15 pegawai (PNS/ASN/Outsourcing/TA), 3 proyek, 5 RO, 2 dana operasional, dan alokasi gaji Juli 2026 (termasuk split 60/40 RO–Operasional).

## Struktur Modul

```
src/
├── common/          # Global: enums, decorators, guards, services (audit, fund, unit-scope, alokasi-validation, file), utils
├── auth/            # Login JWT, strategy, guard
├── modules/
│   ├── master-pegawai/       # CRUD pegawai
│   ├── master-unit/          # CRUD unit kerja dinamis + tree
│   ├── master-proyek/        # CRUD proyek
│   ├── master-ro/            # CRUD RO + saldo
│   ├── master-dana-operasional/
│   ├── sk/                   # SK + aktivasi (transaksi)
│   ├── alokasi-gaji/         # Alokasi TA + rekap + export Excel
│   ├── dashboard/
│   ├── users/
│   └── my-profile/
├── other/           # Swagger scheme helpers, operation helper
├── prisma.module.ts
└── main.ts          # Swagger "HRIS LEMIGAS API"
```

## Perintah Lain

```bash
npm run lint          # oxlint
npm run test          # vitest
npm run test:e2e      # e2e
npm run format        # prettier
npm run prisma:migrate  # prisma migrate dev
```
# hris-lemigas-be
