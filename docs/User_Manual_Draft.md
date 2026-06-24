# Panduan Pengguna (User Manual) EMS BFS

**Versi Dokumen:** 1.0  
**Tanggal Rilis:** [Tanggal]  

---

## 01 Table of Contents
- [01 Table of Contents](#01-table-of-contents)
- [02 Pendahuluan](#02-pendahuluan)
- [03 Perkenalan Dashboard](#03-perkenalan-dashboard)
- [04 Fitur Utama & Cara Penggunaan](#04-fitur-utama--cara-penggunaan)
- [05 Pengaturan Email & Notifikasi](#05-pengaturan-email--notifikasi)
- [06 Penggunaan Reporting](#06-penggunaan-reporting)
- [07 Penggunaan Komentar pada Parameter TMS](#07-penggunaan-komentar-pada-parameter-tms)
- [08 Penggunaan Filtering tabel](#08-penggunaan-filtering-tabel)
- [09 Penutup](#09-penutup)

---

## 02 Pendahuluan

EMS (Environment Monitoring System) BFS adalah aplikasi berbasis web yang dirancang untuk memantau data sensor, mengatur notifikasi alarm saat terjadi anomali, dan menghasilkan laporan riwayat kondisi lingkungan. Aplikasi ini dirancang agar mudah digunakan dalam memonitor parameter penting pada fasilitas Anda.

**Persyaratan Sistem:**
- **Perangkat:** Komputer/Laptop atau Tablet.
- **Browser:** Disarankan menggunakan Google Chrome, Mozilla Firefox, atau Microsoft Edge versi terbaru.
- **Koneksi:** Membutuhkan koneksi internet atau jaringan intranet yang stabil.

---

## 03 Perkenalan Dashboard

Di halaman ini, Anda akan dikenalkan dengan antarmuka utama aplikasi setelah melakukan login.
*([Tambahkan Screenshot Dashboard di sini])*

- **Sidebar Menu (Kiri):** Digunakan untuk navigasi antar halaman utama.
- **Area Konten (Tengah):** Menampilkan grafik *real-time*, metrik sensor, atau tabel data.
- **Header/Topbar (Atas):** Menampilkan informasi pengguna dan status sistem.

---

## 04 Fitur Utama & Cara Penggunaan

Bagian ini mencakup instruksi pengoperasian dasar aplikasi:

**A. Memantau Sensor (Monitoring)**
- Grafik dan indikator angka pada halaman utama akan diperbarui secara otomatis.
- Anda dapat memilih parameter mana yang ingin disorot melalui panel navigasi.

**B. Manajemen Ruangan (Add Room)**
Fitur ini digunakan untuk mendaftarkan ruangan atau lokasi baru ke dalam sistem agar dapat dipantau sensornya.
1. Masuk ke menu **Manajemen Ruangan** (atau Room Management).
2. Klik tombol **Tambah Ruangan** (Add Room).
3. Isi formulir detail ruangan (Nama Ruangan & Deskripsi).
4. Klik **Simpan** untuk mendaftarkan ruangan tersebut.

**C. Manajemen Pengecualian Data (Data Exclusion / Fumigasi)**
Digunakan untuk menjeda alarm pada kondisi khusus seperti pemeliharaan/fumigasi.
1. Masuk ke menu **Data Exclusion**, lalu klik **Tambah Pengecualian**.
2. Tentukan waktu mulai, waktu selesai, dan alasan pengecualian.
3. Klik **Simpan**.

---

## 05 Pengaturan Email & Notifikasi

Aplikasi akan mengirimkan peringatan jika terjadi anomali pada parameter yang dipantau.

**A. Pengaturan Durasi Alarm & Anti-Spam**
Sistem memiliki mekanisme Anti-Spam agar email tidak dikirimkan terus-menerus.
1. Masuk ke menu **Pengaturan Alarm (Emails)**.
2. Pada bagian *Interval Anti-Spam Email*, ketikkan durasi (dalam hitungan menit).
3. Klik tombol **Simpan Durasi**.

**B. Manajemen Penerima Email**
- **Menambah Penerima:** Masukkan alamat email baru pada kolom yang tersedia dan klik **Tambah**.
- **Menghapus Penerima:** Klik ikon hapus (tempat sampah) di sebelah alamat email yang tidak lagi digunakan.

---

## 06 Penggunaan Reporting

Fitur Reporting memungkinkan Anda mengunduh riwayat performa sistem dan mencetaknya menjadi dokumen.
1. Masuk ke menu **Laporan / Report Readings**.
2. Pilih rentang waktu (*Date Range*) yang ingin diekspor.
3. Pilih lokasi atau unit spesifik.
4. Klik tombol **Export / Cetak PDF** (atau format lainnya yang tersedia) untuk mengunduh laporan.

---

## 07 Penggunaan Komentar pada Parameter TMS

Fitur ini memungkinkan pengguna untuk menambahkan catatan atau komentar pada log parameter sistem (TMS).
1. Buka tabel detail log pembacaan sensor/parameter.
2. Klik baris data yang ingin diberi catatan.
3. Ketik temuan, alasan anomali, atau tindakan yang telah diambil pada kolom **Komentar**.
4. Klik tombol **Simpan Komentar**. Catatan ini akan tersimpan dan dapat dilihat oleh admin atau teknisi lain saat proses audit.

---

## 08 Penggunaan Filtering tabel

Dashboard ini menyediakan berbagai tabel data (seperti tabel log audit, histori sensor, atau daftar ruangan). Anda dapat menyaring data spesifik menggunakan fitur *filtering*:
1. Perhatikan opsi *filter* (seperti *dropdown* atau pemilih tanggal) yang tersedia di atas tabel.
2. Anda bisa melakukan *filter* data berdasarkan opsi yang tersedia, contohnya:
   - **Tanggal/Waktu:** Memilih rentang waktu spesifik untuk melihat riwayat data pada periode tersebut.
   - **Status/Unit:** Memilih unit ruangan tertentu atau status kondisi tertentu jika disediakan pada halaman.
3. Tabel akan secara otomatis menyesuaikan data yang ditampilkan berdasarkan opsi *filter* yang Anda pilih.

---

## 09 Penutup

Terima kasih telah menggunakan sistem EMS BFS. Jika Anda membutuhkan bantuan lebih lanjut terkait teknis penggunaan aplikasi atau jika Anda menemui masalah sistem yang tidak dapat diselesaikan melalui panduan ini, Anda dapat merujuk ke administrator sistem perusahaan Anda atau menghubungi tim **Support IT**.

*Dokumen ini merupakan referensi resmi operasional aplikasi. Pastikan untuk selalu merujuk pada versi dokumen terbaru.*
