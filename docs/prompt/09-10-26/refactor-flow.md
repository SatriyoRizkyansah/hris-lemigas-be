Please refactor the Backend architecture (NestJS + Prisma) to implement a "Dynamic Master Configuration" for our margin distribution and enable detailed tracking of margin funds back to their source Project. Execute all the following requirements comprehensively in a single go:

### 1. Prisma Schema Overhaul

Update `schema.prisma` to support dynamic margin configurations and financial tracking:

- **Proyek Model:** Add financial fields to declare the contract values upfront: `nilai_kontrak Int @default(0)`, `total_direct_cost Int @default(0)`, and `total_margin Int @default(0)`. Also, add a relation array `dana_transaksi_list DanaTransaksi[]`.
- **PengaturanMargin Model:** Create this new table to replace hardcoded distribution logic. Fields: `id` (Uuid), `kategori_kamar` (KategoriKamar @unique), `nama_kamar` (String), `persentase` (Float), `unit_kerja_id` (String @db.Uuid, referencing UnitKerja), and `updated_at`. (Remember to add the reciprocal `pengaturan_margin_list PengaturanMargin[]` to the `UnitKerja` model).
- **DanaTransaksi Model:** Add `proyek_id String? @db.Uuid` and its relation to the `Proyek` model (`onDelete: SetNull`). This is crucial to track exactly which project a margin injection came from.

### 2. Database Seeding (prisma/seed.ts)

- Remove the old manual `DanaOperasional` seeding (where `kategori_kamar` was 'LAINNYA').
- Seed the new `PengaturanMargin` table with the default 5 BLU buckets to establish the dynamic mapping:
  - `P1_PNS_NON_PNS`: 48.0%, assigned to `unitKor2` (Kepegawaian)
  - `P2_KP3`: 30.0%, assigned to `unitKor1` (KP3/Utara)
  - `OPS_KANTOR`: 17.0%, assigned to `unitKor3` (Umum)
  - `OPS_KP3`: 2.5%, assigned to `unitKor1` (KP3/Utara)
  - `MULOS_SPI`: 2.5%, assigned to `unitKor4` (or any dummy unit for SPI)
- Do not manually seed `DanaOperasional` records anymore. They must only be generated via the auto-distribution service.

### 3. Refactor FundDistributionService

Rewrite the `distributeMargin` method to be dynamic and connected to a Project:

- **Signature:** `distributeMargin(proyekId: string, tahunFiscal: number, totalMargin: number, dibuatOlehId: string, prismaTx?: Prisma.TransactionClient)`
- **Logic:** Fetch the project details. Fetch all active configurations from `PengaturanMargin`. Throw a `BadRequestException` if configurations are empty or if the total percentages don't equal 100%.
- **Distribution Loop:** For each config, calculate `Math.round((config.persentase / 100) * totalMargin)`. Upsert into `DanaOperasional` using `config.unit_kerja_id`, `tahunFiscal`, and `config.kategori_kamar` (incrementing `total_plafon`).
- **Ledger Tracking:** Immediately insert a record into `DanaTransaksi` (Debit) linked to this wallet. Crucially, set `proyek_id: proyekId`, `debit: calculated_amount`, `kredit: 0`, and `nama_kegiatan: "Injeksi Margin dari Proyek [Kode Proyek]"`.

### 4. Proyek Controller & Service Integration

- Update the `POST /master-proyek` endpoint (Create Project) so its DTO accepts `nilai_kontrak`, `total_direct_cost`, and `total_margin`.
- Inside the service, upon successful project creation, immediately invoke `fundDistributionService.distributeMargin(...)` passing the new `project.id` and its `total_margin`.
- Wrap the project creation and the fund distribution inside a single `prisma.$transaction` to ensure atomic consistency (if the margin distribution fails, the project creation must rollback).

Please provide the fully updated `schema.prisma` and the exact TypeScript code changes for `seed.ts`, `FundDistributionService`, and the `Proyek` service/controller.

=============================== FLOW ====================================

sequenceDiagram
autonumber
actor SA as Super Admin
participant API as Proyek Controller
participant DB as Database (Prisma)
participant Service as FundDistributionService

    SA->>API: POST /master-proyek (Kontrak: 1M, Margin: 250Jt)
    API->>DB: Start prisma.$transaction (Kapsul Pelindung)
    API->>DB: 1. INSERT Proyek Baru

    API->>Service: 2. Panggil distributeMargin(ProyekID, 250Jt)

    Service->>DB: 3. SELECT dari tabel PengaturanMargin
    DB-->>Service: Return 5 Konfigurasi (48%, 30%, 17%, 2.5%, 2.5%)

    rect rgb(30, 41, 59)
        note right of Service: Looping 5x untuk setiap Kategori Kamar
        loop Distribusi per Kategori
            Service->>Service: 4. Hitung Porsi (Misal: 17% x 250Jt = 42.5Jt)
            Service->>DB: 5. UPSERT DanaOperasional (Tambah total_plafon +42.5Jt)
            Service->>DB: 6. INSERT DanaTransaksi (DEBIT +42.5Jt, Set proyek_id = ProyekID)
        end
    end

    DB-->>API: Commit Transaction (Berhasil)
    API-->>SA: Response 201 Created (Proyek & Distribusi Sukses)
