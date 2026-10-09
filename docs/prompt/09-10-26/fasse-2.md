Please help me execute Phase 2 of the BLU Financial E-Wallet module in our NestJS backend. Now that the fund distribution (Phase 1) is complete, we need to secure the "Money Out" flow (Salary Allocations) and create the Ledger endpoints to view transaction histories with a running balance.

### 1. Update `AlokasiGajiTA` Transaction Logic

Modify the POST and PUT controllers/services for `AlokasiGajiTA` (e.g., `alokasi-gaji-post.controller.ts` and `alokasi-gaji-put.controller.ts`) to use a strict `prisma.$transaction`. When a salary allocation is created or updated to active, the system must automatically deduct the funds and log the expense.

- **Validation:**
  - If `sumber_dana === 'RO'`, check if the `Ro` has enough `total_plafon` (total_plafon >= jumlah).
  - If `sumber_dana === 'OPERASIONAL'`, check if the `DanaOperasional` has enough `total_plafon`.
  - Throw a `BadRequestException` if the balance is insufficient.
- **Transaction Execution (Create Allocation):**
  - Create the `AlokasiGajiTA` record.
  - If `sumber_dana === 'RO'`:
    - Decrement `total_plafon` in the `Ro` table by the `jumlah`.
    - Insert a record into `RoTransaksi` (debit: 0, kredit: jumlah, nama_kegiatan: "Pembayaran Gaji TA - [Pegawai Name]", tanggal: current date).
  - If `sumber_dana === 'OPERASIONAL'`:
    - Decrement `total_plafon` in the `DanaOperasional` table by the `jumlah`.
    - Insert a record into `DanaTransaksi` (debit: 0, kredit: jumlah, nama_kegiatan: "Pembayaran Gaji TA - [Pegawai Name]", tanggal: current date).
- **Transaction Execution (Cancel Allocation):**
  - If an allocation status is changed to `DIBATALKAN`, reverse the process: increment the `total_plafon` back and insert a new transaction record with (debit: jumlah, kredit: 0) to refund the wallet.

### 2. Create Ledger (Buku Kas) Endpoints

Create two new GET endpoints to fetch the transaction history (Ledger) for a specific RO and Dana Operasional. These endpoints will feed the dashboard UI.

- **Endpoint 1: `GET /master-ro/:id/ledger`**
  - Fetch all `RoTransaksi` for the given `ro_id`, ordered by `tanggal` ASC and `created_at` ASC.
  - Calculate the **running balance** for each row: `Running Balance = (Previous Balance) + Debit - Kredit`.
  - Return the list of transactions mapped with their respective running balance.
- **Endpoint 2: `GET /dana-operasional/:id/ledger`**
  - Fetch all `DanaTransaksi` for the given `dana_id`, ordered by `tanggal` ASC and `created_at` ASC.
  - Calculate the **running balance** exactly as above.
  - Return the mapped data.

Please provide:

1. The updated NestJS controller/service code for the `AlokasiGajiTA` POST/PUT operations implementing the transaction logic.
2. The code for the new Ledger endpoints (RO and Dana Operasional) demonstrating the running balance calculation.
