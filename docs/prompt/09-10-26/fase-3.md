Please help me execute Phase 3 of the BLU Financial E-Wallet module for our React frontend. Now that the NestJS backend handles fund distribution, transaction logic, and role-based scoping, we need to implement Role-Based Access Control (RBAC) in the UI, filter the funding source dropdowns, and display the Ledger with running balances.

### 1. Role Mapping & UI Restricting (RBAC)

Implement a dynamic rendering logic based on the logged-in user's role and `unit_kerja_id`. We have `SUPER_ADMIN`, `KOORDINATOR`, and `KEUANGAN`.

- **Sidebar Navigation (`Sidebar.tsx`):**
  - Only `SUPER_ADMIN` can see and access global master data like "Master Proyek", "Master Unit Kerja", and "Master Pegawai (Global)".
  - `KOORDINATOR` should only see "Dashboard", "Pegawai (My Unit)", "SK (My Unit)", and "Alokasi Gaji (My Unit)".
  - `KEUANGAN` (Juru Bayar) should see "Dashboard Keuangan", "Daftar Tagihan Alokasi", and "Rekapitulasi BLU".
- Ensure that the global state (e.g., Zustand/Context or the auth hook) properly stores and exposes the `user.role.kode` and `user.unit_kerja_id`.

### 2. Form Filtering (Sumber Dana Dropdown)

Update the `AlokasiGajiPage` and `SkPage` forms where the user selects the "Sumber Dana" (Funding Source) for a TA's salary.

- Fetch the available funding sources (RO and Dana Operasional) dynamically from the backend.
- **Crucial Scope:** The API call must pass the user's `unit_kerja_id` so the backend only returns the wallets owned by this specific coordinator.
- The dropdown UI should group the options clearly:
  - **Group: Direct Cost (RO)** -> Lists ROs owned by the coordinator.
  - **Group: Margin Operasional** -> Lists the `DanaOperasional` categories (e.g., P2 KP3, Ops Kantor) owned by the coordinator.

### 3. Ledger (Buku Kas) UI Implementation

Fix the visual bug in the current Ledger display (e.g., in `RoDetailPage.tsx` or `DanaOperasionalPage.tsx`) where the remaining balance was calculated incorrectly.

- Fetch data from the newly created backend Ledger endpoints (`GET /master-ro/:id/ledger` and `GET /dana-operasional/:id/ledger`).
- Update the Data Table to display columns: `No`, `Tanggal`, `Nama Kegiatan`, `Debit`, `Kredit`, and `Saldo Berjalan (Running Balance)`.
- The `Saldo Berjalan` should rely directly on the calculated value returned from the backend endpoint, removing any buggy manual math (like double negative subtractions) from the frontend.
- In the summary cards at the top of the page, display the `Plafon Awal` (Total Plafon), `Total Pengeluaran` (Sum of Kredit), and `Sisa Saldo Akhir` (Final Running Balance) accurately.

Please provide:

1. The updated React code for `Sidebar.tsx` demonstrating the RBAC conditional rendering.
2. The
