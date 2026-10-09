Pertanyaan yang sangat tepat! Mari kita luruskan konsepnya berdasarkan aturan tata kelola keuangan instansi (terutama BLU LEMIGAS).

Tidak semua menu tersebut diakses penuh oleh Keuangan (Juru Bayar). Kita harus membedakan antara Hak Akses Penuh (CRUD - Create, Read, Update, Delete) dengan Hak Akses Monitoring/Verifikasi (Read-Only / Validasi).

Berikut adalah rincian porsi akses untuk masing-feira menu tersebut bagi role Keuangan:

http://localhost:8030/proyek & http://localhost:8030/ro

Apakah masuk ke Keuangan? Iya, tapi Read-Only (Monitoring).

Alasan: Tim Keuangan tidak membuat proyek atau menentukan Rencana Operasional (RO). Itu adalah ranah perencanaan dan koordinator. Namun, Keuangan wajib bisa melihat data Proyek dan RO beserta rincian plafonnya untuk memastikan bahwa uang yang akan dibayarkan tidak melebihi anggaran yang tersedia.

http://localhost:8030/dana-operasional

Apakah masuk ke Keuangan? Iya, dengan akses penuh (Monitoring Dompet & Saldo Kamar).

Alasan: Ini adalah "kamar-kamar" margin (P1, P2, Ops Kantor, dll.). Tim Keuangan harus bisa memantau sisa saldo di setiap dompet koordinator secara real-time sebelum menyetujui pencairan dana operasional atau insentif.

http://localhost:8030/alokasi-gaji & http://localhost:8030/alokasi-gaji/rekap

Apakah masuk ke Keuangan? Iya, ini adalah area kerja utamanya.

Alasan: Di sinilah tempat Juru Bayar/Keuangan memverifikasi daftar tagihan gaji Tenaga Ahli (TA) yang diajukan oleh Koordinator, mengecek ketersediaan saldo, lalu mengeksekusi pembayaran (yang otomatis memotong Ledger). Halaman rekap (/rekap) juga menjadi laporan utama keuangan untuk melihat total serapan anggaran bulanan.

Apa Saja Isi Menu di Sisi Keuangan?
Jika seseorang login sebagai Keuangan (Juru Bayar), sistem harus menyajikan dashboard dan menu yang berfokus pada pengendalian kas, verifikasi, dan pelaporan, bukan pada input data kepegawaian atau pembuatan proyek.

Berikut adalah rincian isi menu untuk role Keuangan:

Dashboard Keuangan (Financial Overview)

Grafik total penyerapan anggaran BLU secara keseluruhan.

Ringkasan total Plafon, Total Belanja/Kredit, dan Sisa Saldo instansi secara real-time.

Peringatan (Warning Alert) jika ada dompet koordinator atau RO yang saldonya hampir habis.

Monitoring Proyek & RO (/ro, /proyek)

Tampilan: Berupa tabel daftar proyek dan RO dengan status aktif/selesai.

Fungsi: Bagian Keuangan bisa mengeklik salah satu RO untuk melihat Ledger (Buku Kas) dan mengecek riwayat transaksi pengeluaran (apakah ada selisih atau kesalahan input dari unit lain).

Monitoring Dompet Operasional (/dana-operasional)

Tampilan: Kartu-kartu saldo untuk 5 "Kamar Margin" (P1 PNS, P2 KP3, Ops Kantor, Ops KP3, Mulos/SPI).

Fungsi: Memastikan distribusi margin dari proyek berjalan masuk ke dompet yang tepat, serta melihat sisa plafon per unit.

Verifikasi & Eksekusi Alokasi Gaji (/alokasi-gaji)

Tampilan: Daftar pengajuan alokasi gaji TA dari masing-masing Koordinator.

Fungsi: Tempat Juru Bayar meninjau pengajuan, memastikan saldo di RO/Operasional mencukupi, lalu menekan tombol "Proses Pembayaran" (yang memicu Prisma Transaction untuk mencatat pengeluaran di Ledger secara otomatis).

Rekapitulasi Anggaran & Laporan BLU (/alokasi-gaji/rekap)

Tampilan: Tabel rekap pengeluaran bulanan/tahunan (mirip dengan laporan sheet "BAHAN RAPAT" di Excel).

Fungsi: Digunakan oleh bagian Keuangan untuk mengunduh laporan atau menyocokkan data dengan Rekening Koran bank pusat LEMIGAS tanpa harus menghitung manual di Excel lagi.
