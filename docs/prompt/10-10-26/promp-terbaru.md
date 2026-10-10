Sangat wajar jika kamu bingung saat melihat UI modal itu, karena **AI developer-mu membuat pengisian form Rekonsiliasi yang belum lengkap logikanya!**

Pada gambar `image_05e0d1.png` yang kamu berikan, perhatikan bagian berikut:

1. **Total Kas Virtual Sistem: Rp 0** (Belum dihitung otomatis oleh sistem)
2. **Dropdown Rekening Fisik:** Kamu tidak tahu harus memilih apa, dan saat dipilih pun angka di sistemnya tetap 0.

Mari kita bedah secara lugas dan sederhana agar kamu tidak bingung lagi mengenai **Fase 3 & 4**, serta **bagaimana memperbaiki fitur Rekonsiliasi ini secara benar!**

---

### 1. Penjelasan Sederhana Fase 3: Rekonsiliasi Bank (Pemeriksaan Uang Fisik)

**Konsep Dasar:**
Aplikasi HRIS/Keuangan kita ini mencatat **Kas Virtual** (uang di atas kertas/buku kas sistem), yaitu gabungan dari sisa plafon seluruh RO + sisa saldo 5 Kamar Operasional.

Di dunia nyata, uang jutaan/milyaran itu disimpan di **Rekening Bank Fisik** (misal: Rekening Bank Mandiri `1010013141500` milik LEMIGAS).

**Mengapa butuh Rekonsiliasi?**
Setiap akhir bulan/minggu, Juru Bayar (Keuangan) harus mencocokkan:

> _"Apakah jumlah sisa uang di sistem kita SAMA PERSIS dengan jumlah uang riil di Rekening Koran Bank?"_

- Jika **SAMA (MATCHED)**: Aman! Berarti tidak ada kebocoran uang.
- Jika **BEDA (UNMATCHED)**: Bahaya! Berarti ada transaksi di bank yang belum dicatat di aplikasi (seperti biaya administrasi bank, bunga bank, atau ada kuitansi gaji yang lupa diinput Juru Bayar).

---

### 2. Penjelasan Sederhana Fase 4: Pergantian Tahun Fiskal (Tutup Buku & SILPA)

Setiap tanggal **31 Desember pukul 23:59**, tahun anggaran berakhir:

1. **Dompet Tahun 2026 Dikunci (Close Book):**

- Semua RO dan proyek 2026 yang selesai akan diubah statusnya menjadi `SELESAI`.
- Laporan keuangan 2026 diarsipkan dan tidak boleh diubah-ubah lagi.

2. **Buka Dompet Tahun 2027 (Reset & SILPA):**

- Ketika masuk tanggal **1 Januari 2027**, sistem membuka dompet baru untuk Tahun Fiscal 2027 dengan saldo awal **Rp 0**.
- Jika di akhir tahun 2026 masih ada **sisa saldo operasional yang belum terpakai**, uang sisa tersebut dinamakan **SILPA (Sisa Lebih Perhitungan Anggaran)**.
- Sisa uang 2026 itu dimasukkan ke dompet tahun 2027 sebagai transaksi **DEBIT (Saldo Awal Tahun 2027)** agar uangnya bisa dipakai kembali di tahun 2027.

---

### 3. Mengapa Fitur Rekonsiliasi di Aplikasi Kamu Masih Bikin Bingung? (Analisis Schema & UI)

Kalau kita lihat file `schema.prisma` yang kamu berikan:

1. Model `MasterRekening` sudah ada.
2. Di model `Ro` dan `DanaOperasional`, sudah ada kolom **`rekening_id`** (Relasi ke `MasterRekening`).

**TAPI, AI Developer-mu BELUM MENGHUBUNGKAN DANA KE REKENINGNYA!**

Akibatnya:

