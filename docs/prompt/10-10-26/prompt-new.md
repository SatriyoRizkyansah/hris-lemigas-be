Berikut adalah **Dokumen Ringkasan Spesifikasi Teknis & Prompt Final** yang mencakup seluruh keputusan bisnis, arsitektur *database*, dan alur kerja (*flow*) yang telah kita sepakati bersama.

Dokumen ini disusun lengkap dan siap kamu **salin-tempel (copy-paste)** secara langsung ke AI *developer*-mu (seperti Cursor, Claude, ChatGPT, atau Windsurf) untuk langsung dieksekusi.

---

### 📋 COPY-PASTE PROMPT FOR AI DEVELOPER

```markdown
# TASK SPECIFICATION: FINAL BLU FINANCIAL WORKFLOW & RECONCILIATION IMPLEMENTATION

Please update and implement the backend (NestJS + Prisma) and frontend (React) components to align with our final BLU LEMIGAS Financial Architecture.

---

## 1. CORE BUSINESS RULES SUMMARY
1. **Virtual Wallets vs Physical Bank Accounts:**
   * **RO (Direct Cost):** Restricted virtual wallet linked to a specific `proyek_id`.
   * **Dana Operasional (Margin):** Consolidated virtual wallets distributed automatically across 5 buckets (P1 48%, P2 30%, Ops Kantor 17%, Ops KP3 2.5%, Mulos/SPI 2.5%).
   * **MasterRekening:** Physical bank accounts (e.g., RPL 019 Mandiri). `rekening_id` attaches strictly to `Ro` and `DanaOperasional` models (NOT directly on `Proyek`).

2. **SILPA & Year-End Closing (Closing Fiscal Year):**
   * **RO Carryover Rule:** Unspent RO balances MUST remain strictly bound to their original project (`proyek_id`). They MUST NEVER be transferred or converted into `DanaOperasional`.
   * On Year-End Closing: If a project is still active, create a NEW `Ro` record for the new fiscal year with `is_carryover: true`, `ro_asal_id: [previous_ro_id]`, and `total_plafon: [remaining_balance]`. If the project is marked `SELESAI`, deactivate the RO without carryover.
   * **Dana Operasional SILPA:** Unspent margin balances carry over into the new fiscal year's `DanaOperasional` wallet as a DEBIT transaction (Saldo Awal).

---

## 2. PRISMA SCHEMA ADJUSTMENTS

Ensure the `schema.prisma` reflects the following updates:

```prisma
// MasterRekening (Physical Bank Accounts)
model MasterRekening {
  id              String      @id @default(uuid()) @db.Uuid
  nama_bank       String      @db.VarChar(100)
  nomor_rekening  String      @unique @db.VarChar(100)
  nama_rekening   String      @db.VarChar(200)
  status_aktif    StatusAktif @default(AKTIF)
  created_at      DateTime    @default(now())
  updated_at      DateTime    @updatedAt

  ro_list               Ro[]
  dana_operasional_list DanaOperasional[]
  rekonsiliasi_list      RekonsiliasiBank[]

  @@map("master_rekening")
}

// RO Model with Carryover self-relation and rekening_id
model Ro {
  id                  String          @id @default(uuid()) @db.Uuid
  kode_ro             String          @unique @db.VarChar(50)
  nama_ro             String          @db.VarChar(200)
  proyek_id           String          @db.Uuid
  unit_koordinator_id String          @db.Uuid
  rekening_id         String?         @db.Uuid
  tahun_fiscal        Int
  total_plafon        Int             @default(0)
  status_ro           StatusRo        @default(AKTIF)
  
  // Carryover Tracking
  ro_asal_id          String?         @db.Uuid
  is_carryover        Boolean         @default(false)

  created_at          DateTime        @default(now())
  updated_at          DateTime        @updatedAt

  proyek              Proyek          @relation(fields: [proyek_id], references: [id])
  unit_koordinator    UnitKerja       @relation(fields: [unit_koordinator_id], references: [id])
  rekening            MasterRekening? @relation(fields: [rekening_id], references: [id])
  
  ro_asal             Ro?             @relation("RoCarryover", fields: [ro_asal_id], references: [id])
  ro_turunan_list     Ro[]            @relation("RoCarryover")

  @@map("ro")
}

// DanaOperasional with rekening_id and kategori_kamar
model DanaOperasional {
  id                  String          @id @default(uuid()) @db.Uuid
  unit_koordinator_id String          @db.Uuid
  rekening_id         String?         @db.Uuid
  tahun_fiscal        Int
  total_plafon        Int             @default(0)
  kategori_kamar      KategoriKamar   @default(LAINNYA)

  unit_koordinator    UnitKerja       @relation(fields: [unit_koordinator_id], references: [id])
  rekening            MasterRekening? @relation(fields: [rekening_id], references: [id])

  @@unique([unit_koordinator_id, tahun_fiscal, kategori_kamar])
  @@map("dana_operasional")
}

