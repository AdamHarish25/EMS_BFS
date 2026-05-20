# EMS_BFS — Dokumentasi Perubahan (Changelog)
**Proyek:** Central AC Monitoring System  
**Database:** PostgreSQL `10.165.41.45:5432`  
**Stack:** Next.js (App Router), TypeScript, PostgreSQL (`pg` pool)

---

## Daftar Isi
1. [Sesi 1 — Stabilisasi Data Exclusion Pipeline](#sesi-1)
2. [Sesi 2 — Perbaikan Report, Performance & Security](#sesi-2)
3. [Sesi 3 — Dashboard Real-Time & Notifikasi Email](#sesi-3)
4. [Ringkasan File yang Dimodifikasi](#file-dimodifikasi)
5. [Struktur ENV](#env)
6. [Arsitektur Data Flow](#arsitektur)

---

## Sesi 1 — Stabilisasi Data Exclusion Pipeline

### 1.1 — Tombol Delete Exclusion Tidak Berfungsi

**Masalah:**  
Tombol hapus (ikon sampah) di daftar Active Exclusions tidak merespons klik.

**Akar Masalah:**  
Query SQL di Node-RED menggunakan `{{payload.id}}` (Mustache template) yang tidak terbaca karena payload dikirim sebagai `id` biasa, bukan nested object.

**Solusi:**  
Menyesuaikan payload yang dikirim ke Node-RED agar sesuai dengan template SQL yang ada.

---

### 1.2 — Duplikasi Ruangan di Dropdown

**Masalah:**  
Dropdown pemilihan ruangan di halaman Report dan Data Management menampilkan entry duplikat untuk ruangan yang sama (misal: `"Dispensing 1"` dan `"Dispensing 1 "` muncul dua kali).

**Akar Masalah:**  
Nilai `unit_id` di database menyimpan spasi tersembunyi di akhir string (*trailing whitespace*). Saat dibandingkan, `"Dispensing 1"` !== `"Dispensing 1 "` sehingga dianggap dua ruangan berbeda.

**Solusi:**  
Menambahkan `.trim()` di setiap pemetaan `unit_id` pada semua komponen yang menghasilkan daftar unik ruangan.

**File yang diubah:**
- `app/page.tsx` — `uniqueRooms` useMemo
- `components/reports/ReportGenerator.tsx` — `uniqueRooms` useMemo
- `components/data/ExclusionForm.tsx` — filter ruangan

---

### 1.3 — Migrasi INSERT dari Node-RED ke Next.js API

**Masalah:**  
Proses `POST` untuk menambahkan data Fumigasi (Exclusion) melalui Node-RED menyebabkan browser *stuck/hang* selama 5 menit. Hal ini terjadi karena tidak ada node *Catch* di Node-RED, sehingga jika query gagal, Next.js tidak mendapat balasan dan menunggu hingga *timeout*.

**Solusi:**  
Memindahkan logika `INSERT` sepenuhnya ke API internal Next.js.

**File baru: `app/api/add-exclusion/route.ts`**

Alur baru:
```
Browser → POST /api/add-exclusion (Next.js) → INSERT INTO BFS_EMS_Fumigasi
```
Node-RED tidak lagi dilibatkan untuk operasi tulis Fumigasi.

**File yang diubah:**
- `components/data/ExclusionForm.tsx` — target URL diubah dari Node-RED ke `/api/add-exclusion`

---

### 1.4 — Highlight Data Excluded di Tabel

**Masalah:**  
Tabel Raw Sensor Telemetry tidak menunjukkan mana data yang sedang di-exclude.

**Solusi:**  
Memperbarui `DataTable` agar mengecek setiap baris sensor apakah timestamp-nya masuk dalam rentang waktu Fumigasi. Jika ya → baris diberi latar belakang merah muda + badge **EXCLUDED**.

**File yang diubah:**
- `components/data/DataTable.tsx`

---

### 1.5 — Validasi Pre-Submission

**Masalah:**  
User bisa submit form Exclusion meskipun tidak ada data sensor pada rentang waktu yang dipilih, menghasilkan rekaman Fumigasi tanpa data sensor.

**Solusi:**  
Validasi dipindahkan ke *server-side* — API mengembalikan 404 jika `rowCount === 0` setelah SELECT.

**File yang diubah:**
- `app/api/add-exclusion/route.ts`

---

## Sesi 2 — Perbaikan Report, Performance & Security

### 2.1 — Data Excluded Tidak Muncul di PDF Report

**Masalah:**  
Tabel "Excluded Sensor Readings (Fumigasi)" tidak muncul di PDF. Jumlah Fumigasi/Excluded selalu 0.

**Akar Masalah:**  
Logika pemisahan `validReadings` vs `excludedReadings` menggunakan perbandingan `unit_id` tanpa `.trim()`.

**Solusi:**
```typescript
// Sebelum
if (exc.unit_id !== r.unit_id) continue;

// Sesudah
if ((exc.unit_id || '').trim() !== (r.unit_id || '').trim()) continue;
```

**File yang diubah:**
- `components/reports/ReportGenerator.tsx`

---

### 2.2 — Kolom Temp/RH/DP Tidak Masuk ke Tabel Fumigasi

**Masalah:**  
Data di tabel `BFS_EMS_Fumigasi` tidak menyimpan nilai suhu, kelembapan, dan tekanan dari sensor. Kolom numerik di PDF menampilkan `--`.

**Akar Masalah:**  
API `/api/add-exclusion` sebelumnya hanya menyimpan metadata (waktu, alasan, unit_id).

**Solusi:**  
Query diubah menjadi `INSERT ... SELECT` yang menyalin nilai sensor langsung:

```sql
INSERT INTO public."BFS_EMS_Fumigasi" 
  (reading_id, timestamp_start, timestamp_end, reason, excluded_by, 
   unit_id, temperature, relative_humidity, differential_pressure, ...)
SELECT 
  id, $1::timestamp, $2::timestamp, $3::text, $4::text,
  unit_id, temperature, relative_humidity, differential_pressure, ...
FROM public."BFS_EMS_Sensor"
WHERE unit_id = $5 
  AND "timestamp" >= EXTRACT(EPOCH FROM $1::timestamp AT TIME ZONE 'Asia/Jakarta')
  AND "timestamp" <= EXTRACT(EPOCH FROM $2::timestamp AT TIME ZONE 'Asia/Jakarta')
```

> **Catatan Penting:** Kolom `timestamp` di `BFS_EMS_Sensor` disimpan sebagai **Unix Epoch Seconds** (tipe `real`), bukan tipe `timestamp`. Perbandingan menggunakan `EXTRACT(EPOCH FROM ...)` tanpa mengalikan 1000.

**File yang diubah:**
- `app/api/add-exclusion/route.ts`

---

### 2.3 — Deduplikasi Tampilan Active Exclusions

**Masalah:**  
Satu periode Fumigasi menghasilkan banyak baris di `BFS_EMS_Fumigasi` (satu per data sensor), sehingga daftar Active Exclusions menampilkan puluhan kartu untuk satu event.

**Solusi:**  
Mengelompokkan list berdasarkan `unit_id + timestamp_start + timestamp_end`. Satu event = satu kartu. Saat dihapus, semua baris dalam group dihapus sekaligus.

**File yang diubah:**
- `components/data/ExclusionList.tsx` — grouping dengan `reduce`
- `app/data-management/page.tsx` — `handleDeleteExclusion` iterasi array IDs

---

### 2.4 — API Report: Fetch Data Per Rentang Tanggal

**Masalah:**  
Halaman Report mengambil data dari `sensor-readings` yang dibatasi LIMIT 2000, sehingga filter tanggal tidak bekerja untuk data historis.

**Solusi:**  
Membuat API khusus untuk Report yang support filter tanggal.

**File baru: `app/api/report-readings/route.ts`**
```typescript
// POST /api/report-readings
// Body: { unit_id, start_date, end_date }
// Mengambil data sensor sesuai filter tanpa batas jumlah baris
```

**File yang diubah:**
- `components/reports/ReportGenerator.tsx` — fetch dari `/api/report-readings`

---

### 2.5 — Sistem "Fetch on Demand" (Manual Tarik Data)

**Masalah:**  
Mengubah filter tanggal di Report Generator langsung memicu auto-fetch yang bisa menarik ratusan ribu baris → browser hang.

**Solusi:**  
Mengganti auto-fetch (`useEffect` dengan dependency) menjadi **manual fetch via tombol**:
- Hapus `useEffect` yang auto-fetch
- Tambah tombol **"🔍 Tarik Data"**
- Toast error jika filter belum lengkap (wajib isi Start + End Date)

**File yang diubah:**
- `components/reports/ReportGenerator.tsx`

---

### 2.6 — Sistem Filter-First di Semua Halaman

**Masalah:**  
Halaman Dashboard dan Data Management menggunakan polling otomatis setiap 5 detik yang membebani database dan menyebabkan lag.

**Solusi:**  
Menerapkan pola **"Filter Dulu, Tampilkan Data"** di semua halaman:

| Halaman | Sebelum | Sesudah |
|---|---|---|
| Dashboard | Auto-fetch + polling 5 detik | Filter → klik **Tampilkan Data** |
| Data Management | Auto-fetch + polling 5 detik | Filter → klik **Tampilkan Data** |
| Reports | Auto-fetch saat filter berubah | Filter → klik **Tarik Data** |

Semua halaman kini tidak ada loading saat pertama dibuka, tidak ada polling/interval.

**File yang diubah:**
- `app/page.tsx` — sepenuhnya ditulis ulang
- `app/data-management/page.tsx` — sepenuhnya ditulis ulang
- `components/reports/ReportGenerator.tsx`

---

### 2.7 — Pagination DataTable

**Masalah:**  
Tabel Raw Sensor Telemetry me-render semua baris (bisa 2000+) sekaligus ke DOM.

**Solusi:**  
Client-side pagination dengan **50 baris per halaman**. Browser hanya membuat 50 elemen DOM per saat.

**File yang diubah:**
- `components/data/DataTable.tsx`

---

### 2.8 — DB Connection Timeout

**Masalah:**  
Pool koneksi database tidak memiliki batas waktu sehingga jika DB tidak bisa dijangkau, Next.js hang tanpa batas.

**Solusi:**
```typescript
const pool = new Pool({
  connectionTimeoutMillis: 5000,  // gagal dalam 5 detik jika DB tidak bisa dijangkau
  idleTimeoutMillis: 30000,       // tutup koneksi idle setelah 30 detik
  max: 10,                        // maksimal 10 koneksi paralel
});
```

**File yang diubah:**
- `lib/db.ts`

---

### 2.9 — Migrasi Konfigurasi ke Environment Variables

**Masalah:**  
Semua nilai sensitif (IP database, password, URL Node-RED) tersimpan hardcoded di source code.

**Solusi:**  
Memindahkan seluruh konfigurasi ke `.env.local` (sudah masuk `.gitignore`).

**File baru: `.env.local`**
```env
# Database
DB_HOST=10.165.41.45
DB_PORT=5432
DB_NAME=production
DB_USER=appuser
DB_PASSWORD=appuser

# Node-RED
NEXT_PUBLIC_NODE_RED_URL=http://10.165.40.13:1880
```

> **Konvensi Next.js:**
> - `DB_*` → hanya bisa diakses di server (API routes). Aman untuk password.
> - `NEXT_PUBLIC_*` → bisa diakses di browser. Gunakan hanya untuk URL non-sensitif.

**File yang diubah:**
- `lib/db.ts` — semua kredensial → `process.env.DB_*`
- `app/data-management/page.tsx` — URL Node-RED → `process.env.NEXT_PUBLIC_NODE_RED_URL`
- `components/data/ExclusionForm.tsx` — URL Node-RED → `process.env.NEXT_PUBLIC_NODE_RED_URL`

---

## Sesi 3 — Dashboard Real-Time & Notifikasi Email

### 3.1 — Indikator Visual Data TMS / Fumigasi
**Masalah:** User kesulitan membedakan mana data yang valid dan mana yang sedang di-exclude (Fumigasi / TMS) pada tabel manajemen data.
**Solusi:** 
- Menambahkan filter dropdown "Tipe Data" (Semua Data, Non-Fumigasi, Fumigasi) di `Data Management`. 
- Menambahkan UI Badge "TMS Only" dan "Semua Status" pada `ExclusionList` untuk mempermudah visualisasi list pengecualian.

**File yang diubah:**
- `app/data-management/page.tsx`
- `components/data/DataTable.tsx`
- `components/data/ExclusionList.tsx`

---

### 3.2 — Indikator Waktu Fetch Real-Time
**Masalah:** Dashboard tidak menampilkan kapan terakhir kali data berhasil ditarik secara real-time.
**Solusi:** Menambahkan tracking `lastFetchTime` di dalam *polling* dashboard (6 menit sekali), dan menampilkannya langsung di *subtitle header* "(Data ditampilkan terakhir pada pukul ...)".

**File yang diubah:**
- `app/page.tsx`
- `contexts/LanguageContext.tsx`

---

### 3.3 — Sistem Notifikasi Email (Node-RED & Next.js)
**Masalah:** Tidak ada peringatan otomatis ketika parameter suhu, kelembapan, atau tekanan melanggar batas yang ditentukan (kriteria TMS).
**Solusi:** 
- Mengimplementasikan *flow* peringatan di **Node-RED** yang melakukan *polling* ke PostgreSQL (mengambil data 6 menit terakhir).
- Membuat *Function node* JavaScript yang mengevaluasi anomali dan menyusun payload email khusus untuk *node* `node-red-contrib-nodemailer-adapter`.
- Menggunakan *App Password* Gmail untuk otentikasi SMTP yang aman.
- (*Backup*) Menginstal `nodemailer` dan `@types/nodemailer` di proyek Next.js untuk berjaga-jaga jika ingin beralih menggunakan `/api/send-alert/route.ts`.

---

### 3.4 — Pembaruan Branding Sidebar
**Solusi:** Mengubah *header* Sidebar dari "AC Monitor" menjadi "AHU Monitoring EMS BFS" agar terlihat lebih representatif dan profesional.

**File yang diubah:**
- `components/layout/Sidebar.tsx`

---

## Ringkasan File yang Dimodifikasi

| File | Jenis Perubahan |
|---|---|
| `app/page.tsx` | Ditulis ulang: hapus polling, filter-first + tombol fetch |
| `app/data-management/page.tsx` | Ditulis ulang: hapus polling, filter-first + tombol fetch |
| `app/api/add-exclusion/route.ts` | **Baru**: INSERT...SELECT dari Sensor ke Fumigasi dengan nilai sensor |
| `app/api/report-readings/route.ts` | **Baru**: API fetch sensor dengan filter ruangan + tanggal |
| `app/api/sensor-readings/route.ts` | Kembalikan ke LIMIT 2000 (untuk live view) |
| `components/data/DataTable.tsx` | Tambah pagination 50 baris/halaman + isExcluded dengan trim() |
| `components/data/ExclusionForm.tsx` | Pindah target API ke Next.js, hapus validasi client-side, pakai ENV |
| `components/data/ExclusionList.tsx` | Grouping event Fumigasi, onDelete terima array IDs |
| `components/reports/ReportGenerator.tsx` | Fetch manual, perbaikan trim(), import sonner, guard chart |
| `lib/db.ts` | Gunakan process.env, tambah timeout & pool config |
| `.env.local` | **Baru**: seluruh konfigurasi sensitif |

---

## Arsitektur Data Flow (Kondisi Sekarang)

```
┌──────────────────────────────────────────────────────────────┐
│                         BROWSER                              │
│                                                              │
│  Dashboard / Data Management / Reports                       │
│  → User isi filter (Ruangan + Tanggal)                       │
│  → Klik "Tampilkan Data" / "Tarik Data"                      │
└─────────────────────────┬────────────────────────────────────┘
                          │ HTTP Request (satu kali per klik)
┌─────────────────────────▼────────────────────────────────────┐
│                    NEXT.JS API ROUTES                         │
│                                                              │
│  GET  /api/sensor-readings   → LIMIT 2000 (live fallback)    │
│  POST /api/report-readings   → Filter by date + unit_id      │
│  GET  /api/get-exclusions    → Semua data BFS_EMS_Fumigasi   │
│  POST /api/add-exclusion     → INSERT...SELECT ke Fumigasi   │
└─────────────────────────┬────────────────────────────────────┘
                          │ pg Pool (max 10 conn, timeout 5s)
┌─────────────────────────▼────────────────────────────────────┐
│               PostgreSQL 10.165.41.45:5432                    │
│                                                              │
│  BFS_EMS_Sensor    → Data sensor real-time (epoch seconds)   │
│  BFS_EMS_Fumigasi  → Data exclusion + copy nilai sensor      │
└──────────────────────────────────────────────────────────────┘

Node-RED (10.165.40.13:1880)
→ Digunakan HANYA untuk: DELETE exclusion (Mustache SQL template)
→ TIDAK lagi digunakan untuk: INSERT (sudah pindah ke Next.js API)
```

---

*Dokumentasi ini dibuat otomatis — terakhir diperbarui: 20 Mei 2026*
