```python
import pandas as pd
file_path = "LAP HARIAN BLU PER 3 AGS 2026.xlsx"
try:
    xls = pd.ExcelFile(file_path)
    print("Sheet names:", xls.sheet_names)
except Exception as e:
    print(f"Error reading excel file: {e}")


```

```text
Sheet names: ['BAHAN RAPAT', 'PER DPM']


```

```python
import pandas as pd
file_path = "LAP HARIAN BLU PER 3 AGS 2026.xlsx"
try:
    df_rapat = pd.read_excel(file_path, sheet_name='BAHAN RAPAT', nrows=30)
    print(df_rapat.head(30))
except Exception as e:
    print(f"Error reading BAHAN RAPAT sheet: {e}")


```

```text
    Unnamed: 0                                                                       Unnamed: 1                                                                                                                                                       Unnamed: 2     Unnamed: 3                      Unnamed: 4      Unnamed: 5       Unnamed: 6    Unnamed: 7                                                                                     Unnamed: 8         Unnamed: 9   Unnamed: 10   Unnamed: 11       Unnamed: 12                     Unnamed: 13
0          NaN                     Monitoring Pengesahan Pendapatan dan Belanja  BLU Tahun 2026                                                                                                                                                              NaN            NaN                             NaN             NaN              NaN           NaN                                                                                            NaN                NaN           NaN           NaN  Menu belanja BLU                     (Pengadaan)
1          NaN          Berdasarkan Surat Perintah Pengesahan Pendapatan dan Belanja BLU (SP3B)                                                                                                                                                              NaN            NaN                             NaN             NaN              NaN           NaN                                                                                            NaN                NaN           NaN           NaN               NaN                             NaN
2          NaN                           Based on Penerimaan dan Belanja  | Satuan: Juta Rupiah                                                                                                                                                              NaN            NaN                             NaN             NaN              NaN           NaN                                                                                            NaN                NaN           NaN           NaN               NaN                             NaN
3          NaN                                                            Hari Senin 3 AGS 2026                                                                                                                                                              NaN  Pukul : 17.00                             NaN             NaN              NaN           NaN                                                                                            NaN                NaN           NaN           NaN               NaN                             NaN
4          NaN                                                                               No                                                                                                                                                           Uraian            NaN                      Saldo Awal  Penerimaan BLU              NaN           NaN                                                                                    Belanja BLU                NaN           NaN    Keterangan               NaN                             NaN
5          NaN                                                                              NaN                                                                                                                                                              NaN            NaN                             NaN  Data Bendahara  Pengesahan SP3B  Blm Disahkan                                                                                 Data Bendahara  Pengesahan   SP3B  Blm Disahkan           NaN               NaN                             NaN
6          NaN                                                                                1                                                                                                                                                                2            NaN                               3               4                5       6 (4-5)                                                                                              7                  8       9 (7-8)      10 (4-7)               NaN                             NaN
7          NaN                                                                                1                                                                                                                                      Penerimaan dan Belanja BLU             NaN                   104937.796752   197571.612154    163396.394116  34175.218038                                                                                  202187.829787      155155.477835  47032.351952  -4616.217633               NaN                             NaN
8          NaN                                                                              NaN                                                                                                                                                              NaN         Jumlah                   104937.796752   197571.612154    163396.394116  34175.218038                                                                                  202187.829787      155155.477835  47032.351952  -4616.217633               NaN                             NaN
9          NaN  Monitoring  Saldo BLU Berdasarkan Rekening Koran dan Saldo Kas Tunai tahun 2026                                                                                                                                                              NaN            NaN                             NaN             NaN              NaN           NaN                                                                                            NaN                NaN           NaN           NaN               NaN                             NaN
10         NaN                                                                               No                                                                                                                                                           Uraian            NaN                  Nomor Rekening             NaN            Saldo           NaN                                                                     Saldo Rekening Dana Kelola                NaN           NaN           NaN               NaN                             NaN
11         NaN                                                                                1                                                                                                                                 RPL 019 BLU LEMIGAS UNTUK OPS K.            NaN                   1010013141500             NaN       2778043702           NaN                                                                   Nomor Rekening 1010069969960                NaN           NaN    1726878900               NaN                             NaN
12         NaN                                                                                2                                                                                                                                 RPL 019 BLU LEMIGAS UNTUK OPS P.            NaN                   1010002727772             NaN     106397603988           NaN  Keterangan :Yang Belum Teridentifikasi / belum dapat diakui sebagai Pendapatan Penerimaan BLU                NaN           NaN           NaN               NaN                             NaN
13         NaN                                                                                3                                                                                                                         RPL 019 BLU LEMIGAS UNTUK OPS P.(Vallas)            NaN                   1010012070882             NaN        134336160           NaN                                                                                            NaN                NaN           NaN           NaN               NaN                             NaN
14         NaN                                                                                4                                                                                                                                         Surat Berharga DEPOSITO             NaN             (…................)             NaN                0           NaN                                                                                            NaN                NaN           NaN           NaN               NaN                             NaN
15         NaN                                                                                5                                                                                                                                                        Kas Tunai            NaN                             NaN             NaN                0           NaN                                                                                            NaN                NaN           NaN           NaN               NaN                             NaN
16         NaN                                                                              NaN                                                                                                                                                              NaN            NaN        1.Jumlah Saldo (1 s/d 5)             NaN     109309983850           NaN                                                                       1.Saldo Kas BLU Saat ini                NaN           NaN  104726668442               NaN                             NaN
17         NaN                                                                              NaN                                                                                                                                                              NaN            NaN          2. Saldo Awal BLU 2026             NaN     104937796752           NaN                                                             2.Blokir Jaminan Bank Garansi (BG)                NaN           NaN    3206272335               NaN                             NaN
18         NaN                                                                              NaN                                                                                                                                                              NaN            NaN            3. Pajak blm disetor             NaN       4583315408           NaN                                                                              3.Surat Berharga                 NaN           NaN             0               NaN                             NaN
19         NaN                                                                              NaN                                                                                                                                                              NaN        Defisit  4. Saldo akhir Kas BLU (1-2-3)             NaN       -211128310           NaN                                                      Maksimal saldo yg dapat digunakan (1-2-3)                NaN           NaN  101520396107               NaN                             NaN
20         NaN                                                                              NaN  Catatan : Saldo Kas Defisit 211 Juta tetapi masih ada kewajiban kepada pihak ke 3 yang belum dibayar kurang lebih sekitar 21 M dokumen dalam proses persetujuan            NaN                             NaN             NaN              NaN           NaN                                                                                            NaN                NaN           NaN           NaN               NaN                             NaN
21         NaN                                                                              NaN                                                                                                                                                              NaN            NaN                             NaN             NaN              NaN           NaN                                                                                            NaN                NaN           NaN           NaN               NaN                             NaN
22         NaN                                                                              NaN                                                                                                                                                              NaN            NaN                             NaN             NaN              NaN           NaN                                                                                            NaN                NaN           NaN           NaN               NaN                             NaN
23         NaN                                                                              NaN                                                                                                                                                              NaN            NaN                             NaN             NaN              NaN           NaN                                                                                            NaN                NaN           NaN           NaN               NaN                             NaN
24         NaN                                                                              NaN                                                                                                                                                              NaN            NaN                             NaN             NaN              NaN           NaN                                                                                            NaN                NaN           NaN           NaN               NaN                             NaN
25         NaN          Rincian Pengawasan Penambahan Penerimaan dan Belanja BLU Harian Per DPM                                                                                                                                                              NaN            NaN                             NaN             NaN              NaN           NaN                                                                                            NaN                NaN           NaN           NaN               NaN                             NaN
26         NaN                                                                       Tahun 2026                                                                                                                                                              NaN            NaN                             NaN             NaN              NaN           NaN                                                                                            NaN                NaN           NaN           NaN               NaN                             NaN
27         NaN                                           Based on Invoice | Satuan: Juta Rupiah                                                                                                                                                              NaN            NaN                             NaN             NaN              NaN           NaN                                                                                            NaN                NaN           NaN           NaN               NaN                             NaN
28         NaN                                                            Hari Senin 3 AGS 2026                                                                                                                                                              NaN  Pukul : 17.00                             NaN             NaN              NaN           NaN                                                                                            NaN                NaN           NaN           NaN               NaN                             NaN
29         NaN                                                                               No                                                                                                                                                           Uraian     Unit Kerja                Kinerja Invoice              NaN              NaN     Kas Masuk                                                                                            NaN                NaN       Belanja           NaN               NaN  Selisih Kinerja dengan Belanja


```

