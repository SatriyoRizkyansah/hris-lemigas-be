Please help me execute Phase 1 of the BLU Financial E-Wallet module refactoring in our NestJS backend. Our current goal is to modify the Prisma schema and create a background service that automatically distributes "Margin" funds into specific operational wallets (Kamar) for different coordinators based on predetermined percentages.

### 1. Prisma Schema Modification (`schema.prisma`)

We need to categorize the `DanaOperasional` model so the system knows exactly which specific margin bucket a wallet belongs to.

- **Add a new Enum:**
  ```prisma
  enum KategoriKamar {
    P1_PNS_NON_PNS     // 48% (For Kepegawaian/Umum)
    P2_KP3             // 30% (For KP3)
    OPS_KANTOR         // 17% (For Bagian Umum)
    OPS_KP3            // 2.5% (For KP3)
    MULOS_SPI          // 2.5% (For SPI)
    LAINNYA
  }
  ```
- **Update `DanaOperasional` Model:**
  - Add a new field: `kategori_kamar KategoriKamar @default(LAINNYA)`
  - Update the unique constraint to allow a single coordinator to hold multiple wallet categories in the same fiscal year. Change `@@unique([unit_koordinator_id, tahun_fiscal])` to `@@unique([unit_koordinator_id, tahun_fiscal, kategori_kamar])`.

### 2. Create `FundDistributionService` (NestJS)

Create a new service file (e.g., `src/common/services/fund-distribution.service.ts`). This service will handle incoming Margin funds and distribute them automatically to the respective coordinators' wallets using `prisma.$transaction`.

- **Create Method:** `distributeMargin(tahunFiscal: number, totalMargin: number, mappingKoordinatorId: Record<KategoriKamar, string>, dibuatOlehId: string)`
- **Logic within the method:**
  1.  Calculate the fund portions based on strict percentages (ensure to round to nearest integer to avoid float issues in currency):
      - `P1_PNS_NON_PNS` = 48% of `totalMargin`
      - `P2_KP3` = 30% of `totalMargin`
      - `OPS_KANTOR` = 17% of `totalMargin`
      - `OPS_KP3` = 2.5% of `totalMargin`
      - `MULOS_SPI` = 2.5% of `totalMargin`
  2.  Open a `prisma.$transaction`.
  3.  Iterate through these 5 calculated categories. For each category, perform an `upsert` on the `DanaOperasional` table:
      - `where`: use the composite key of `unit_koordinator_id`, `tahun_fiscal`, and `kategori_kamar`.
      - `update`: increment the `total_plafon` by the calculated portion.
      - `create`: create a new wallet record with `total_plafon` set to the calculated portion.
  4.  Immediately after each upsert within the same transaction loop, execute an `insert` into the `DanaTransaksi` table for that specific wallet:
      - `dana_id` = the ID of the upserted wallet.
      - `nama_kegiatan` = "Distribusi Margin Otomatis".
      - `debit` = the calculated portion.
      - `kredit` = 0.
      - `tanggal` = current date.

Please output:

1. The fully updated and clean `schema.prisma` code.
2. The complete, production-ready TypeScript code for `FundDistributionService` implementing the logic above.
