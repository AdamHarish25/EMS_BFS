# EMS_BFS — Dokumentasi Perubahan (Changelog)

Salin dari artifact: lihat ringkasan lengkap di bawah.

Untuk versi lengkap dengan diagram, lihat file CHANGELOG.md di folder docs.

## Perubahan Utama

### Sesi 1 — Stabilisasi Pipeline Exclusion
- Fix delete button Node-RED (payload format)
- Fix duplikasi dropdown ruangan (`.trim()` pada unit_id)
- Migrasi INSERT Fumigasi dari Node-RED → Next.js API `/api/add-exclusion`
- Highlight data excluded di DataTable (badge EXCLUDED + warna merah)
- Validasi pre-submit dipindah ke server-side (404 jika tidak ada data)

### Sesi 2 — Report, Performance & Security
- Fix data excluded tidak muncul di PDF (trim() pada unit_id matching)
- Fix kolom Temp/RH/DP kosong di Fumigasi (INSERT...SELECT dari Sensor)
- Fix deduplikasi Active Exclusions UI (grouping by time range)
- API baru `/api/report-readings` untuk fetch historis per tanggal
- Sistem "Fetch on Demand" di semua halaman (hapus polling/auto-fetch)
- Pagination DataTable 50 baris/halaman
- DB connection timeout (5 detik)
- Semua config sensitif pindah ke `.env.local`

### Sesi 3 — Dashboard Real-Time & Notifikasi Email
- UI Filter Tipe Data (Semua, Non-Fumigasi, Fumigasi) di Data Management
- Indikator Visual Waktu Fetch Terakhir di Header Dashboard
- Sistem Peringatan Node-RED (via SMTP Email) untuk Anomali TMS
- Pembaruan Branding Sidebar ("AHU Monitoring EMS BFS")

### Sesi 4 — Fitur Laporan Eksklusi Parameter & Perbaikan UI
- Opsi pengecualian parameter (Suhu, Kelembapan, Tekanan) untuk tabel & grafik laporan (dan Ekspor PDF).
- Penyeragaman dropdown "Pengecualian Data" agar hanya menampilkan root nama ruangan (tanpa parameter sub-ruangan).
- Perbaikan algoritma "Data Grouping" yang menggabungkan (merge) baris DP dan Temp/RH yang berdekatan waktunya (presisi menit) agar tidak muncul sebagai duplikat baris.
- Perbaikan kalkulasi pewarnaan gradien merah pada grafik (ReportChart) agar akurat merender warna merah hanya jika garis benar-benar menyentuh batas limit.
