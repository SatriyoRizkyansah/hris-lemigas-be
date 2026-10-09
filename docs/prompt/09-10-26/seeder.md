I checked the application, and the 5 Margin wallets (Kamar) are not showing up in the UI dropdowns. The issue is that our database is still filled with generic dummy data. I need you to fix the seed data and expose an endpoint to trigger the fund distribution so I can see it working in the UI.

### 1. Update `prisma/seed.ts`

Remove the generic `DanaOperasional` seeding (where `kategori_kamar` is 'LAINNYA'). Instead, inject realistic dummy wallets for the 5 margin categories so they appear in the UI immediately.

- For `unitKor1` (assuming this acts as KP3 for testing), create two `DanaOperasional` records:
  1. `kategori_kamar: 'P2_KP3'`, total_plafon: 30000000
  2. `kategori_kamar: 'OPS_KP3'`, total_plafon: 2500000
- For `unitKor3` (Bagian Umum), create one record:
  1. `kategori_kamar: 'OPS_KANTOR'`, total_plafon: 17000000
- For `unitKor2` (Kepegawaian), create one record:
  1. `kategori_kamar: 'P1_PNS_NON_PNS'`, total_plafon: 48000000

### 2. Expose a Testing Endpoint

I see `FundDistributionService` was created, but I have no way to trigger it from the frontend yet.

- In `finance.controller.ts`, create a `POST /finance/distribusi-margin` endpoint.
- It should accept a body containing `tahun_fiscal` and `total_margin` (e.g., Rp 100.000.000).
- Inside the controller, define a static mapping for the coordinators to test the service (e.g., map P1_PNS_NON_PNS to unitKor2's ID, OPS_KANTOR to unitKor3's ID, etc.).
- Call `this.fundDistributionService.distributeMargin(...)` to automatically split the money and create the wallets.

After updating `seed.ts`, run `npx prisma db seed`.