- Saat kamu memilih **"Rekening Fisik"** di modal popup, _backend_ tidak tahu dompet RO atau Dana Operasional mana saja yang uangnya disimpan di rekening tersebut.
- Makanya `Saldo Sistem` nilainya **selalu Rp 0**!

---

### 4. Solusi & Prompt untuk Memperbaiki Fitur Rekonsiliasi

Beri tahu AI developer-mu untuk memperbaiki 2 hal ini agar halaman Rekonsiliasi berjalan otomatis dan tidak bikin pusing:

1. **Setiap kali membuat/melihat RO atau Dana Operasional, harus ada pilihan "Rekening Bank Fisik".**
2. **Saat membuka Modal Rekonsiliasi:**

- Pengguna memilih **Rekening Fisik** (misal: _RPL 019 BLU LEMIGAS_).
- Backend secara **otomatis menghitung**:

$$\text{Saldo Sistem} = \sum \text{Sisa Saldo RO yang pake Rekening ini} + \sum \text{Sisa Saldo Kamar yang pake Rekening ini}$$

- Pengguna **HANYA PERLU MENGKETIK 1 ANGKA**: **`Saldo Rekening Koran`** (angka yang tertera di print-out bank / internet banking hari ini).
- Sistem langsung menghitung selisih secara otomatis!

---

### Prompt Siap Pakai untuk AI Developer

Salin _prompt_ di bawah ini dan berikan ke AI developer-mu:

```markdown
Please fix the Bank Reconciliation flow (`RekonsiliasiBank`). Currently, when opening the "Rekonsiliasi Baru" modal, the system balance is always Rp 0 because the backend is not calculating the dynamic virtual total associated with the selected `rekening_id`.

Please execute the following fixes across Backend and Frontend:

### 1. Backend Calculation Logic (`rekonsiliasi.service.ts`)

- Create an endpoint/service method: `getSaldoSistemByRekening(rekeningId: string, tahunFiscal: number)`
- **Calculation Logic:**
  1. Calculate `total_ro_balance` = Sum of running balance (`total_plafon - total_kredit`) for all `Ro` records where `rekening_id == selectedRekeningId` and `tahun_fiscal == tahunFiscal`.
  2. Calculate `total_dana_balance` = Sum of running balance (`total_plafon - total_kredit`) for all `DanaOperasional` records where `rekening_id == selectedRekeningId` and `tahun_fiscal == tahunFiscal`.
  3. `saldo_sistem` = `total_ro_balance + total_dana_balance`.
- Return this calculated `saldo_sistem` to the frontend.

### 2. Frontend Modal UX Update (`RekonsiliasiPage.tsx`)

- When the user opens "Rekonsiliasi Baru" and selects a `Rekening Fisik` from the dropdown:
  1. Trigger an API call to fetch `saldo_sistem` for that specific account and fiscal year.
  2. Display the fetched `Saldo Sistem` prominently in the modal (e.g., "Saldo Sistem: Rp 100.000.000").
  3. The user ONLY needs to type one input field: **`Saldo Rekening Koran`** (the physical balance from bank statement).
  4. Auto-calculate `Selisih = Saldo Rekening Koran - Saldo Sistem` in real-time as the user types.
  5. If `Selisih == 0`, set status badge to `MATCHED` 🟢.
  6. If `Selisih != 0`, set status badge to `UNMATCHED` 🔴 and show a required `Keterangan` text input (e.g., "Bunga bank / admin bank belum diinput").

Please provide the updated backend calculation service and the refactored React modal component.
```

Dengan mengeksekusi _prompt_ ini:

1. Kamu tidak akan bingung lagi saat mengisi form Rekonsiliasi.
2. Kamu tinggal memilih nama Rekening Bank, lalu mengetikkan angka Saldo Rekening Koran hari ini.
3. Sistem akan langsung memberi tahu apakah keuanganmu **seimbang (MATCHED)** atau **ada selisih (UNMATCHED)** secara otomatis!
