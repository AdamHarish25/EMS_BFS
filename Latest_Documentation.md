# EMS BFS - Dokumentasi Pembaruan Terbaru

Dokumen ini mencatat pembaruan dan perubahan terbaru yang dilakukan pada sistem manajemen *Email Alert*, khususnya pada fitur **Pengaturan Durasi Alarm**.

## 1. Pembaruan UI/UX Frontend (`app/emails/page.tsx`)
Sebelumnya, durasi alarm akan secara otomatis tersimpan (*auto-save*) setiap kali pengguna mengubah angka di dalam *form* input. Kini, sistem telah diperbarui dengan alur penyimpanan manual:
- **Penghapusan Auto-Save**: Fungsi `handleDurationChange` sekarang hanya bertugas untuk mengubah *state* durasi di *frontend* tanpa melakukan panggilan *fetch* ke API.
- **Penambahan Tombol Simpan**: Tombol "Simpan Durasi" ditambahkan di bawah *form* input Interval Anti-Spam Email. 
- **Fungsi `handleSaveDuration`**: Dibuat fungsi baru yang dipicu oleh tombol simpan. Fungsi ini akan memanggil `POST /api/alarm-config` dan memunculkan *alert* konfirmasi jika berhasil atau gagal menyimpan, serta mengubah status tombol menjadi "Menyimpan..." saat proses berjalan.

## 2. Pembaruan Integrasi Database Backend (`app/api/alarm-config/route.ts`)
Pembaruan dilakukan untuk menyimpan data durasi alarm secara persisten menggunakan *database* PostgreSQL pada tabel `BFS_EMS_ALARM_Duration` di kolom `alarm_duration`.
- **GET Request**: Saat *endpoint* dipanggil (biasanya saat halaman pertama kali dimuat), API akan menjalankan kueri:
  `SELECT * FROM "BFS_EMS_ALARM_Duration" LIMIT 1`
  Jika data ditemukan, sistem akan menggunakan data tersebut.
- **POST Request**: Saat menerima data durasi baru dari *frontend*, API akan menjalankan logika berikut:
  1. Melakukan pengecekan ketersediaan baris data di tabel menggunakan kueri `SELECT * ... LIMIT 1`.
  2. **UPDATE (Replace)**: Jika data *row* sudah ada (`checkRes.rows.length > 0`), maka sistem akan menjalankan `UPDATE "BFS_EMS_ALARM_Duration" SET alarm_duration = $1` untuk menimpa durasi yang lama dengan yang baru.
  3. **INSERT**: Jika tabel masih sepenuhnya kosong (`checkRes.rows.length === 0`), barulah sistem akan menjalankan `INSERT INTO "BFS_EMS_ALARM_Duration" (alarm_duration) VALUES ($1)`.

Kedua proses di *backend* tersebut masih tetap akan menyinkronisasikan nilainya dengan memori sementara (`globalSettings.alarmDuration`) di `@/lib/store` agar sistem yang berjalan tetap ter-update tanpa harus melakukan kueri secara berulang-ulang dari *database*.

## 3. Peningkatan Sistem Jejak Audit (*Audit Trail*)
Sistem *Audit Trail* telah diperluas. Sebelumnya hanya mencatat riwayat navigasi (*Page View*), namun kini sistem sudah mendokumentasikan aksi CRUD (*Create, Read, Update, Delete*) dan pencetakan laporan ke dalam tabel `ems_audit_logs`. Karena saat ini belum ada sistem *login user*, log masih menggunakan identifier bawaan (seperti `System` atau email admin). 

Berikut adalah rute dan fungsi yang kini memiliki sistem validasi tipe *AuditModule* dan terekam di jejak audit:

- **Pengaturan Alarm (`app/api/alarm-config/route.ts`)**
  - **CREATE/UPDATE**: Tersimpan pada *module* `SETTINGS`. Mencatat perubahan atau penambahan durasi toleransi alarm baru.

- **Manajemen Email Penerima (`app/api/emails/route.ts` & `app/api/emails/[id]/route.ts`)**
  - **VIEW**: Tersimpan pada *module* `SETTINGS`. Terpicu ketika menarik daftar seluruh alamat email.
  - **CREATE**: Tersimpan pada *module* `SETTINGS`. Terpicu ketika menambahkan penerima email baru.
  - **DELETE**: Tersimpan pada *module* `SETTINGS`. Terpicu ketika sebuah email dihapus.

- **Manajemen Eksklusi/Fumigasi (`app/api/add-exclusion/route.ts` & `app/api/get-exclusions/route.ts`)**
  - **VIEW**: Tersimpan pada *module* `DATA_EXCLUSION`. Mencatat aktivitas melihat data eksklusi/fumigasi.
  - **CREATE**: Tersimpan pada *module* `DATA_EXCLUSION`. Mencatat pembuatan jadwal pengecualian data sensor beserta detail alasannya.

- **Pencetakan Laporan (`app/api/report-readings/route.ts`)**
  - **EXPORT**: Tersimpan pada *module* `REPORTING`. Mencatat aktivitas pembuatan dan penarikan data laporan spesifik untuk unit tertentu berdasarkan *range* waktu yang dipilih.
