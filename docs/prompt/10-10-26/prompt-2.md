**Tidak harus langsung integrasi API Bank (Host-to-Host) di tahap awal.**

Di instansi pemerintah dan BLU (seperti LEMIGAS yang menggunakan rekening Himbara Mandiri/BNI), integrasi API _Host-to-Host_ (H2H) secara _real-time_ membutuhkan proses birokrasi, sertifikasi keamanan, legalitas _Memorandum of Understanding_ (MoU), dan biaya integrasi yang memakan waktu lama.

Oleh karena itu, dalam pengembangan sistem keuangan e-Budgeting/e-Finance, ada **3 tingkatan pendekatan (_approaches_)** yang biasa diterapkan. Untuk LEMIGAS, kita bisa memulai dari pendekatan yang paling praktis:

---

### Pendekatan 1: Semi-Manual Input Saldo (Paling Cepat & Sederhana)

**Cara Kerja di Aplikasi:**

1. Di database, kita buat tabel `master_rekening_bank` untuk menampung rekening fisik instansi (seperti di lembar Excel _"BAHAN RAPAT"_):

- `Rekening 1`: RPL 019 BLU LEMIGAS UNTUK OPS K. (Operasional Kantor & Gaji)
- `Rekening 2`: RPL 019 BLU LEMIGAS UNTUK OPS P. (Operasional Proyek)
- `Rekening 3`: RPL 019 BLU LEMIGAS UNTUK OPS P. (Valas)

2. Juru Bayar / Bendahara mengecek Internet Banking (_Corporate CMS Bank_) atau _print-out_ Rekening Koran harian.
3. Di menu **Rekonsiliasi Bank**, Juru Bayar memilih rekening (misal: _RPL 019 OPS K_) dan menginput **Saldo Rekening Koran Hari Ini** (misal: Rp 106.397.603.988).
4. System _backend_ NestJS secara otomatis menjumlahkan saldo pencatatan virtual (_Ledger_) yang dipetakan ke rekening tersebut:

$$\text{Total Saldo Virtual} = \sum \text{Sisa Saldo RO} + \sum \text{Sisa Saldo 5 Kamar}$$

5. Sistem membandingkan angka input Bendahara dengan angka kalkulasi _backend_:

- **Jika $\text{Selisih} = 0$:** Tampil indikator 🟢 **MATCH / SEIMBANG**.
- **Jika $\text{Selisih} \neq 0$:** Tampil indikator 🔴 **ALERT / UNMATCHED** (misal: _"Ada selisih Rp 211 Juta – Kemungkinan ada bunga deposito, biaya admin bank, atau kuitansi yang belum diinput di Ledger"_).

---

### Pendekatan 2: Upload File Statement CSV / Excel (Sangat Direkomendasikan untuk Phase 2)

**Cara Kerja di Aplikasi:**

1. Bendahara mengunduh (_download_) file mutasi transaksi bulanan/harian dari Internet Banking (Mandiri Cash Management / BNI Direct) berupa file `.csv` atau `.xlsx`.
2. Bendahara mengunggah (_upload_) file tersebut ke menu **Rekonsiliasi Bank**.
3. Sistem secara otomatis membaca baris demi baris mutasi bank dan mencocokkannya (_auto-matching_) dengan tabel `dana_transaksi` & `ro_transaksi` berdasarkan:

- Tanggal Transaksi
- Nominal (Debit / Kredit)
- Nomor Kuitansi / Referensi Transfer

4. Transaksi yang cocok akan otomatis diberi status **`[RECONCILED]`**, sedangkan transaksi yang ada di bank tapi belum ada di aplikasi (seperti biaya administrasi bank atau transfer masuk misterius) akan dimasukkan ke daftar **"Perlu Konfirmasi"**.

---

### Pendekatan 3: Direct Host-to-Host (H2H) API Integration (Tahap Lanjutan / Long-term)

**Cara Kerja di Aplikasi:**

1. Sistem HRIS/Keuangan terhubung secara otomatis via _Open Banking API / Webhook_ resmi milik Bank Mandiri atau BNI.
2. Setiap pukul 23:59 WIB, _Cron Job_ di _backend_ menarik saldo dan mutasi secara otomatis tanpa campur tangan manusia.
3. _Catatan:_ Pendekatan ini biasanya dijadikan target jangka panjang setelah aplikasi utama stabil dan disetujui oleh Bagian IT & Keuangan Kementerian.

---

### Kesimpulan & Rekomendasi

Untuk pengembangan saat ini, cukup gunakan **Pendekatan 1 (Semi-Manual Input)** atau **Pendekatan 2 (Upload File CSV/Excel Statement)**.

Konsep ini sudah sangat cukup untuk menyelesaikan masalah selisih kas harian seperti yang dicatat di lembar Excel LEMIGAS tanpa perlu pusing memikirkan integrasi API bank yang rumit di awal.
