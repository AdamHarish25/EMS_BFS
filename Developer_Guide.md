# EMS BFS - Developer Guidebook

Buku panduan ini dirancang untuk memudahkan developer baru dalam memahami arsitektur, teknologi, dan alur kerja (workflow) dari proyek EMS BFS (Environmental Monitoring System).

---

## 1. Arsitektur & Teknologi

Sistem ini dibangun di atas fondasi teknologi modern berbasis Javascript/Typescript.

- **Framework Utama**: Next.js 14+ (Menggunakan *App Router* paradigm di dalam direktori `app/`).
- **Bahasa Pemrograman**: TypeScript (Meminimalisir bug dengan pengetikan statis).
- **Styling**: Tailwind CSS (Utilitas CSS *utility-first* untuk *styling* cepat dan responsif).
- **Database**: PostgreSQL (Relational Database) dikelola tanpa ORM berukuran besar, melainkan menggunakan kueri SQL mentah via library `pg` untuk performa maksimal.
- **Visualisasi Data**: `recharts` (Digunakan untuk me-render grafik *real-time* di Dashboard).
- **State Management**: React Hooks standar (`useState`, `useEffect`, `useContext`, dan `useMemo`) dengan bantuan `Zustand` (opsional jika dibutuhkan untuk *global state*).
- **Icons**: `lucide-react`.
- **Notifikasi/Toasts**: `sonner` (Digunakan untuk *feedback* aksi berhasil/gagal di UI).

---

## 2. Struktur Direktori Utama

Memahami struktur direktori akan mempercepat proses *debugging* dan penambahan fitur.

```text
EMS_BFS/
├── app/                  # (App Router Next.js) Berisi halaman (pages) dan API endpoints.
│   ├── api/              # Semua endpoint backend/REST API (Server-side).
│   ├── dashboard/        # Contoh folder halaman.
│   ├── data-management/  # Halaman untuk manajemen entitas (Ruangan, dll).
│   ├── layout.tsx        # Global Layout aplikasi.
│   └── page.tsx          # Halaman Utama (Main Dashboard) yang berisi grafik real-time.
├── components/           # Komponen UI React yang dapat digunakan ulang (Re-usable).
│   ├── data/             # Komponen spesifik untuk pengolahan tabel atau form.
│   └── reports/          # Komponen untuk bagian reporting dan grafik (MetricChart).
├── contexts/             # Context Providers (misal: LanguageContext untuk multi-bahasa).
├── lib/                  # Fungsi *utility* dan konfigurasi.
│   ├── db.ts             # Koneksi inti ke PostgreSQL menggunakan Pool (pg).
│   └── audit-logger.ts   # Fungsi pencatat jejak audit (Audit Trail).
├── public/               # File statis seperti gambar, logo, favicon.
└── docs/ & root          # File dokumentasi seperti CHANGELOG.md, Latest_Documentation.md.
```

---

## 3. Alur Kerja Inti (Core Workflows)

### 3.1. Pengambilan Data Real-Time (Polling)
- Dashboard Utama (`app/page.tsx`) tidak menggunakan WebSockets. Sistem mengambil data secara berkala (*polling*) menggunakan `useEffect` yang menjalankan `setInterval`.
- **Alur**: `Frontend (app/page.tsx)` -> `GET /api/latest-reading?unit_id=...` -> Mengembalikan data sensor terkini -> Di-render ke dalam kartu dan grafik.

### 3.2. Manajemen Database (Kueri Langsung)
Sistem tidak menggunakan Prisma atau TypeORM. Setiap interaksi ke database dilakukan dengan kueri SQL di dalam folder `app/api/`.
- **Contoh Koneksi**: `import pool from '@/lib/db';`
- **Aturan Transaksi**: Gunakan `await client.query('BEGIN')` dan `COMMIT` / `ROLLBACK` jika sebuah API memodifikasi lebih dari satu baris atau tabel yang krusial.

### 3.3. Mekanisme ID Sensor & Pencegahan Konflik (Unique Constraints)
Setiap parameter ruangan terikat ke dalam tabel `BFS_EMS_Room` dan memilik `external_log_id` yang bersifat **UNIK**.
- **Logika Re-assign (Replace)**: Apabila *user* mengubah ID Sensor ke ID yang sudah dipakai, sistem **tidak menghapus (DELETE)** ruangan lama. Sistem hanya akan memperbarui baris lama dengan nilai negatif `-(timestamp + id)` untuk memutuskan hubungan sensornya (sebagai arsip), lalu memberikan ID tersebut ke baris/ruangan yang baru.

### 3.4. Sistem Jejak Audit (Audit Trail)
Setiap aktivitas manipulasi data (CRUD) harus direkam. 
- Jika Anda membuat API baru (misal `POST`, `PUT`, `DELETE`), panggil fungsi `createAuditLog` dari `@/lib/audit-logger.ts` setelah kueri database `COMMIT` sukses.

---

## 4. Panduan Menambah Fitur Baru

1. **Membuat Halaman**: Tambahkan folder baru di `app/[nama-halaman]/page.tsx`.
2. **Membuat Endpoint API**: Tambahkan folder di `app/api/[nama-fitur]/route.ts`. 
3. **Standarisasi Respon API**: 
   - Selalu berikan struktur `{ success: boolean, message: string, data?: any }` untuk respon 200 OK.
   - Untuk error, selalu tangkap dengan `catch (err)` dan kembalikan `{ error: 'Pesan' }` beserta *status code* (contoh: 500/400).
4. **Keamanan (SQL Injection)**: Dilarang keras melakukan penyisipan variabel langsung ke dalam string SQL (*string interpolation*). Selalu gunakan parameter substitusi `$1, $2`, dsb.

---

## 5. Menjalankan Proyek di Lingkungan Lokal (Dev)

1. Pastikan Anda memiliki *file* `.env.local` di *root* direktori.
2. Atur kredensial database PostgreSQL:
   ```env
   DB_USER=...
   DB_HOST=...
   DB_NAME=...
   DB_PASSWORD=...
   DB_PORT=5432
   ```
3. Jalankan `npm install` jika ada penambahan dependensi baru.
4. Jalankan `npm run dev` untuk menjalankan *development server*.
5. (Opsional) Awasi proses agar tidak terjadi duplikasi servis *node* (misal dengan `killall node` jika port tersumbat).

---
*Dokumen ini merupakan panduan *living document*. Pastikan untuk selalu menambahkan penjelasan pada file `Latest_Documentation.md` setiap kali ada rilis arsitektur atau refactoring besar.*