Berdasarkan file `LAP HARIAN BLU PER 3 AGS 2026.xlsx` yang kamu lampirkan, khususnya jika kita membedah sheet **"BAHAN RAPAT"**, terlihat jelas bahwa aplikasi kita saat ini baru menyelesaikan "Fase Perencanaan Anggaran & Distribusi Internal" (Proyek, RO, Margin).

Untuk menjadikan sistem keuangan HRIS LEMIGAS ini benar-benar _Enterprise_ dan siap pakai oleh Bagian Keuangan/Bendahara, ada **3 Modul Krusial** selanjutnya yang harus kita garap berdasarkan pelaporan di lembar "BAHAN RAPAT" tersebut:

---

### 1. Modul Invoicing & Penerimaan Termin Kas (Kas Masuk)

**Mengapa ini penting?**
Di sistem kita saat ini, begitu Proyek 1 Miliar diinput, margin 250 Juta langsung didistribusikan ke dompet 5 Kamar. Padahal di dunia nyata, **uang 1 Miliar itu belum tentu sudah diterima 100% oleh LEMIGAS di awal**. Pertamina/Klien biasanya membayar berdasarkan _Invoice_ (Termin 1, Termin 2, dsb) yang ditunjukkan pada baris "Kinerja Invoice" dan "Kas Masuk" di Excel.

