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



