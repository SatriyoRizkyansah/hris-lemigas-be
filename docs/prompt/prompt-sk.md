Tolong bantu saya merefaktor `schema.prisma` dan service NestJS pada sistem HRIS ini. Berdasarkan evaluasi alur bisnis, terdapat redundansi data antara tabel `PenempatanPegawai` dan `Sk`. Di instansi pemerintahan, penempatan fisik adalah wujud dari dokumen SK, sehingga keduanya harus disatukan dan menjadikan `Sk` sebagai _Single Source of Truth_.

Pada skema saat ini, model `Sk` sudah memiliki atribut pendanaan (`gaji_bulanan`, `sumber_dana_default`, dll), namun tabel `PenempatanPegawai` masih belum dihapus.

Tolong lakukan langkah-langkah refactoring berikut:

### 1. Update `schema.prisma` (Pembersihan Redundansi)

- **Hapus total model `PenempatanPegawai`.**
- Hapus relasi `penempatan_list PenempatanPegawai[]` di dalam model `UnitKerja`.
- Hapus relasi `penempatan_list PenempatanPegawai[]` di dalam model `Pegawai`.
- **Tambahkan atribut penempatan ke model `Sk`:**
  - `is_homebase Boolean @default(true)` (Untuk membedakan tugas utama vs tugas tambahan/rangkap).
  - `keterangan String? @db.VarChar(255)`

### 2. Update DTO (`CreateSkDto`)

- Tambahkan _field_ `is_tugas_tambahan` bertipe `boolean` (opsional, default `false`) di DTO. _Field_ ini dari _frontend_ berfungsi sebagai penanda apakah SK baru ini adalah mutasi/perpanjangan, atau sekadar tugas tambahan (kasus TA memegang 2 proyek).

### 3. Update Logika Bisnis di Service NestJS (`Create SK`)

Ubah fungsi `createSk` di _service_ NestJS. Gunakan `prisma.$transaction` untuk menangani proses _insert_ SK berdasarkan _flag_ `is_tugas_tambahan`:

- **Jika `is_tugas_tambahan === false` (Skenario Mutasi / Perpanjangan):**
  1. Cari `Sk` milik `pegawai_id` tersebut yang `status_aktif == AKTIF` dan `is_homebase == true`.
  2. Jika ada, _update_ SK lama tersebut: ubah `status_aktif` menjadi `NONAKTIF` dan set `tanggal_selesai` menjadi H-1 dari `tanggal_efektif` SK yang baru dibuat.
  3. _Insert_ data SK baru dengan `status_aktif = AKTIF` dan `is_homebase = true`.

- **Jika `is_tugas_tambahan === true` (Skenario Tugas Tambahan):**
  1. Abaikan (jangan ubah) SK lama yang sedang aktif.
  2. Langsung _insert_ data SK baru dengan `status_aktif = AKTIF` dan `is_homebase = false`.

Tolong berikan output berupa:

1. Kode `schema.prisma` versi final yang sudah bersih dari entitas penempatan.
2. Contoh kode NestJS DTO (`CreateSkDto`).
3. Contoh kode NestJS Service (`createSk`) yang mengimplementasikan logika _Prisma Transaction_ di atas.
