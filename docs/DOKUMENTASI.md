# Dokumentasi Sistem EMS BFS — Central AC Monitoring Dashboard

> **Versi Dokumen:** 1.0  
> **Terakhir Diperbarui:** 2026-05-12  
> **Author:** Tim Pengembangan EMS BFS

---

## Daftar Isi

1. [Gambaran Umum Proyek](#1-gambaran-umum-proyek)
2. [Tech Stack](#2-tech-stack)
3. [Arsitektur Sistem](#3-arsitektur-sistem)
4. [Struktur File Proyek](#4-struktur-file-proyek)
5. [Database](#5-database)
6. [API Routes (Next.js Internal)](#6-api-routes-nextjs-internal)
7. [Halaman & Komponen UI](#7-halaman--komponen-ui)
8. [Cara Menjalankan Lokal](#8-cara-menjalankan-lokal)
9. [Cara Deploy ke Jaringan LAN](#9-cara-deploy-ke-jaringan-lan)
10. [Cara Deploy ke Internet (Cloudflare Tunnel)](#10-cara-deploy-ke-internet-cloudflare-tunnel)
11. [Fitur Data Exclusion](#11-fitur-data-exclusion)
12. [Konfigurasi Database (`lib/db.ts`)](#12-konfigurasi-database-libdbts)
13. [Keterbatasan & Catatan Penting](#13-keterbatasan--catatan-penting)
14. [Riwayat Perubahan Arsitektur](#14-riwayat-perubahan-arsitektur)

---

## 1. Gambaran Umum Proyek

**EMS BFS Dashboard** adalah sistem monitoring Central AC berbasis web yang dirancang untuk memantau kondisi lingkungan ruangan secara real-time di fasilitas produksi/industri.

**Parameter yang dipantau:**
- 🌡️ **Temperature** (°C) — Batas normal: ≤ 24°C
- 💧 **Relative Humidity / RH** (%) — Batas normal: ≤ 59%
- 🌬️ **Differential Pressure / DP** (Pa) — Batas normal: > 21 Pa

**Fitur Utama:**
- Dashboard real-time dengan grafik live sensor
- Sistem pemilihan ruangan wajib sebelum melihat data
- Manajemen data exclusion (fumigasi/pengecualian)
- Laporan PDF per ruangan dengan filter tanggal
- Koneksi langsung ke database PostgreSQL

---

## 2. Tech Stack

| Komponen | Teknologi | Versi |
|----------|-----------|-------|
| Framework Frontend | Next.js | 16.2.6 |
| UI Language | TypeScript + TSX | 5.x |
| Styling | Tailwind CSS | 3.4.1 |
| Charting | Recharts | 2.12.7 |
| Database Driver | node-postgres (`pg`) | 8.20.0 |
| PDF Export | jsPDF + html2canvas | 2.5.1 / 1.4.1 |
| Notification | Sonner (Toast) | 1.4.41 |
| Date Utilities | date-fns | 3.6.0 |
| Icons | Lucide React | 0.378.0 |

---

## 3. Arsitektur Sistem

```
┌─────────────────────────────────────────────────┐
│           PC Pengguna / Browser                 │
│                                                 │
│   ┌─────────────────────────────────────────┐   │
│   │     Next.js App (localhost:3000)        │   │
│   │                                         │   │
│   │  ┌──────────┐ ┌──────────┐ ┌────────┐  │   │
│   │  │Dashboard │ │  Data    │ │Reports │  │   │
│   │  │ /        │ │ Mgmt     │ │        │  │   │
│   │  │          │ │/data-..  │ │/reports│  │   │
│   │  └──────────┘ └──────────┘ └────────┘  │   │
│   │           ↕ Internal API calls          │   │
│   │  ┌──────────────────────────────────┐  │   │
│   │  │      Next.js API Routes          │  │   │
│   │  │  /api/sensor-readings  (GET)     │  │   │
│   │  │  /api/get-exclusions   (GET)     │  │   │
│   │  │  /api/exclusions       (POST)    │  │   │
│   │  └──────────────────────────────────┘  │   │
│   │              ↕ pg driver                │   │
│   └─────────────────────────────────────────┘   │
│                   ↕ TCP:5432                     │
└─────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────┐
│         PC Server (IP: 10.165.41.45)            │
│                                                 │
│   ┌─────────────────────────────────────────┐   │
│   │       PostgreSQL Database               │   │
│   │       Database: production              │   │
│   │                                         │   │
│   │  ┌─────────────────┐                    │   │
│   │  │ BFS_EMS_Sensor  │ ← Data real-time   │   │
│   │  │ (Sensor utama)  │   dari sensor AC   │   │
│   │  └─────────────────┘                    │   │
│   │                                         │   │
│   │  ┌─────────────────┐                    │   │
│   │  │ BFS_EMS_Fumigasi│ ← Marker rentang   │   │
│   │  │ (Exclusion log) │   waktu fumigasi   │   │
│   │  └─────────────────┘                    │   │
│   └─────────────────────────────────────────┘   │
│                                                 │
│   ┌─────────────────────────────────────────┐   │
│   │  Node-RED (Port: 1880) — SENSOR INGEST  │   │
│   │  Menerima data dari sensor fisik dan    │   │
│   │  menyimpannya ke BFS_EMS_Sensor         │   │
│   └─────────────────────────────────────────┘   │
└─────────────────────────────────────────────────┘
```

> **Catatan:** Node-RED hanya digunakan untuk ingest data dari sensor ke database. **Dashboard Next.js tidak lagi bergantung pada Node-RED** untuk menampilkan data — semua baca/tulis dilakukan langsung via API Routes ke PostgreSQL.

---

## 4. Struktur File Proyek

```
EMS_BFS/
│
├── app/                         # Next.js App Router
│   ├── layout.tsx               # Root layout + Sonner Toaster
│   ├── page.tsx                 # 📊 Halaman Dashboard Utama
│   ├── providers.tsx            # Client-side providers
│   ├── globals.css              # Global CSS
│   │
│   ├── data-management/
│   │   └── page.tsx             # 🗂️ Halaman Data Management & Exclusion
│   │
│   ├── reports/
│   │   └── page.tsx             # 📄 Halaman Reports (fetch data untuk generator)
│   │
│   └── api/                     # Next.js API Routes (server-side)
│       ├── sensor-readings/
│       │   └── route.ts         # GET: Baca dari BFS_EMS_Sensor
│       ├── get-exclusions/
│       │   └── route.ts         # GET: Baca dari BFS_EMS_Fumigasi
│       └── exclusions/
│           └── route.ts         # POST: Insert marker exclusion ke BFS_EMS_Fumigasi
│
├── components/                  # React Components
│   ├── dashboard/
│   │   ├── LiveChart.tsx        # Grafik real-time (Recharts)
│   │   ├── MetricCard.tsx       # Kartu metrik Temp/RH/DP
│   │   ├── RecentReadings.tsx   # Tabel histori sensor
│   │   └── AddReadingForm.tsx   # (Legacy, tidak dipakai aktif)
│   │
│   ├── data/
│   │   ├── ExclusionForm.tsx    # Form input exclusion baru
│   │   ├── ExclusionList.tsx    # List daftar exclusion aktif
│   │   └── DataTable.tsx        # Tabel raw sensor telemetry
│   │
│   ├── reports/
│   │   ├── ReportGenerator.tsx  # Filter, preview, export PDF
│   │   └── ReportChart.tsx      # Grafik untuk laporan
│   │
│   └── layout/
│       └── Sidebar.tsx          # Navigasi sidebar kiri
│
├── lib/
│   └── db.ts                    # ⚙️ Koneksi PostgreSQL (Pool)
│
├── docs/
│   ├── API_ENDPOINTS.md         # Daftar semua endpoint lama (Node-RED)
│   └── DOKUMENTASI.md           # ← File ini
│
├── next.config.mjs              # Konfigurasi Next.js
├── package.json                 # Dependencies & scripts
├── tailwind.config.ts           # Konfigurasi Tailwind CSS
└── tsconfig.json                # Konfigurasi TypeScript
```

---

## 5. Database

### Koneksi

| Parameter | Nilai |
|-----------|-------|
| **Host** | `10.165.41.45` |
| **Port** | `5432` |
| **Database** | `production` |
| **User** | `appuser` |
| **Password** | `appuser` *(ganti di `lib/db.ts`)* |

### Permission DB

> ⚠️ **PENTING:** User database hanya memiliki izin **SELECT** dan **INSERT**.
> Operasi **DELETE** dan **UPDATE** tidak diperbolehkan dari aplikasi ini.

### Tabel: `public."BFS_EMS_Sensor"`

Tabel utama data sensor real-time. Data diisi oleh Node-RED dari sensor fisik.

| Kolom | Tipe | Deskripsi |
|-------|------|-----------|
| `id` | serial / uuid | Primary key (auto-generate) |
| `unit_id` | varchar | ID Ruangan (contoh: `"Mixing"`, `"Dispensing 1"`) |
| `timestamp` | bigint | Unix timestamp (detik atau milidetik) |
| `temperature` | float | Suhu dalam °C |
| `relative_humidity` | float | Kelembaban relatif dalam % |
| `differential_pressure` | float | Tekanan diferensial dalam Pa |
| `status` | varchar | `normal`, `warning`, atau `critical` |
| `created_date` | date | Tanggal pencatatan |
| `created_by` | varchar | Sumber pencatatan |

**Query yang digunakan:**
```sql
SELECT id, unit_id, timestamp, temperature, relative_humidity,
       differential_pressure, status, created_date, created_by
FROM public."BFS_EMS_Sensor"
ORDER BY timestamp DESC
LIMIT 2000
```

### Tabel: `public."BFS_EMS_Fumigasi"`

Tabel log pengecualian data (fumigasi). Berisi **marker rentang waktu** yang menandai bahwa data pada periode tersebut dikecualikan dari analisis normal.

| Kolom | Tipe | Deskripsi |
|-------|------|-----------|
| `id` | serial | Primary key (auto-generate, **jangan di-insert manual**) |
| `reading_id` | varchar | Opsional: ID referensi |
| `unit_id` | varchar | ID Ruangan (null = semua ruangan) |
| `timestamp_start` | timestamptz | Awal periode exclusion |
| `timestamp_end` | timestamptz | Akhir periode exclusion |
| `reason` | varchar | Alasan pengecualian (contoh: `"Fumigasi"`) |
| `excluded_by` | varchar | Email/nama yang mengajukan exclusion |
| `created_date` | timestamptz | Waktu pencatatan exclusion |
| `created_by` | varchar | Sama dengan `excluded_by` |

**Query INSERT yang digunakan:**
```sql
INSERT INTO public."BFS_EMS_Fumigasi" (
  unit_id, timestamp_start, timestamp_end,
  reason, excluded_by, created_date, created_by
) VALUES ($1, $2, $3, $4, $5, NOW(), $6)
```

---

## 6. API Routes (Next.js Internal)

Semua API berjalan di server Next.js (same-origin), sehingga **tidak ada masalah CORS**.

### `GET /api/sensor-readings`

Mengambil data dari tabel `BFS_EMS_Sensor`.

- **File:** `app/api/sensor-readings/route.ts`
- **Response:** Array JSON berisi max 2000 row terbaru

```json
[
  {
    "id": 12345,
    "unit_id": "Mixing",
    "timestamp": "1715500000",
    "temperature": 22.5,
    "relative_humidity": 45.2,
    "differential_pressure": 35.0,
    "status": "normal"
  }
]
```

---

### `GET /api/get-exclusions`

Mengambil semua data exclusion dari tabel `BFS_EMS_Fumigasi`.

- **File:** `app/api/get-exclusions/route.ts`
- **Response:** Array JSON semua exclusion marker

```json
[
  {
    "unit_id": "Mixing",
    "timestamp_start": "2026-05-10T08:00:00+07:00",
    "timestamp_end": "2026-05-10T12:00:00+07:00",
    "reason": "Fumigasi rutin",
    "excluded_by": "admin@bfs.co.id",
    "created_date": "2026-05-10T08:05:00+07:00"
  }
]
```

---

### `POST /api/exclusions`

Membuat exclusion baru — menyimpan marker rentang waktu ke `BFS_EMS_Fumigasi`.

- **File:** `app/api/exclusions/route.ts`
- **Body:**

```json
{
  "unit_id": "Mixing",
  "timestamp_start": "2026-05-10T08:00:00+07:00",
  "timestamp_end": "2026-05-10T12:00:00+07:00",
  "reason": "Fumigasi rutin",
  "excluded_by": "admin@bfs.co.id"
}
```

- **Response sukses:**

```json
{
  "success": true,
  "message": "Rentang waktu berhasil dicatat sebagai data eksklusif.",
  "data": { ... }
}
```

> ⚠️ **Catatan:** API ini **tidak memindahkan atau menghapus** data dari `BFS_EMS_Sensor`. Data sensor tetap tersimpan di tabelnya. Exclusion hanya berfungsi sebagai **penanda** bahwa data pada rentang waktu tersebut tidak boleh diikutkan dalam analisis.

---

## 7. Halaman & Komponen UI

### Dashboard (`/`)

**File:** `app/page.tsx`

- Menampilkan 3 MetricCard: Temperature, Relative Humidity, Differential Pressure
- Grafik live real-time (polling setiap 5 detik)
- Tabel histori pembacaan sensor terbaru
- **Wajib pilih ruangan terlebih dahulu** — semua widget akan kosong sebelum ruangan dipilih

**Logika filter:**
- Data gabungan dari `BFS_EMS_Sensor` + `BFS_EMS_Fumigasi` dipakai untuk membangun daftar ruangan
- Setelah ruangan dipilih, data difilter berdasarkan `unit_id`

**State management:**
```
readings[]      ← dari /api/sensor-readings
exclusions[]    ← dari /api/get-exclusions
allData[]       ← readings + exclusions (digabung, untuk daftar ruangan)
filteredReadings[] ← allData difilter by selectedRoom
```

---

### Data Management (`/data-management`)

**File:** `app/data-management/page.tsx`

**Sub-komponen:**
- `ExclusionForm` — Form untuk menambah exclusion baru
- `ExclusionList` — Menampilkan daftar exclusion yang sudah ada
- `DataTable` — Menampilkan raw sensor telemetry

**Alur ExclusionForm:**
1. Pengguna pilih ruangan, tanggal/waktu mulai, tanggal/waktu selesai, dan alasan
2. Form submit → `POST /api/exclusions`
3. Data marker tersimpan ke `BFS_EMS_Fumigasi`
4. List exclusion di-refresh otomatis

---

### Reports (`/reports`)

**File:** `app/reports/page.tsx` + `components/reports/ReportGenerator.tsx`

**Fitur:**
- Filter berdasarkan Ruangan (wajib pilih)
- Filter berdasarkan rentang tanggal
- Filter berdasarkan tipe data: Semua Data / Fumigasi / Non-Fumigasi
- Preview grafik sebelum export
- Export ke PDF menggunakan jsPDF + html2canvas
- Tabel statistik Min/Max Temp, RH, DP

**Cara kerja filter exclusion di chart:**
Data dari sensor yang timestampnya jatuh di dalam rentang `timestamp_start` – `timestamp_end` di exclusion list akan ditandai sebagai `excluded` dan ditampilkan dengan warna berbeda di grafik.

---

## 8. Cara Menjalankan Lokal

### Prasyarat

- Node.js ≥ 18
- Akses ke PostgreSQL di `10.165.41.45:5432`

### Langkah-langkah

```bash
# 1. Clone atau masuk ke direktori proyek
cd /home/adam2/Documents/CodeProj/EMS_BFS

# 2. Install dependencies
npm install

# 3. Buat file konfigurasi database (WAJIB)
# Edit file lib/db.ts dan isi dengan credentials yang benar

# 4. Jalankan development server
npm run dev

# 5. Buka di browser
# http://localhost:3000
```

### Konfigurasi Database (`lib/db.ts`)

```typescript
import { Pool } from 'pg';

const pool = new Pool({
  user: 'appuser',        // ← username PostgreSQL
  host: '10.165.41.45',  // ← IP server database
  database: 'production', // ← nama database
  password: 'appuser',    // ← password (ganti dengan yang asli)
  port: 5432,
});

export const query = (text: string, params?: any[]) => pool.query(text, params);
export default pool;
```

---

## 9. Cara Deploy ke Jaringan LAN

Agar bisa diakses dari komputer lain di jaringan yang sama:

```bash
# Jalankan dengan binding ke semua interface
npm run dev
# (package.json sudah dikonfigurasi: "next dev -H 0.0.0.0")
```

Aplikasi akan tersedia di:
- `http://localhost:3000` (dari PC sendiri)
- `http://192.168.x.x:3000` (dari PC lain di jaringan yang sama)

> **Catatan:** IP komputer server Next.js harus dapat dijangkau oleh komputer yang membuka browser. Pastikan firewall mengizinkan port 3000.

---

## 10. Cara Deploy ke Internet (Cloudflare Tunnel)

Jika ingin aplikasi bisa diakses dari luar jaringan kantor:

### Prasyarat
- Akun Cloudflare (gratis)
- Domain yang dikelola oleh Cloudflare
- `cloudflared` terinstall di PC Server

### Langkah Setup Cloudflare Tunnel

```bash
# Di PC Server (tempat Next.js berjalan):

# 1. Install cloudflared
wget https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64.deb
sudo dpkg -i cloudflared-linux-amd64.deb

# 2. Login ke Cloudflare
cloudflared tunnel login

# 3. Buat tunnel
cloudflared tunnel create ems-dashboard

# 4. Arahkan ke port Next.js
cloudflared tunnel route dns ems-dashboard app.namadomain.com

# 5. Jalankan sebagai service
sudo cloudflared service install
sudo systemctl start cloudflared
```

Setelah aktif, buka `https://app.namadomain.com` dari mana saja.

---

## 11. Fitur Data Exclusion

### Konsep

Data exclusion adalah mekanisme untuk menandai rentang waktu tertentu sebagai **"tidak valid"** atau **"dikecualikan"** dari analisis normal. Contoh use case: selama proses fumigasi, data suhu dan kelembaban ruangan tidak mencerminkan kondisi operasional normal.

### Cara Kerja

```
Sebelum (SALAH — butuh DELETE permission):
  BFS_EMS_Sensor → [DELETE data] → BFS_EMS_Fumigasi [INSERT data]

Sekarang (BENAR — hanya perlu INSERT + SELECT):
  BFS_EMS_Fumigasi ← [INSERT marker rentang waktu saja]
  BFS_EMS_Sensor   ← tidak disentuh sama sekali
```

### Dampak Exclusion pada Tampilan

| Halaman | Efek Exclusion |
|---------|---------------|
| **Dashboard** | Data dalam rentang exclusion ikut tampil di grafik (tidak difilter) |
| **Reports** | Data dipisahkan: yang dalam rentang exclusion ditandai warna merah di grafik, bisa filter "Fumigasi" atau "Non-Fumigasi" |

### Field Wajib Form Exclusion

| Field | Deskripsi |
|-------|-----------|
| Unit ID | Ruangan yang dikecualikan |
| Start Date + Time | Awal periode exclusion |
| End Date + Time | Akhir periode exclusion |
| Reason | Alasan (contoh: "Fumigasi", "Kalibrasi Sensor") |

---

## 12. Konfigurasi Database (`lib/db.ts`)

File `lib/db.ts` adalah satu-satunya tempat konfigurasi koneksi database. Semua API Routes mengimport dari file ini.

```typescript
// lib/db.ts
import { Pool } from 'pg';

const pool = new Pool({
  user: 'appuser',
  host: '10.165.41.45',
  database: 'production',
  password: 'appuser',
  port: 5432,
});

export const query = (text: string, params?: any[]) => pool.query(text, params);
export default pool;
```

> ⚠️ **Jangan commit file ini ke GitHub** jika berisi password production.  
> Alternatif: gunakan environment variable di `.env.local`:
> ```bash
> DATABASE_URL=postgresql://appuser:appuser@10.165.41.45:5432/production
> ```

---

## 13. Keterbatasan & Catatan Penting

### Permission Database
- Hanya **SELECT** dan **INSERT** yang diizinkan
- Tidak bisa **DELETE** atau **UPDATE** data apapun
- Konsekuensi: exclusion yang sudah dibuat **tidak bisa dihapus** via aplikasi

### Mixed Content (HTTP vs HTTPS)
- Jika aplikasi di-deploy ke HTTPS (misal Netlify), dan database diakses via `http://`, browser akan memblokir request
- Solusi: pastikan Next.js dan database berada dalam jaringan yang sama, atau gunakan Cloudflare Tunnel dengan HTTPS

### Data Sensor Real-Time
- Polling dilakukan setiap **5 detik**
- Data terbatas **2000 row** terbaru dari `BFS_EMS_Sensor`
- Untuk data historis lebih jauh, gunakan filter tanggal di halaman Reports

### Pilih Ruangan Dulu
- Dashboard dan Reports **tidak menampilkan data** sebelum ruangan dipilih
- Ini adalah desain yang disengaja untuk mencegah agregasi data antar-ruangan yang tidak akurat

---

## 14. Riwayat Perubahan Arsitektur

| Tanggal | Perubahan |
|---------|-----------|
| Awal proyek | Dashboard menggunakan Base44 + mock data lokal |
| Sesi 1 | Integrasi Node-RED sebagai backend API (`http://10.165.40.127:1880`) |
| Sesi 2 | Penambahan fitur Data Exclusion via Node-RED |
| Sesi 3 | Optimasi grafik: nonaktifkan animasi, hapus dot markers |
| Sesi 3 | Implementasi "Pilih Ruangan" — tidak ada default "All Rooms" |
| Sesi 4 | Migrasi dari Node-RED ke **koneksi langsung PostgreSQL** via Next.js API Routes |
| Sesi 4 | Perubahan logika exclusion: dari DELETE+INSERT menjadi INSERT-only marker |
| Sesi 4 | Penyatuan sumber data: dropdown ruangan dibaca dari BFS_EMS_Sensor + BFS_EMS_Fumigasi |

---

*Dokumen ini dibuat secara otomatis berdasarkan kode aktual proyek EMS BFS.*
