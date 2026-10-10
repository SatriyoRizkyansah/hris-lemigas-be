Please help me design and implement the next critical module for our BLU HRIS & Finance System: **"Modul Rekonsiliasi Rekening Bank & Kas Tunai" (Bank Reconciliation Module)**.

### 1. The Business Context & Workflow

Currently, our system successfully tracks virtual budgets: **RO (Direct Cost)** and **Dana Operasional (Margin distributed to 5 buckets)**. However, this is only the "Virtual Ledger" (Buku Kas Bendahara). In reality, the physical money sits in real bank accounts (e.g., RPL 019 Bank Mandiri).

We need a Reconciliation Module to bridge the gap between the **System's Virtual Balance** and the **Physical Bank Statement (Rekening Koran)** to detect unrecorded bank fees, taxes, or missing receipts.

**The Flow (Semi-Manual Approach):**

1. **Master Bank Accounts:** The system holds a list of physical BLU bank accounts (e.g., "RPL 019 BLU LEMIGAS UNTUK OPS K.").
2. **Calculate System Balance (Auto):** The backend dynamically calculates the `Total Kas Virtual` at any given time.
   `Total Kas Virtual = Sum(Sisa Saldo active ROs) + Sum(Sisa Saldo active Dana Operasional)` for the active fiscal year.
3. **Manual Input by Finance:** The Finance Officer (Juru Bayar) checks the physical Bank Statement for today, opens the "Rekonsiliasi" menu, selects the bank account, and inputs the physical balance (e.g., Rp 106.397.603.988).
4. **Auto-Matching & Alert:** The system compares the physical balance against the virtual balance.
   - If `Difference == 0`: Status is MATCHED 🟢
   - If `Difference != 0`: Status is UNMATCHED 🔴 (User must provide a note/reason, e.g., "Pajak belum disetor", "Bunga Bank", or "Kuitansi belum diinput").

### 2. Prisma Schema Integration

Please analyze our current Prisma schema and generate the new models required for this flow. We need at least two new models:

- **`MasterRekening` Model:**
  - `id` (Uuid)
  - `nama_bank` (String, e.g., Bank Mandiri)
  - `nomor_rekening` (String)
  - `nama_rekening` (String, e.g., RPL 019 OPS K)
  - `status_aktif` (Boolean/Enum)

- **`RekonsiliasiBank` Model (To keep history of daily/monthly checks):**
  - `id` (Uuid)
  - `rekening_id` (Uuid) -> relation to `MasterRekening`
  - `tanggal_rekonsiliasi` (Date)
  - `saldo_sistem` (Int/Float - the calculated virtual total)
  - `saldo_bank` (Int/Float - inputted by user)
  - `selisih` (Int/Float - auto calculated)
  - `status` (Enum: MATCHED, UNMATCHED)
  - `keterangan` (String, optional for notes if unmatched)
  - `diperiksa_oleh` (Uuid) -> relation to `User` table.

### 3. Backend & Frontend Implementation Tasks

Based on the flow above, please execute the following:

**A. Backend (NestJS):**

1. Generate the Prisma schema for `MasterRekening` and `RekonsiliasiBank`.
2. Create a service method `calculateTotalSaldoSistem(tahunFiscal: number)` that aggregates the running balances of all active `Ro` and `DanaOperasional` to represent the "Kas di Bendahara".
3. Create CRUD endpoints for `MasterRekening`.
4. Create the `POST /rekonsiliasi` endpoint that accepts `rekening_id`, `saldo_bank`, and `keterangan`, runs the system balance calculation, figures out the difference, and saves the `RekonsiliasiBank` record.

**B. Frontend (React):**

1. Create a `MasterRekeningPage.tsx` for Finance/Superadmin to manage bank accounts.
2. Create a `RekonsiliasiPage.tsx` that acts as the daily workspace for the Finance team.
   - Show a big card: **"Total Kas Virtual Sistem Saat Ini: Rp [Auto-fetched from API]"**.
   - Provide a form: Select Rekening, Input "Saldo Rekening Koran", and a visual indicator that automatically calculates and highlights the "Selisih" in real-time before submission.
   - Below the form, display a data table showing the history of past reconciliations (Tanggal, Rekening, Saldo Sistem, Saldo Bank, Selisih, Status).

Please output the Prisma schema additions first, followed by the core NestJS backend logic, and finally the React frontend structures.