**Flow Konsep (End-to-End):**

- **Buat Termin:** Di menu Detail Proyek, Keuangan membuat jadwal termin pembayaran (Misal: DP 30%, Termin I 40%, Pelunasan 30%).
- **Terbitkan Invoice:** Saat target tercapai, sistem menerbitkan _Invoice_ untuk ditagihkan ke klien.
- **Kas Masuk (Realisasi Pendapatan):** Saat klien mentransfer uang, Juru Bayar memverifikasi "Kas Masuk".
- **Sinkronisasi Distribusi Margin:** Injeksi saldo ke 5 Kamar Operasional tidak langsung diberikan 100% di awal. Margin diinjeksi secara proporsional sesuai dengan **kas yang sudah benar-benar masuk** (dibayarkan) oleh Klien.

---

### 2. Modul Rekonsiliasi Rekening Bank (RPL 019) & Kas Tunai

**Mengapa ini penting?**
Di Excel "BAHAN RAPAT", terlihat bahwa BLU LEMIGAS memonitor Saldo BLU secara fisik melalui rekening koran. Ada beberapa rekening nyata: _RPL 019 BLU LEMIGAS UNTUK OPS K., RPL 019 BLU LEMIGAS UNTUK OPS P., Rekening Vallas, dan Kas Tunai_. Dompet Dana Operasional yang kita buat sebelumnya hanyalah "Buku Catatan / Kas Virtual". Kita harus memastikan buku catatan ini cocok dengan uang fisik di Bank.

**Flow Konsep (End-to-End):**

- **Master Rekening Bank:** Tambahkan master data untuk rekening fisik (RPL 019 Bank Mandiri, BNI, dsb) di sistem.
- **Mapping Rekening vs Dompet:** Petakan dompet Dana Operasional ke Rekening Fisiknya (Misal: Kamar P1 dan Ops Kantor dananya ditaruh di Rekening _RPL 019 OPS K_).
- **Rekonsiliasi Harian/Bulanan:** Juru bayar menginput Saldo Rekening Koran hari ini. Sistem akan mencocokkan total saldo seluruh dompet virtual (Sisa Saldo Proyek + RO + 5 Kamar) dengan Saldo Rekening Bank fisik. Jika ada selisih, sistem akan memunculkan _alert_.
- **Manajemen Pajak & Blokir:** Sistem juga harus bisa mencatat _outstanding_ pajak yang belum disetor dan blokir Jaminan Bank Garansi (BG) seperti yang tertulis di laporan, agar uang tersebut tidak tidak sengaja terpakai untuk RO.

---

### 3. Modul SP3B (Surat Perintah Pengesahan Pendapatan dan Belanja)

**Mengapa ini penting?**
Ini adalah nyawa dari pelaporan instansi BLU ke Kementerian Keuangan (KPPN). Di lembar "BAHAN RAPAT", ada tabel _Monitoring Pengesahan Pendapatan dan Belanja BLU_ yang mencatat "Data Bendahara", "Pengesahan SP3B", dan "Belum Disahkan". Setiap rupiah yang masuk dan keluar di LEMIGAS harus disahkan oleh KPPN.

**Flow Konsep (End-to-End):**

- **Grouping Transaksi:** Sistem secara otomatis mengumpulkan seluruh `DanaTransaksi` (pengeluaran gaji TA, operasional) dan Kas Masuk (dari Invoice) dalam satu periode tertentu (misal: per bulan).
- **Generate Draft SP3B:** Sistem men-_generate_ format laporan SP3B untuk diajukan ke KPPN.
- **Status "Disahkan":** Setelah KPPN mengeluarkan persetujuan, Keuangan menandai laporan tersebut sebagai "Disahkan".
- **Dashboard SP3B:** Sistem menyediakan _dashboard monitoring_ (sama persis dengan Excel "BAHAN RAPAT" baris 7) yang menunjukkan secara _real-time_ berapa miliar pendapatan/belanja yang tercatat di Bendahara, berapa yang sudah disahkan KPPN, dan berapa yang berstatus "Belum Disahkan".

---

**Saran Langkah Selanjutnya:**
Jika Modul Proyek & RO saat ini sudah selesai kodingnya oleh AI, fitur yang **paling mendesak untuk digarap berikutnya adalah Modul Invoicing & Penerimaan Termin (Kas Masuk)**. Jika kita tidak mengendalikan Kas Masuk, dompet operasional (5 kamar) akan membengkak di aplikasi, padahal uang fisiknya dari Klien belum ditransfer!

Apakah kamu setuju untuk membahas lebih dalam mengenai alur **Invoicing/Kas Masuk** ini terlebih dahulu?