// Bank Reconciliation Model
model RekonsiliasiBank {
  id                    String              @id @default(uuid()) @db.Uuid
  rekening_id            String              @db.Uuid
  tanggal_rekonsiliasi   DateTime            @db.Date
  tahun_fiscal           Int
  saldo_sistem           Int
  saldo_bank             Int
  selisih                Int
  status                 StatusRekonsiliasi
  keterangan             String?             @db.VarChar(500)
  diperiksa_oleh         String              @db.Uuid
  created_at             DateTime            @default(now())

  rekening  MasterRekening @relation(fields: [rekening_id], references: [id])
  pemeriksa User           @relation(fields: [diperiksa_oleh], references: [id])

  @@unique([rekening_id, tanggal_rekonsiliasi])
  @@map("rekonsiliasi_bank")
}

```

---

## 3. BACKEND & SERVICE LOGIC REQUIREMENTS

### A. Bank Reconciliation Dynamic Balance Calculation (`rekonsiliasi.service.ts`)

* Implement endpoint `GET /rekonsiliasi/saldo-sistem?rekening_id=UUID&tahun_fiscal=YYYY`:
1. `total_ro_balance` = Sum of running balance (`total_plafon - total_kredit`) for all `Ro` records linked to this `rekening_id` in `tahun_fiscal`.
2. `total_dana_balance` = Sum of running balance (`total_plafon - total_kredit`) for all `DanaOperasional` records linked to this `rekening_id` in `tahun_fiscal`.
3. `saldo_sistem` = `total_ro_balance + total_dana_balance`.


* Return `saldo_sistem` to populate the reconciliation modal automatically.

### B. Multi-RO Project Creation (`proyek.service.ts`)

* Wrap inside a single `prisma.$transaction`:
1. Create `Proyek` record. Auto-calculate `total_margin = nilai_kontrak - total_direct_cost`.
2. Bulk insert dynamic `Ro` rows provided in the form array, inheriting `rekening_id` for direct cost tracking.
3. Invoke `FundDistributionService.distributeMargin()` to allocate `total_margin` across 5 `PengaturanMargin` buckets, inheriting their default `rekening_id` set in configuration.



---

## 4. FRONTEND UI & UX SPECIFICATIONS

### A. Refactor Detail RO & Detail Dana Operasional Pages (Tabbed Interface)

* Replace vertical table stacking with a clean **Tabbed View**:
* **Tab 1: "Buku Kas (Ledger)"** (Default tab showing Debit/Kredit transactions with color-coding: `+ Green` for Debit, `- Red/Dark` for Kredit).
* **Tab 2: "Alokasi Gaji TA (Count)"** (Showing TA staff salary allocations for this wallet).
* **Tab 3: "Dokumen & SK"** (Clean card interface for uploaded files).


* Top Header: Display KPI Summary cards (Plafon Awal, Total Pengeluaran, Sisa Saldo) with a **Burn-Rate Visual Progress Bar** under "Total Pengeluaran".

### B. Bank Reconciliation Modal UX Fix (`RekonsiliasiPage.tsx`)

* When user opens **"Rekonsiliasi Baru"** modal and selects a **Rekening Fisik**:
1. Trigger API call to fetch `saldo_sistem` for that specific account.
2. Display the calculated `Saldo Sistem` prominently.
3. Provide a single numeric input: **`Saldo Rekening Koran`** (Physical balance from bank statement).
4. Real-time auto-calculate `Selisih = Saldo Rekening Koran - Saldo Sistem`.
5. Auto-toggle badge: `MATCHED` 🟢 if `Selisih == 0`, or `UNMATCHED` 🔴 if `Selisih != 0` (requiring `Keterangan` input).



Please output the updated NestJS services and React page components.

```

***

### 🎯 Hasil Akhir yang Akan Didapat Setelah Prompt Ini Dijalankan:
1. **Database Rapi:** Relasi `rekening_id` dan *carryover* RO terpasang dengan presisi tanpa merusak data lama.
2. **Form Rekonsiliasi Otomatis:** Kamu tidak perlu bingung lagi saat membuka modal Rekonsiliasi—sistem langsung menghitung saldo virtualnya, dan kamu tinggal mengetik angka cetakan rekening koran dari bank.
3. **Tampilan (UI/UX) Profesional:** Halaman Detail RO dan Dana Operasional berubah dari tadinya bertumpuk jelek menjadi rapi ber-tab (*Tabbed View*) lengkap dengan *burn-rate progress bar*.

```